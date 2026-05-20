import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { ActiveStoreIndicator } from '@/components/buyer/ActiveStoreIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { CartItemWithProduct, Config } from '@/types/types';

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxRate, setTaxRate] = useState(0.05);
  const { user, profile, convertPrice, formatPrice, refreshCartCount } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile?.role === 'buyer') {
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

  const updateQuantity = async (cartItemId: string, newQuantity: number, maxQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxQuantity) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }

    const { error } = await supabase
      .from('cart')
      .update({ quantity: newQuantity })
      .eq('id', cartItemId);

    if (error) {
      toast.error('Failed to update quantity');
    } else {
      await fetchCart();
      await refreshCartCount();
    }
  };

  const removeItem = async (cartItemId: string) => {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      toast.error('Failed to remove item');
    } else {
      await fetchCart();
      await refreshCartCount();
      toast.success('Item removed from cart');
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
          <p className="text-center text-muted-foreground">Please sign in as a buyer to view cart</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Shopping Cart</h1>
        </div>
        
        <ActiveStoreIndicator />

        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : cartItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button onClick={() => navigate('/products')}>Continue Shopping</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.product.category}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.product.available_quantity)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, Number(e.target.value), item.product.available_quantity)}
                              className="w-16 text-center"
                              min="1"
                              max={item.product.available_quantity}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.product.available_quantity)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium">
                              {item.product.unit}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              ₹{(convertPrice(item.product.price, item.product.base_currency) * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.product.unit} × ₹{convertPrice(item.product.price, item.product.base_currency).toFixed(2)}/{item.product.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button className="w-full" size="lg" onClick={() => navigate('/checkout')}>
                    Proceed to Checkout
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/products')}>
                    Continue Shopping
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
