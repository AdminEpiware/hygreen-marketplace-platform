import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { CartItemWithProduct, PaymentType } from '@/types/types';

export default function Checkout() {
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash_on_delivery');
  const [taxRate, setTaxRate] = useState(0.05);
  const { user, profile, convertPrice, formatPrice, currency, refreshCartCount } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile?.role === 'buyer') {
      // Set default delivery address from profile if available
      if (profile.address) {
        setDeliveryAddress(profile.address);
      }
      fetchCart();
      fetchTaxRate();
    }
  }, [user, profile]);

  const fetchTaxRate = async () => {
    const { data } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'tax_rate')
      .maybeSingle();

    if (data) {
      setTaxRate(parseFloat(data.value));
    }
  };

  const fetchCart = async () => {
    const { data, error } = await supabase
      .from('cart')
      .select('*, product:products(*)')
      .eq('buyer_id', user!.id);

    if (error) {
      toast.error('Failed to load cart');
      console.error(error);
    } else {
      setCartItems(data || []);
    }
    setLoading(false);
  };

  const calculateDueDate = (type: PaymentType): string | null => {
    if (type === 'weekly_plan') {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString();
    }
    if (type === 'monthly_plan') {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString();
    }
    return null;
  };

  const placeOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Get seller_id from first cart item (all items should be from same seller)
    const sellerId = cartItems[0]?.product?.seller_id;
    if (!sellerId) {
      toast.error('Invalid cart items');
      return;
    }

    setProcessing(true);

    try {
      console.log('Starting order placement...');
      console.log('Cart items:', cartItems.length);
      console.log('Payment type:', paymentType);
      console.log('Seller ID:', sellerId);

      const subtotal = cartItems.reduce((sum, item) => {
        const convertedPrice = convertPrice(item.product.price, item.product.base_currency);
        return sum + convertedPrice * item.quantity;
      }, 0);
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      const dueDate = calculateDueDate(paymentType);

      console.log('Order totals:', { subtotal, tax, total });

      if (paymentType === 'online_payment') {
        console.log('Processing online payment...');
        const items = cartItems.map(item => ({
          name: item.product.name,
          price: convertPrice(item.product.price, item.product.base_currency),
          quantity: item.quantity,
          image_url: item.product.image_url || '',
        }));

        console.log('Invoking Stripe checkout Edge Function...');
        const { data, error } = await supabase.functions.invoke('create_stripe_checkout', {
          body: { items, currency: currency.toLowerCase() },
        });

        if (error) {
          console.error('Stripe checkout error:', error);
          const errorMsg = await error?.context?.text();
          console.error('Error details:', errorMsg || error?.message);
          throw new Error(errorMsg || error?.message || 'Failed to create checkout session');
        }

        console.log('Stripe checkout response:', data);

        if (data?.data?.url) {
          window.open(data.data.url, '_blank');
          toast.success('Redirecting to payment...');
        } else {
          throw new Error('No checkout URL received from payment processor');
        }
      } else {
        console.log('Creating order in database...');
        
        const orderData = {
          buyer_id: user!.id,
          seller_id: sellerId,
          delivery_address: deliveryAddress,
          payment_type: paymentType,
          payment_status: 'pending',
          order_status: 'placed',
          subtotal,
          tax,
          total_amount: total,
          due_date: dueDate,
        };

        console.log('Order data:', orderData);

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw orderError;
        }

        console.log('Order created:', order.id);

        const orderItems = cartItems.map(item => {
          const convertedPrice = convertPrice(item.product.price, item.product.base_currency);
          return {
            order_id: order.id,
            product_id: item.product.id,
            seller_id: item.product.seller_id,
            product_name: item.product.name,
            product_category: item.product.category,
            price: convertedPrice,
            unit: item.product.unit,
            quantity: item.quantity,
            item_total: convertedPrice * item.quantity,
          };
        });

        console.log('Creating order items:', orderItems.length);

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Order items creation error:', itemsError);
          throw itemsError;
        }

        console.log('Order items created successfully');

        // Clear cart items for this seller only
        console.log('Clearing cart...');
        const { error: cartError } = await supabase
          .from('cart')
          .delete()
          .eq('buyer_id', user!.id)
          .eq('seller_id', sellerId);

        if (cartError) {
          console.error('Cart clear error:', cartError);
          throw cartError;
        }

        console.log('Cart cleared successfully');

        await refreshCartCount();
        toast.success('Order placed successfully!');
        navigate('/buyer/dashboard');
      }
    } catch (error: any) {
      console.error('Order placement error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to place order';
      
      if (error.message?.includes('permission') || error.message?.includes('denied')) {
        errorMessage = 'Permission denied. Please try logging in again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('STRIPE_SECRET_KEY')) {
        errorMessage = 'Payment system not configured. Please contact support.';
      } else if (error.message?.includes('checkout')) {
        errorMessage = `Payment processing error: ${error.message}`;
      } else if (error.code === 'PGRST301') {
        errorMessage = 'Database error. Please contact support.';
      } else if (error.code === '23505') {
        errorMessage = 'Duplicate order detected. Please refresh and try again.';
      } else if (error.code === '23503') {
        errorMessage = 'Invalid product or seller. Please refresh your cart.';
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const convertedPrice = convertPrice(item.product.price, item.product.base_currency);
    return sum + convertedPrice * item.quantity;
  }, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  if (!user || profile?.role !== 'buyer') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Please sign in as a buyer</p>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button onClick={() => navigate('/products')}>Browse Products</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <h1 className="text-3xl font-semibold">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={4}
                  placeholder="Enter your delivery address"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="cash_on_delivery" id="cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="online_payment" id="online" />
                    <Label htmlFor="online" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Online Payment</p>
                        <p className="text-sm text-muted-foreground">Pay securely with card or UPI</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="weekly_plan" id="weekly" />
                    <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Weekly Payment Plan</p>
                        <p className="text-sm text-muted-foreground">Pay within 7 days</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="monthly_plan" id="monthly" />
                    <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Monthly Payment Plan</p>
                        <p className="text-sm text-muted-foreground">Pay within 30 days</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.product.name} ({item.quantity} {item.product.unit})
                      </span>
                      <span>₹{(convertPrice(item.product.price, item.product.base_currency) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                    <span className="font-medium">₹{tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">₹{total.toFixed(2)}</span>
                  </div>
                </div>
                <Button className="w-full" size="lg" onClick={placeOrder} disabled={processing}>
                  {processing ? 'Processing...' : 'Place Order'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
