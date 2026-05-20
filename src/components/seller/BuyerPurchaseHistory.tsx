import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Package, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderWithItems, OrderStatus, PaymentStatus } from '@/types/types';

interface BuyerData {
  buyer_id: string;
  buyer_profile: {
    id: string;
    email: string;
    full_name: string;
    mobile_number: string;
  };
  buyer_store: {
    id: string;
    store_name: string;
    delivery_address: string;
  } | null;
  total_orders: number;
  total_spent: number;
  order_count: number;
}

interface BuyerPurchaseHistoryProps {
  buyer: BuyerData;
  sellerId: string;
  onBack: () => void;
  maskEmail: (email: string) => string;
  maskPhone: (phone: string) => string;
}

export function BuyerPurchaseHistory({ 
  buyer, 
  sellerId, 
  onBack,
  maskEmail,
  maskPhone 
}: BuyerPurchaseHistoryProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const { formatPrice } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, [buyer.buyer_id, sellerId]);

  useEffect(() => {
    applyFilters();
  }, [orders, dateFrom, dateTo, orderStatusFilter, paymentStatusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch order items for this buyer from this seller
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders!inner(*)
        `)
        .eq('seller_id', sellerId)
        .eq('order.buyer_id', buyer.buyer_id)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Group by order_id
      const orderMap = new Map<string, OrderWithItems>();

      orderItems?.forEach((item: any) => {
        const orderId = item.order.id;
        
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            ...item.order,
            order_items: [],
          });
        }

        orderMap.get(orderId)!.order_items.push(item);
      });

      setOrders(Array.from(orderMap.values()));
    } catch (error) {
      console.error('Failed to fetch purchase history:', error);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(order => new Date(order.created_at) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.created_at) <= toDate);
    }

    // Order status filter
    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === orderStatusFilter);
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === paymentStatusFilter);
    }

    setFilteredOrders(filtered);
  };

  const getOrderStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'placed': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'confirmed': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'packed': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'delivered': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'completed': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'failed': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const calculateSellerTotal = (order: OrderWithItems): number => {
    return order.order_items.reduce((sum, item) => sum + item.item_total, 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>
                Orders from {buyer.buyer_profile.full_name}
                {buyer.buyer_store && ` - ${buyer.buyer_store.store_name}`}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-semibold">{buyer.total_orders}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-semibold">{formatPrice(buyer.total_spent)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{maskEmail(buyer.buyer_profile.email)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mobile</p>
              <p className="font-medium">{maskPhone(buyer.buyer_profile.mobile_number)}</p>
            </div>
            {buyer.buyer_store && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="font-medium">{buyer.buyer_store.delivery_address}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">Filter Orders</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setOrderStatusFilter('all');
                setPaymentStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderStatus">Order Status</Label>
              <Select value={orderStatusFilter} onValueChange={(value: any) => setOrderStatusFilter(value)}>
                <SelectTrigger id="orderStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="placed">Placed</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select value={paymentStatusFilter} onValueChange={(value: any) => setPaymentStatusFilter(value)}>
                <SelectTrigger id="paymentStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle className="text-lg">Order History</CardTitle>
            </div>
            <Badge variant="secondary">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No orders found matching the filters
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Order #{order.order_number}</p>
                        <Badge className={getOrderStatusColor(order.order_status)}>
                          {order.order_status}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.payment_status)}>
                          {order.payment_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Your Total</p>
                      <p className="text-lg font-semibold">{formatPrice(calculateSellerTotal(order))}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Items from your store:</p>
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-muted-foreground">
                              {item.quantity} {item.unit} × {formatPrice(item.price)}
                            </p>
                          </div>
                          <p className="font-medium">{formatPrice(item.item_total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-3 text-sm text-muted-foreground">
                    <p>Payment: {order.payment_type.replace(/_/g, ' ').toUpperCase()}</p>
                    {order.delivery_address && (
                      <p className="line-clamp-1">Delivery: {order.delivery_address}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
