import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

function ok(data: unknown): Response {
  return new Response(
    JSON.stringify({ code: "SUCCESS", message: "Success", data }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    }
  );
}

function fail(msg: string, code = 400): Response {
  return new Response(
    JSON.stringify({ code: "FAIL", message: msg }),
    {
      status: code,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    }
  );
}

async function createOrderFromSession(
  session: Stripe.Checkout.Session,
  buyerId: string
): Promise<{ orderId: string; orderNumber: string } | null> {
  try {
    console.log("Creating order from Stripe session:", session.id);
    
    // Parse items from metadata
    const itemsJson = session.metadata?.items;
    if (!itemsJson) {
      console.error("No items found in session metadata");
      return null;
    }

    const items: OrderItem[] = JSON.parse(itemsJson);
    console.log("Parsed items:", items);

    // Get buyer's cart to extract seller_id and delivery address
    const { data: cartItems, error: cartError } = await supabase
      .from("cart")
      .select("seller_id, product:products(seller_id)")
      .eq("buyer_id", buyerId)
      .limit(1);

    if (cartError || !cartItems || cartItems.length === 0) {
      console.error("Failed to fetch cart items:", cartError);
      return null;
    }

    const sellerId = cartItems[0]?.product?.seller_id || cartItems[0]?.seller_id;
    if (!sellerId) {
      console.error("No seller_id found in cart");
      return null;
    }

    // Get buyer's profile for delivery address
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("address")
      .eq("id", buyerId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch buyer profile:", profileError);
      return null;
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 0.05; // 5% tax
    const tax = subtotal * taxRate;
    const totalAmount = subtotal + tax;

    console.log("Order totals:", { subtotal, tax, totalAmount });

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        delivery_address: profile.address || "Address not provided",
        payment_type: "online_payment",
        payment_status: "paid",
        order_status: "confirmed",
        subtotal,
        tax,
        total_amount: totalAmount,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        customer_email: session.customer_details?.email,
        customer_name: session.customer_details?.name,
        completed_at: new Date().toISOString(),
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("Failed to create order:", orderError);
      return null;
    }

    console.log("Order created:", order.id);

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: null, // We don't have product IDs in metadata
      seller_id: sellerId,
      product_name: item.name,
      product_category: "General",
      price: item.price,
      unit: "unit",
      quantity: item.quantity,
      item_total: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Failed to create order items:", itemsError);
      // Order is created but items failed - still return order
    } else {
      console.log("Order items created successfully");
    }

    // Clear cart
    const { error: cartClearError } = await supabase
      .from("cart")
      .delete()
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId);

    if (cartClearError) {
      console.error("Failed to clear cart:", cartClearError);
    } else {
      console.log("Cart cleared successfully");
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
    };
  } catch (error) {
    console.error("Error creating order from session:", error);
    return null;
  }
}

async function getOrCreateOrder(
  sessionId: string,
  session: Stripe.Checkout.Session
): Promise<any> {
  // Check if order already exists
  const { data: existingOrder, error: fetchError } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      buyer_id,
      seller_id,
      delivery_address,
      payment_type,
      payment_status,
      order_status,
      subtotal,
      tax,
      total_amount,
      completed_at,
      created_at,
      order_items (
        id,
        product_name,
        product_category,
        price,
        unit,
        quantity,
        item_total
      )
    `)
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch order:", fetchError);
    throw new Error("Failed to fetch order");
  }

  if (existingOrder) {
    console.log("Order already exists:", existingOrder.id);
    
    // Update payment status if needed
    if (existingOrder.payment_status !== "paid") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          order_status: "confirmed",
          completed_at: new Date().toISOString(),
          customer_email: session.customer_details?.email,
          customer_name: session.customer_details?.name,
        })
        .eq("id", existingOrder.id);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      }
    }

    return existingOrder;
  }

  // Create new order
  console.log("Order does not exist, creating new order");
  const buyerId = session.metadata?.buyer_id;
  
  if (!buyerId) {
    console.error("No buyer_id in session metadata");
    throw new Error("No buyer_id in session metadata");
  }

  const orderResult = await createOrderFromSession(session, buyerId);
  
  if (!orderResult) {
    throw new Error("Failed to create order");
  }

  // Fetch the created order with items
  const { data: newOrder, error: newOrderError } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      buyer_id,
      seller_id,
      delivery_address,
      payment_type,
      payment_status,
      order_status,
      subtotal,
      tax,
      total_amount,
      completed_at,
      created_at,
      order_items (
        id,
        product_name,
        product_category,
        price,
        unit,
        quantity,
        item_total
      )
    `)
    .eq("id", orderResult.orderId)
    .single();

  if (newOrderError) {
    console.error("Failed to fetch created order:", newOrderError);
    throw new Error("Failed to fetch created order");
  }

  return newOrder;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    console.log("Processing payment verification request...");

    const { sessionId } = await req.json();
    if (!sessionId) {
      console.error("Missing session_id parameter");
      throw new Error("Missing session_id parameter");
    }

    console.log("Session ID:", sessionId);

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    console.log("Initializing Stripe...");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Retrieving Stripe session...");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("Session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
    });

    if (session.payment_status !== "paid") {
      console.log("Payment not completed, status:", session.payment_status);
      return ok({
        verified: false,
        status: session.payment_status,
        sessionId: session.id,
      });
    }

    console.log("Payment verified, getting or creating order...");
    const order = await getOrCreateOrder(sessionId, session);
    console.log("Order retrieved/created:", order.id);

    return ok({
      verified: true,
      status: "paid",
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        buyerId: order.buyer_id,
        sellerId: order.seller_id,
        deliveryAddress: order.delivery_address,
        paymentType: order.payment_type,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        subtotal: order.subtotal,
        tax: order.tax,
        totalAmount: order.total_amount,
        completedAt: order.completed_at,
        createdAt: order.created_at,
        items: order.order_items || [],
      },
    });
  } catch (error) {
    console.error("Payment verification failed:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return fail(error instanceof Error ? error.message : "Payment verification failed", 500);
  }
});
