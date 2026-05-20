import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, ExternalLink, Minus, Plus, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types/types';

interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (product: Product, quantity: number) => Promise<void>;
  sellerName?: string;
}

export function ProductQuickView({
  product,
  open,
  onOpenChange,
  onAddToCart,
  sellerName,
}: ProductQuickViewProps) {
  const { formatPrice } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  if (!product) return null;

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await onAddToCart(product, quantity);
      setQuantity(1); // Reset quantity after adding
    } finally {
      setAdding(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < product.available_quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuantity(1); // Reset quantity when closing
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-balance pr-8">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Image */}
          {product.image_url && (
            <div className="aspect-square w-full max-w-md mx-auto overflow-hidden rounded-lg bg-muted">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Product Info */}
          <div className="space-y-4">
            {/* Price and Category */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold">
                  {formatPrice(product.price)}
                </p>
                <p className="text-sm text-muted-foreground">
                  per {product.unit}
                </p>
              </div>
              {product.category && (
                <Badge variant="secondary" className="shrink-0">
                  {product.category}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Seller Info */}
            {sellerName && (
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <Link
                  to={`/store/${product.seller_id}`}
                  className="text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => handleOpenChange(false)}
                >
                  {sellerName}
                </Link>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Availability */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Available Quantity
              </span>
              <span className="text-sm font-medium">
                {product.available_quantity} {product.unit}
              </span>
            </div>

            <Separator />

            {/* Quantity Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold">Quantity</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="h-10 w-10 shrink-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-semibold">{quantity}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {product.unit}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incrementQuantity}
                  disabled={quantity >= product.available_quantity}
                  className="h-10 w-10 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {quantity >= product.available_quantity && (
                <p className="text-xs text-muted-foreground text-center">
                  Maximum available quantity reached
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleAddToCart}
                disabled={adding || product.available_quantity === 0}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {adding ? 'Adding...' : 'Add to Cart'}
              </Button>
              <Link
                to={`/product/${product.id}`}
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                <Button variant="outline" size="lg" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Button>
              </Link>
            </div>

            {/* Out of Stock Message */}
            {product.available_quantity === 0 && (
              <div className="text-center p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  This product is currently out of stock
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
