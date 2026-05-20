import { useAuth } from '@/contexts/AuthContext';
import { Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ActiveStoreIndicator() {
  const { activeStore, profile } = useAuth();

  if (!activeStore || profile?.role !== 'buyer') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border border-border">
      <Store className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{activeStore.store_name}</span>
          <Badge variant="secondary" className="text-xs">Active</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{activeStore.delivery_address}</p>
      </div>
    </div>
  );
}
