import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Download, Package, Calendar, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_name: string;
  product_category: string;
  price: number;
  unit: string;
  quantity: number;
  item_total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  deliveryAddress: string;
  paymentType: string;
  paymentStatus: string;
  orderStatus: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  completedAt: string;
  createdAt: string;
  items: OrderItem[];
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const navigate = useNavigate();
  const { formatPrice, refreshCartCount } = useAuth();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setError('No payment session found');
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      console.log('Verifying payment for session:', sessionId);
      
      const { data, error } = await supabase.functions.invoke('verify_stripe_payment', {
        body: { sessionId },
      });

      if (error) {
        console.error('Verification error:', error);
        const errorMsg = await error?.context?.text();
        console.error('Error details:', errorMsg || error?.message);
        throw new Error(errorMsg || error?.message || 'Failed to verify payment');
      }

      console.log('Verification response:', data);

      if (data?.data?.verified && data?.data?.order) {
        setVerified(true);
        setOrder(data.data.order);
        
        // Refresh cart count to reflect cleared cart
        await refreshCartCount();
        
        toast.success('Payment successful! Your order has been placed.');
      } else {
        setError(data?.data?.status === 'unpaid' 
          ? 'Payment is still processing. Please check back later.' 
          : 'Payment verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const calculateEstimatedDelivery = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3); // 3 days from now
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const downloadInvoice = async () => {
    if (!order) return;

    setDownloadingInvoice(true);
    try {
      // Generate invoice content
      const invoiceContent = generateInvoiceHTML(order);
      
      // Create a blob and download
      const blob = new Blob([invoiceContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order.orderNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully');
    } catch (err) {
      console.error('Failed to download invoice:', err);
      toast.error('Failed to download invoice');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const generateInvoiceHTML = (order: Order): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${order.orderNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #000;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .info-section h2 {
      font-size: 16px;
      margin-bottom: 10px;
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .totals {
      text-align: right;
      margin-top: 20px;
    }
    .totals div {
      margin-bottom: 8px;
    }
    .total-amount {
      font-size: 18px;
      font-weight: bold;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #333;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://miaoda-conversation-file.s3cdn.medo.dev/user-b90f8uvj3yf4/app-b90lb7mv1w5d/20260516/HyGreen_Logo.png" alt="HyGreen" style="height:80px;width:auto;object-fit:contain;margin-bottom:8px;" />
    <h1>HyGreen</h1>
    <p style="font-size:12px;color:#555;margin-top:2px;">More Than Grocery, It's Family.</p>
    <p>Invoice</p>
  </div>

  <div class="info-section">
    <h2>Order Information</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
    <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
    <p><strong>Order Status:</strong> ${order.orderStatus}</p>
  </div>

  <div class="info-section">
    <h2>Delivery Address</h2>
    <p>${order.deliveryAddress}</p>
  </div>

  <h2>Order Items</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Category</th>
        <th>Unit</th>
        <th>Price</th>
        <th>Quantity</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map(item => `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.product_category}</td>
          <td>${item.unit}</td>
          <td>${formatPrice(item.price)}</td>
          <td>${item.quantity}</td>
          <td>${formatPrice(item.item_total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div><strong>Subtotal:</strong> ${formatPrice(order.subtotal)}</div>
    <div><strong>Tax:</strong> ${formatPrice(order.tax)}</div>
    <div class="total-amount"><strong>Total Amount:</strong> ${formatPrice(order.totalAmount)}</div>
  </div>

  <div class="footer">
    <p>Thank you for your purchase!</p>
    <p>HyGreen — Your trusted grocery partner</p>
  </div>
</body>
</html>
    `;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 md:py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Card */}
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                {verifying ? (
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                ) : verified ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-destructive" />
                )}
              </div>
              <CardTitle className="text-center text-balance">
                {verifying ? 'Verifying Payment...' : verified ? 'Payment Successful!' : 'Payment Failed'}
              </CardTitle>
              <CardDescription className="text-center text-pretty">
                {verifying ? (
                  'Please wait while we verify your payment and create your order...'
                ) : verified ? (
                  'Your payment has been processed successfully and your order has been placed!'
                ) : (
                  error || 'We encountered an issue processing your payment.'
                )}
              </CardDescription>
            </CardHeader>

            {!verifying && verified && order && (
              <CardContent className="space-y-6">
                {/* Order Summary */}
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-1">
                      <p className="font-medium">Order #{order.orderNumber}</p>
                      <p className="text-sm">
                        Estimated delivery: {calculateEstimatedDelivery()}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Order Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Order Status</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {order.orderStatus.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Order Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Delivery Address</p>
                      <p className="text-sm text-muted-foreground break-words">
                        {order.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Payment Method</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {order.paymentType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium">Order Items</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm break-words">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.product_category} • {item.unit}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatPrice(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium text-sm">{formatPrice(item.item_total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Order Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-base">
                    <span>Total Amount</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={downloadInvoice}
                    disabled={downloadingInvoice}
                    variant="outline"
                    className="w-full"
                  >
                    {downloadingInvoice ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Invoice
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/buyer/dashboard')}
                    className="w-full"
                  >
                    View Order Details
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate('/products')}
                    className="w-full"
                  >
                    Continue Shopping
                  </Button>
                </div>
              </CardContent>
            )}

            {!verifying && !verified && (
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate('/cart')} className="w-full">
                    Return to Cart
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/products')} className="w-full">
                    Browse Products
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
