import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Minus, Trash2, Receipt, ArrowLeft, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/currency';
import type { Product } from '@/types/types';

interface BillingItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface InvoiceData {
  id: string;
  store_name: string;
  customer_name?: string;
  customer_mobile?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  sale_date: string;
}

export default function DirectBilling() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [billingCart, setBillingCart] = useState<BillingItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'pay_later' | 'card'>('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  // Resolve store name: explicit store_name first, then personal full_name as
  // fallback so invoices always have a valid header even for new sellers.
  const storeName = profile?.store_name?.trim() || profile?.full_name?.trim() || '';

  useEffect(() => {
    if (user && profile?.role === 'seller') {
      fetchProducts();
    }
  }, [user, profile]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user!.id)
        .gt('available_quantity', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = billingCart.find(item => item.product.id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.available_quantity) {
        toast.error('Cannot add more than available quantity');
        return;
      }
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setBillingCart([...billingCart, {
        product,
        quantity: 1,
        subtotal: Number(product.price)
      }]);
      toast.success(`${product.name} added to cart`);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setBillingCart(billingCart.map(item => {
      if (item.product.id === productId) {
        if (newQuantity > item.product.available_quantity) {
          toast.error('Quantity exceeds available stock');
          return item;
        }
        return {
          ...item,
          quantity: newQuantity,
          subtotal: Number(item.product.price) * newQuantity
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setBillingCart(billingCart.filter(item => item.product.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = billingCart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = 0; // Can be configured later
    const total = subtotal + tax - discount;
    return { subtotal, tax, total };
  };

  const handleCompleteSale = async () => {
    if (billingCart.length === 0) {
      toast.error('Please add items to the cart');
      return;
    }

    if (!storeName) {
      toast.error('Store name not found. Please update your profile name.');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, tax, total } = calculateTotals();

      // Prepare sale items
      const saleItems = billingCart.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.product.price),
        subtotal: item.subtotal
      }));

      // Create direct sale record
      const { data: saleData, error: saleError } = await supabase
        .from('direct_sales')
        .insert({
          seller_id: user!.id,
          store_name: storeName,
          customer_name: customerName || null,
          customer_mobile: customerMobile || null,
          items: saleItems,
          subtotal,
          tax,
          discount,
          total,
          payment_method: paymentMethod,
          sale_type: 'direct_sale'
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Update product quantities
      for (const item of billingCart) {
        const newQuantity = item.product.available_quantity - item.quantity;
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ available_quantity: newQuantity })
          .eq('id', item.product.id);

        if (updateError) {
          console.error('Error updating product quantity:', updateError);
        }
      }

      // Prepare invoice data
      setInvoiceData({
        id: saleData.id,
        store_name: storeName,
        customer_name: customerName,
        customer_mobile: customerMobile,
        items: saleItems,
        subtotal,
        tax,
        discount,
        total,
        payment_method: paymentMethod,
        sale_date: new Date().toISOString()
      });

      // Clear cart and form
      setBillingCart([]);
      setCustomerName('');
      setCustomerMobile('');
      setDiscount(0);
      setSearchQuery('');

      // Refresh products
      await fetchProducts();

      // Show invoice
      setShowInvoice(true);
      toast.success('Sale completed successfully!');
    } catch (error) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const { subtotal, tax, total } = calculateTotals();

  if (profile?.role !== 'seller') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">This feature is only available for sellers.</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Go to Home
              </Button>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Direct Billing</h1>
            <p className="text-muted-foreground mt-1">Create bills for walk-in customers</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/seller/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Search and Selection */}
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Select Products</CardTitle>
              <CardDescription>Search and add products to the bill</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or product code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex-1 border rounded-lg overflow-y-auto min-h-0" style={{ maxHeight: '400px' }}>
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {searchQuery ? 'No products found' : 'No products available'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-muted-foreground">
                                {formatPrice(product.price, product.base_currency || DEFAULT_CURRENCY)} / {product.unit}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                Stock: {product.available_quantity}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addToCart(product)}
                            disabled={product.available_quantity === 0}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing Cart */}
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Billing Cart</CardTitle>
              <CardDescription>{billingCart.length} items</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              <div className="flex-1 border rounded-lg overflow-y-auto min-h-0" style={{ maxHeight: '400px' }}>
                {billingCart.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Cart is empty. Add products to start billing.
                  </div>
                ) : (
                  <div className="divide-y">
                    {billingCart.map((item) => (
                      <div key={item.product.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.product.price, item.product.base_currency || DEFAULT_CURRENCY)} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 border rounded">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.product.id)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium mt-2">
                          {formatPrice(item.subtotal, item.product.base_currency || DEFAULT_CURRENCY)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {billingCart.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal, DEFAULT_CURRENCY)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatPrice(tax, DEFAULT_CURRENCY)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-green-600">-{formatPrice(discount, DEFAULT_CURRENCY)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>{formatPrice(total, DEFAULT_CURRENCY)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Details and Payment */}
        {billingCart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Details & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name (Optional)</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerMobile">Mobile Number (Optional)</Label>
                  <Input
                    id="customerMobile"
                    placeholder="Enter mobile number"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      {profile?.pay_later_enabled && (
                        <SelectItem value="pay_later">Pay Later</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Amount</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Button
                onClick={handleCompleteSale}
                disabled={loading}
                className="w-full gap-2"
                size="lg"
              >
                <Receipt className="h-5 w-5" />
                {loading ? 'Processing...' : 'Complete Sale & Generate Invoice'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invoice Dialog */}
        <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Generated</DialogTitle>
            </DialogHeader>
            
            {invoiceData && (
              <div className="space-y-6" id="invoice-content">
                <div className="text-center border-b pb-4">
                  <h2 className="text-2xl font-bold">{invoiceData.store_name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Direct Sale Invoice</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Invoice ID</p>
                    <p className="font-medium">{invoiceData.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date & Time</p>
                    <p className="font-medium">{new Date(invoiceData.sale_date).toLocaleString()}</p>
                  </div>
                  {invoiceData.customer_name && (
                    <div>
                      <p className="text-muted-foreground">Customer Name</p>
                      <p className="font-medium">{invoiceData.customer_name}</p>
                    </div>
                  )}
                  {invoiceData.customer_mobile && (
                    <div>
                      <p className="text-muted-foreground">Mobile</p>
                      <p className="font-medium">{invoiceData.customer_mobile}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{invoiceData.payment_method.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.price, DEFAULT_CURRENCY)}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.subtotal, DEFAULT_CURRENCY)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(invoiceData.subtotal, DEFAULT_CURRENCY)}</span>
                  </div>
                  {invoiceData.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatPrice(invoiceData.tax, DEFAULT_CURRENCY)}</span>
                    </div>
                  )}
                  {invoiceData.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-green-600">-{formatPrice(invoiceData.discount, DEFAULT_CURRENCY)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total Amount</span>
                    <span>{formatPrice(invoiceData.total, DEFAULT_CURRENCY)}</span>
                  </div>
                </div>

                <div className="flex gap-2 print:hidden">
                  <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
                    <Printer className="h-4 w-4" />
                    Print Invoice
                  </Button>
                  <Button onClick={() => setShowInvoice(false)} className="flex-1">
                    Close
                  </Button>
                </div>

                {/* Invoice footer brand */}
                <div className="border-t pt-4 text-center space-y-1">
                  <img
                    src="https://miaoda-conversation-file.s3cdn.medo.dev/user-b90f8uvj3yf4/app-b90lb7mv1w5d/20260516/HyGreen_Logo.png"
                    alt="HyGreen"
                    className="h-10 w-auto mx-auto object-contain"
                  />
                  <p className="text-xs text-muted-foreground italic">
                    "More Than Grocery, It's Family."
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
