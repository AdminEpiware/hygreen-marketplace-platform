import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const successUrlPath = '/payment-success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrlPath = '/cart';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CheckoutRequest {
  items: OrderItem[];
  currency?: string;
  payment_method_types?: string[];
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

function validateCheckoutRequest(request: CheckoutRequest): void {
  if (!request.items?.length) {
    throw new Error("Items cannot be empty");
  }
  for (const item of request.items) {
    if (!item.name || item.price <= 0 || item.quantity <= 0) {
      throw new Error("Invalid item information");
    }
  }
}

function processOrderItems(items: OrderItem[]) {
  const formattedItems = items.map(item => ({
    name: item.name.trim(),
    price: Math.round(item.price * 100),
    quantity: item.quantity,
    image_url: item.image_url?.trim() || "",
  }));
  const totalAmount = formattedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return { formattedItems, totalAmount };
}

async function createCheckoutSession(
  stripe: Stripe,
  userId: string | null,
  items: OrderItem[],
  currency: string,
  paymentMethods: string[],
  origin: string
) {
  const { formattedItems, totalAmount } = processOrderItems(items);

  // Don't create order here - it will be created after successful payment
  // Just create the Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    line_items: items.map(item => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url: `${origin}${successUrlPath}`,
    cancel_url: `${origin}${cancelUrlPath}`,
    payment_method_types: paymentMethods,
    metadata: {
      buyer_id: userId || "",
      items: JSON.stringify(formattedItems),
    },
  });

  return { session };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      console.error("Invalid method:", req.method);
      return new Response("Method not allowed", { status: 405 });
    }

    console.log("Processing Stripe checkout request...");
    
    const request = await req.json();
    console.log("Request payload:", JSON.stringify(request, null, 2));
    
    validateCheckoutRequest(request);
    console.log("Request validation passed");

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };

    console.log("User ID:", user?.id || "anonymous");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    console.log("Initializing Stripe...");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "";
    console.log("Creating checkout session...");
    
    const { session } = await createCheckoutSession(
      stripe,
      user?.id || null,
      request.items,
      request.currency || 'usd',
      request.payment_method_types || ['card'],
      origin
    );

    console.log("Checkout session created:", session.id);

    return ok({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return fail(error instanceof Error ? error.message : "Payment processing failed", 500);
  }
});
