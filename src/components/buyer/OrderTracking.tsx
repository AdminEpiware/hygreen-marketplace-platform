import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import type { OrderStatus } from '@/types/types';

interface OrderTrackingProps {
  currentStatus: OrderStatus;
  cancellationReason?: string | null;
}

const STATUS_FLOW: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'on_the_way', 'delivered'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  packed: 'Packed',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-slate-100 text-slate-800 border-slate-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  on_the_way: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  packed: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function OrderTracking({ currentStatus, cancellationReason }: OrderTrackingProps) {
  const isCancelled = currentStatus === 'cancelled';
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  const getStepStatus = (index: number): 'completed' | 'current' | 'pending' => {
    if (isCancelled) return 'pending';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  if (isCancelled) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-red-900">Order Cancelled</p>
              {cancellationReason && (
                <p className="text-sm text-red-800 mt-1 break-words">{cancellationReason}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Order Status</p>
            <Badge className={`${STATUS_COLORS[currentStatus]} border`}>
              {STATUS_LABELS[currentStatus]}
            </Badge>
          </div>

          {/* Desktop Timeline */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
              <div
                className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
                style={{
                  width: `${(currentIndex / (STATUS_FLOW.length - 1)) * 100}%`,
                }}
              />
              <div className="relative flex justify-between">
                {STATUS_FLOW.map((status, index) => {
                  const stepStatus = getStepStatus(index);
                  return (
                    <div key={status} className="flex flex-col items-center gap-2">
                      <div
                        className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${
                          stepStatus === 'completed'
                            ? 'bg-primary border-primary'
                            : stepStatus === 'current'
                            ? 'bg-background border-primary'
                            : 'bg-background border-border'
                        }`}
                      >
                        {stepStatus === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <Circle
                            className={`h-5 w-5 ${
                              stepStatus === 'current' ? 'text-primary fill-primary' : 'text-muted-foreground'
                            }`}
                          />
                        )}
                      </div>
                      <p
                        className={`text-xs text-center max-w-[80px] ${
                          stepStatus === 'completed' || stepStatus === 'current'
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Timeline */}
          <div className="md:hidden space-y-3">
            {STATUS_FLOW.map((status, index) => {
              const stepStatus = getStepStatus(index);
              return (
                <div key={status} className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      stepStatus === 'completed'
                        ? 'bg-primary border-primary'
                        : stepStatus === 'current'
                        ? 'bg-background border-primary'
                        : 'bg-background border-border'
                    }`}
                  >
                    {stepStatus === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Circle
                        className={`h-4 w-4 ${
                          stepStatus === 'current' ? 'text-primary fill-primary' : 'text-muted-foreground'
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      stepStatus === 'completed' || stepStatus === 'current'
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
