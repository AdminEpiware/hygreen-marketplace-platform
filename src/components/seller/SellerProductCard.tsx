import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Boxes, DollarSign, Trash2, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { getProductImageWithFallback } from '@/utils/productImages';
import type { Product } from '@/types/types';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/currency';

function stockMeta(qty: number) {
  if (qty === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
  if (qty <= 10) return { label: 'Low Stock', variant: 'outline' as const, cls: 'border-amber-400 text-amber-600' };
  return { label: 'In Stock', variant: 'secondary' as const };
}

interface SellerProductCardProps {
  product: Product;
  onUpdate: () => void;
}

export function SellerProductCard({ product, onUpdate }: SellerProductCardProps) {
  const navigate = useNavigate();
  const [stockOpen, setStockOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newQty, setNewQty] = useState(product.available_quantity.toString());
  const [newPrice, setNewPrice] = useState(product.price.toString());
  const [saving, setSaving] = useState(false);
  const { label, variant, cls } = stockMeta(product.available_quantity);

  const handleUpdateStock = async () => {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) { toast.error('Enter a valid quantity'); return; }
    setSaving(true);
    const { error } = await supabase.from('products').update({ available_quantity: qty }).eq('id', product.id);
    setSaving(false);
    if (error) { toast.error('Failed to update stock'); return; }
    toast.success('Stock updated');
    setStockOpen(false);
    onUpdate();
  };

  const handleUpdatePrice = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) { toast.error('Enter a valid price'); return; }
    setSaving(true);
    const { error } = await supabase.from('products').update({ price }).eq('id', product.id);
    setSaving(false);
    if (error) { toast.error('Failed to update price'); return; }
    toast.success('Price updated');
    setPriceOpen(false);
    onUpdate();
  };

  const handleDelete = async () => {
    // Check active orders
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, order:orders!inner(order_status)')
      .eq('product_id', product.id)
      .neq('order.order_status', 'delivered')
      .limit(1);

    if (orderItems && orderItems.length > 0) {
      toast.error('Product is part of active orders and cannot be deleted');
      setDeleteOpen(false);
      return;
    }

    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) { toast.error('Failed to delete product'); return; }
    toast.success('Product deleted');
    setDeleteOpen(false);
    onUpdate();
  };

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow">
        {/* Image */}
        <div className="h-16 w-16 rounded-md overflow-hidden border border-border/40 bg-muted shrink-0">
          <img
            src={getProductImageWithFallback(product.image_url, product.category)}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">{product.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0 h-4">{product.category}</Badge>
            <Badge variant={variant} className={cn('text-[10px] px-1.5 py-0 h-4', cls)}>
              {label}
            </Badge>
          </div>
          <p className="text-[12px] text-foreground font-medium">
            {formatPrice(product.price, product.base_currency || DEFAULT_CURRENCY)} / {product.unit}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {product.available_quantity} {product.unit} available
          </p>
        </div>

        {/* Vertical action buttons on mobile / horizontal on desktop */}
        <div className="flex flex-col md:flex-row gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/seller/products?edit=${product.id}`)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => { setNewQty(product.available_quantity.toString()); setStockOpen(true); }}
          >
            <Boxes className="h-3 w-3 mr-1" />
            Stock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => { setNewPrice(product.price.toString()); setPriceOpen(true); }}
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Price
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/seller/dashboard?tab=orders&product=${product.id}`)}
          >
            <ShoppingBag className="h-3 w-3 mr-1" />
            Orders
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Update Stock modal */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock — {product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border/40">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Current: <span className="font-medium text-foreground">{product.available_quantity} {product.unit}</span></span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-qty" className="text-sm font-normal">New Quantity ({product.unit})</Label>
              <Input
                id="new-qty"
                type="number"
                min="0"
                step="0.01"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStockOpen(false)} className="h-8 text-sm">Cancel</Button>
              <Button onClick={handleUpdateStock} disabled={saving} className="h-8 text-sm">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Price modal */}
      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Price — {product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border/40">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Current: <span className="font-medium text-foreground">{formatPrice(product.price, product.base_currency || DEFAULT_CURRENCY)} / {product.unit}</span></span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-price" className="text-sm font-normal">New Price (INR)</Label>
              <Input
                id="new-price"
                type="number"
                min="0.01"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPriceOpen(false)} className="h-8 text-sm">Cancel</Button>
              <Button onClick={handleUpdatePrice} disabled={saving} className="h-8 text-sm">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{product.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
