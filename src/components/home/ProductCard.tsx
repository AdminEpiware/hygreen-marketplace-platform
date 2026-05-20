import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Package, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Compute a simple "Get it as soon as Wed, Jun 4" delivery string */
function deliveryDate(): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
  sellerName?: string;
  brandName?: string | null;
  averageRating?: number;
  reviewCount?: number;
  currency?: string;
  /** Original price before discount — shows strikethrough + % badge when provided */
  originalPrice?: number;
  /** Stock quantity — used to derive In Stock / Low Stock / Out of Stock */
  stockQuantity?: number;
  isAdding?: boolean;
  isFavourited?: boolean;
  onAddToCart: () => void;
  onToggleFavourite?: () => void;
  className?: string;
  /** 'compact' shrinks the card for home-screen carousels (more items visible) */
  size?: 'default' | 'compact';
}

function StockBadge({ qty }: { qty?: number }) {
  if (qty === undefined) return null;
  if (qty === 0) return <span className="text-[11px] text-destructive font-medium">Out of Stock</span>;
  if (qty <= 10) return <span className="text-[11px] text-amber-600 font-medium">Only {qty} left in stock</span>;
  return <span className="text-[11px] text-[#007600] font-medium">In Stock</span>;
}

export function ProductCard({
  id,
  name,
  price,
  unit,
  imageUrl,
  sellerName,
  brandName,
  averageRating,
  reviewCount,
  currency = '₹',
  originalPrice,
  stockQuantity,
  isAdding = false,
  isFavourited = false,
  onAddToCart,
  onToggleFavourite,
  className,
  size = 'default',
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasRating = !!averageRating && !!reviewCount && reviewCount > 0;
  const isCompact = size === 'compact';

  const discountPct =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const eta = deliveryDate();

  return (
    <div
      className={cn(
        'group flex flex-col flex-none bg-card overflow-hidden',
        'border border-border/60 rounded-sm',
        'transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)]',
        isCompact ? 'w-[120px] md:w-[136px]' : 'w-44 md:w-48',
        className
      )}
    >
      {/* ── Product Image ─────────────────────────────────────────────── */}
      <Link to={`/product/${id}`} tabIndex={-1} className="block shrink-0">
        <div className={cn(
          'w-full overflow-hidden bg-[#f8f8f8] relative',
          isCompact ? 'h-[100px] md:h-[112px]' : 'aspect-square'
        )}>
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              onError={() => setImgError(true)}
              className={cn(
                'w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.04]',
                isCompact ? 'p-1.5' : 'p-2'
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className={cn(isCompact ? 'h-6 w-6' : 'h-8 w-8', 'text-muted-foreground/20')} />
            </div>
          )}

          {/* Discount badge */}
          {discountPct && (
            <span className="absolute top-1.5 left-1.5 bg-[#CC0C39] text-white text-[9px] font-semibold px-1 py-0.5 rounded-sm leading-none z-10">
              -{discountPct}%
            </span>
          )}

          {/* Seller / Brand overlay at bottom of image — default size only */}
          {!isCompact && (sellerName || brandName) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 pointer-events-none">
              {brandName && (
                <p className="text-[10px] text-white/90 font-semibold truncate leading-tight">{brandName}</p>
              )}
              {sellerName && (
                <p className="text-[9px] text-white/70 truncate leading-tight">by {sellerName}</p>
              )}
            </div>
          )}

          {/* Favourite button */}
          {onToggleFavourite && !isCompact && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavourite();
              }}
              className={cn(
                'absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full flex items-center justify-center',
                'bg-white/80 hover:bg-white transition-colors shadow-sm'
              )}
              aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Heart className={cn('h-3.5 w-3.5', isFavourited ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground')} />
            </button>
          )}
        </div>
      </Link>

      {/* ── Card Body ─────────────────────────────────────────────────── */}
      <div className={cn('flex flex-col flex-1 gap-1', isCompact ? 'p-1.5' : 'p-2.5')}>

        {/* Name */}
        <Link
          to={`/product/${id}`}
          className={cn(
            'leading-snug line-clamp-2 text-[#0F1111] hover:text-[#C7511F] transition-colors font-normal',
            isCompact ? 'text-[11px] min-h-[2.1rem]' : 'text-[12px] min-h-[2.4rem]'
          )}
        >
          {name}
        </Link>

        {/* Star Rating */}
        {hasRating && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  'shrink-0',
                  isCompact ? 'h-2 w-2' : 'h-2.5 w-2.5',
                  s <= Math.round(averageRating!)
                    ? 'fill-[#FF9900] text-[#FF9900]'
                    : 'fill-muted text-muted-foreground/20'
                )}
              />
            ))}
            {!isCompact && (
              <span className="text-[11px] text-[#007185] ml-0.5 leading-none">
                {averageRating!.toFixed(1)} ({reviewCount!.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-0.5 flex items-baseline gap-1 flex-wrap">
          <span className={cn('font-semibold text-[#0F1111] leading-none', isCompact ? 'text-[12px]' : 'text-sm')}>
            {currency}{price.toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none">/ {unit}</span>
          {!isCompact && originalPrice && originalPrice > price && (
            <span className="text-[10px] text-muted-foreground line-through leading-none">
              {currency}{originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock — default only */}
        {!isCompact && <StockBadge qty={stockQuantity} />}

        {/* Delivery — default only */}
        {!isCompact && (
          <p className="text-[10px] text-muted-foreground leading-snug">
            Get it as soon as{' '}
            <span className="font-medium text-[#0F1111]">{eta}</span>
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add to Cart */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCart();
          }}
          disabled={isAdding || stockQuantity === 0}
          className={cn(
            'w-full rounded-sm font-medium leading-none',
            'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111]',
            'border border-[#FCD200] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isCompact ? 'mt-1 py-1 text-[11px]' : 'mt-1.5 py-1.5 text-[12px]'
          )}
        >
          {isAdding ? 'Adding…' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

