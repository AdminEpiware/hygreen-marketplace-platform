import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayLaterCrownProps {
  className?: string;
  size?: number;
  showLabel?: boolean;
}

export function PayLaterCrown({ className, size = 16, showLabel = false }: PayLaterCrownProps) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Crown className="text-yellow-500" size={size} fill="currentColor" />
      {showLabel && (
        <span className="text-xs font-medium text-yellow-600">Pay Later Available</span>
      )}
    </div>
  );
}
