import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, User, Phone, MapPin, DollarSign, Calendar, Store, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderStatus } from '@/types/types';

interface OrderItem {
  id: string;
  product_name: string;
  product_category: string;
  price: number;
  quantity: number;
  unit: string;
  item_total: number;
}

interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  delivery_address: string;
  payment_type: string;
  payment_status: string;
  order_status: OrderStatus;
  order_type: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  buyer_profile: {
    full_name: string;
    email: string;
    mobile_number: string;
  };
  buyer_store: {
    store_name: string;
    delivery_address: string;
  } | null;
  order_items: OrderItem[];
}

interface OrderManagementProps {
  sellerId: string;
  storeName?: string;
}

type StatusTab = 'all' | 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-slate-100 text-slate-800 border-slate-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  on_the_way: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  packed: 'bg-amber-100 text-amber-800 border-amber-200',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  packed: 'Packed',
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  placed: 'confirmed',
  confirmed: 'preparing',
  preparing: 'on_the_way',
  on_the_way: 'delivered',
  delivered: null,
  cancelled: null,
  packed: 'on_the_way',
};

export function OrderManagement({ sellerId, storeName }: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const { formatPrice } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, [sellerId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          buyer_profile:profiles!orders_buyer_id_fkey(
            full_name,
            email,
            mobile_number
          ),
          buyer_store:buyer_stores(
            store_name,
            delivery_address
          ),
          order_items(
            id,
            product_name,
            product_category,
            price,
            quantity,
            unit,
            item_total
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    return orders.filter(order => order.order_status === activeTab);
  };

  const getStatusCounts = () => {
    return {
      all: orders.length,
      confirmed: orders.filter(o => o.order_status === 'confirmed').length,
      preparing: orders.filter(o => o.order_status === 'preparing').length,
      on_the_way: orders.filter(o => o.order_status === 'on_the_way').length,
      delivered: orders.filter(o => o.order_status === 'delivered').length,
      cancelled: orders.filter(o => o.order_status === 'cancelled').length,
    };
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success('Order status updated successfully');
      setShowStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      fetchOrders();
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      toast.error(error.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_status: 'cancelled',
          cancellation_reason: cancellationReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success('Order cancelled successfully');
      setShowCancelDialog(false);
      setSelectedOrder(null);
      setCancellationReason('');
      fetchOrders();
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    const next = NEXT_STATUS[order.order_status];
    if (next) {
      setNewStatus(next);
    }
    setShowStatusDialog(true);
  };

  const openCancelDialog = (order: Order) => {
    setSelectedOrder(order);
    setCancellationReason('');
    setShowCancelDialog(true);
  };

  const canUpdateStatus = (status: OrderStatus) => {
    return status !== 'delivered' && status !== 'cancelled';
  };

  const counts = getStatusCounts();
  const filteredOrders = getFilteredOrders();

  return (
    <div className="space-y-6">
      {storeName && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Store className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Store</p>
              <p className="font-medium">{storeName}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-balance">Order Management</CardTitle>
          <CardDescription className="text-pretty">
            Track and manage all your orders with status-based organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-2">
              <TabsTrigger value="all" className="flex flex-col gap-1 py-2">
                <span className="text-xs">All Orders</span>
                <Badge variant="secondary" className="text-xs">{counts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="flex flex-col gap-1 py-2">
                <span className="text-xs">Confirmed</span>
                <Badge variant="secondary" className="text-xs">{counts.confirmed}</Badge>
              </TabsTrigger>
              <TabsTrigger value="preparing" className="flex flex-col gap-1 py-2">
                <span className="text-xs">Preparing</span>
                <Badge variant="secondary" className="text-xs">{counts.preparing}</Badge>
              </TabsTrigger>
              <TabsTrigger value="on_the_way" className="flex flex-col gap-1 py-2">
                <span className="text-xs">On the Way</span>
                <Badge variant="secondary" className="text-xs">{counts.on_the_way}</Badge>
              </TabsTrigger>
              <TabsTrigger value="delivered" className="flex flex-col gap-1 py-2">
                <span className="text-xs">Delivered</span>
                <Badge variant="secondary" className="text-xs">{counts.delivered}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex flex-col gap-1 py-2">
                <span className="text-xs">Cancelled</span>
                <Badge variant="secondary" className="text-xs">{counts.cancelled}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <Card key={order.id} className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">Order #{order.order_number}</CardTitle>
                              {order.order_type === 'direct' && (
                                <Badge variant="outline" className="text-xs">Direct Sale</Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs">
                              {new Date(order.created_at).toLocaleString()}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`${STATUS_COLORS[order.order_status]} border`}>
                              {STATUS_LABELS[order.order_status]}
                            </Badge>
                            {canUpdateStatus(order.order_status) && (
                              <>
                                {NEXT_STATUS[order.order_status] && (
                                  <Button
                                    size="sm"
                                    onClick={() => openStatusDialog(order)}
                                    className="h-8"
                                  >
                                    Update Status
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openCancelDialog(order)}
                                  className="h-8"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{order.buyer_profile?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground break-words">{order.buyer_profile?.email || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-sm">{order.buyer_profile?.mobile_number || 'N/A'}</p>
                            </div>
                            {order.buyer_store && (
                              <div className="flex items-start gap-3">
                                <Store className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{order.buyer_store.store_name}</p>
                                  <p className="text-xs text-muted-foreground break-words">{order.buyer_store.delivery_address}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Delivery Address</p>
                                <p className="text-sm break-words">{order.delivery_address}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Payment</p>
                                <p className="text-sm capitalize">{order.payment_type.replace('_', ' ')}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {order.cancellation_reason && (
                          <div className="flex items-start gap-3 p-3 rounded-md bg-red-50 border border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-red-900">Cancellation Reason</p>
                              <p className="text-sm text-red-800 break-words">{order.cancellation_reason}</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Order Items</p>
                          <div className="border rounded-md overflow-hidden">
                            <div className="w-full max-w-full overflow-x-auto bg-card">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="whitespace-nowrap">Product</TableHead>
                                    <TableHead className="whitespace-nowrap">Category</TableHead>
                                    <TableHead className="whitespace-nowrap text-right">Price</TableHead>
                                    <TableHead className="whitespace-nowrap text-right">Qty</TableHead>
                                    <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.order_items?.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="whitespace-nowrap">
                                        <div>
                                          <p className="font-medium text-sm">{item.product_name}</p>
                                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell className="whitespace-nowrap text-sm">{item.product_category}</TableCell>
                                      <TableCell className="whitespace-nowrap text-right text-sm">{formatPrice(item.price)}</TableCell>
                                      <TableCell className="whitespace-nowrap text-right text-sm">{item.quantity}</TableCell>
                                      <TableCell className="whitespace-nowrap text-right font-medium text-sm">{formatPrice(item.item_total)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <div className="space-y-1 text-right">
                            <div className="flex justify-between gap-8 text-sm">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span>{formatPrice(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between gap-8 text-sm">
                              <span className="text-muted-foreground">Tax:</span>
                              <span>{formatPrice(order.tax)}</span>
                            </div>
                            <div className="flex justify-between gap-8 text-base font-medium pt-1 border-t">
                              <span>Total:</span>
                              <span>{formatPrice(order.total_amount)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Update Order Status</DialogTitle>
            <DialogDescription className="text-pretty">
              Change the status of order #{selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div>
                <Badge className={`${STATUS_COLORS[selectedOrder?.order_status || 'placed']} border`}>
                  {STATUS_LABELS[selectedOrder?.order_status || 'placed']}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                <SelectTrigger id="new-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {selectedOrder && NEXT_STATUS[selectedOrder.order_status] && (
                    <SelectItem value={NEXT_STATUS[selectedOrder.order_status]!}>
                      {STATUS_LABELS[NEXT_STATUS[selectedOrder.order_status]!]}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={!newStatus || updating}>
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Cancel Order</DialogTitle>
            <DialogDescription className="text-pretty">
              Please provide a reason for cancelling order #{selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">
                Cancellation Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Enter the reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={4}
                className="px-2"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be visible to the buyer
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={updating}>
              Keep Order
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelOrder} 
              disabled={!cancellationReason.trim() || updating}
            >
              {updating ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
