import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OrderTracking } from '@/components/buyer/OrderTracking';
import { ChevronDown, ChevronUp, Package, Store, MapPin, CreditCard, Calendar, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderWithItems, OrderStatus } from '@/types/types';
import { getStoreName } from '@/lib/store';

interface BuyerOrderCardProps {
  order: OrderWithItems;
  hasReview: (productId: string, orderId: string) => boolean;
}

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

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

export function BuyerOrderCard({ order, hasReview }: BuyerOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { formatPrice } = useAuth();

  return (
    <Card className="h-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between gap-3 text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-base">Order #{order.order_number}</h3>
                  {order.order_type === 'direct' && (
                    <Badge variant="outline" className="text-xs">Direct Sale</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`${STATUS_COLORS[order.order_status]} border text-xs`}>
                  {STATUS_LABELS[order.order_status]}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'item' : 'items'}
              </span>
              <span className="text-base font-semibold">{formatPrice(order.total_amount)}</span>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <Separator />

            {/* Order Status Tracking */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Order Status</h4>
              <OrderTracking 
                currentStatus={order.order_status} 
                cancellationReason={order.cancellation_reason}
              />
            </div>

            <Separator />

            {/* Order Items */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Order Items</h4>
              <div className="space-y-2">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.product_category}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.quantity} {item.unit} × {formatPrice(item.price)}
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

            {/* Order Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium text-base">
                  <span>Total</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Order Details</h4>
              <div className="space-y-3">
                {order.seller_profile && (
                  <div className="flex items-start gap-3">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Store Name</p>
                      <p className="text-sm font-medium">{getStoreName(order.seller_profile)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="text-sm capitalize">{order.payment_type.replace(/_/g, ' ')}</p>
                    <Badge className={`${PAYMENT_STATUS_COLORS[order.payment_status]} border text-xs mt-1`}>
                      {order.payment_status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Delivery Address</p>
                    <p className="text-sm break-words">{order.delivery_address}</p>
                  </div>
                </div>

                {order.due_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p className="text-sm">
                        {new Date(order.due_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Order ID</p>
                    <p className="text-sm font-mono">{order.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Section for Delivered Orders */}
            {order.order_status === 'delivered' && order.order_items && order.order_items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Leave a Review</h4>
                  <div className="flex flex-wrap gap-2">
                    {order.order_items.map((item) => (
                      !hasReview(item.product_id, order.id) && (
                        <Link
                          key={item.id}
                          to={`/review?productId=${item.product_id}&orderId=${order.id}`}
                        >
                          <Button size="sm" variant="outline" className="h-8">
                            <Star className="mr-2 h-3 w-3" />
                            Review {item.product_name}
                          </Button>
                        </Link>
                      )
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
