import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FBTProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
  currency?: string;
}

interface FrequentlyBoughtTogetherProps {
  products: FBTProduct[];
  loading?: boolean;
  currency?: string;
  onAddAll: (selectedIds: string[]) => void;
  isAdding?: boolean;
}

// ── Mini product tile ─────────────────────────────────────────────────────────

function FBTTile({
  product,
  checked,
  currency,
  onToggle,
}: {
  product: FBTProduct;
  checked: boolean;
  currency: string;
  onToggle: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-start gap-1.5 w-[130px] md:w-[148px] shrink-0">
      {/* Image with checkbox */}
      <div className="relative w-full aspect-square rounded-sm border border-border/60 bg-[#f8f8f8] overflow-hidden">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-1.5"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground/20" />
          </div>
        )}
        {/* Checkbox overlay */}
        <label className="absolute top-1.5 left-1.5 flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="h-3.5 w-3.5 rounded-sm border-border accent-[#007185] cursor-pointer"
          />
        </label>
      </div>

      {/* Name + price */}
      <Link
        to={`/product/${product.id}`}
        className="text-[11px] leading-snug line-clamp-2 text-[#007185] hover:text-[#C7511F] transition-colors"
      >
        {product.name}
      </Link>
      <span className="text-[12px] font-semibold text-[#0F1111] leading-none">
        {currency}{product.price.toFixed(2)}
      </span>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function FBTSkeleton() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3">
          {i > 0 && <Plus className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
          <div className="flex flex-col gap-1.5 w-[130px] md:w-[148px]">
            <Skeleton className="aspect-square w-full rounded-sm bg-muted" />
            <Skeleton className="h-3 w-full rounded bg-muted" />
            <Skeleton className="h-3 w-2/3 rounded bg-muted" />
          </div>
        </div>
      ))}
      {/* Summary panel skeleton */}
      <div className="flex flex-col gap-2 ml-2 md:ml-4 min-w-[140px]">
        <Skeleton className="h-4 w-36 rounded bg-muted" />
        <Skeleton className="h-8 w-40 rounded-sm bg-muted" />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FrequentlyBoughtTogether({
  products,
  loading = false,
  currency = '₹',
  onAddAll,
  isAdding = false,
}: FrequentlyBoughtTogetherProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(products.map((p) => [p.id, true]))
  );

  // Sync when products change (e.g. after fetch)
  const toggleProduct = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectedIds = products.filter((p) => checked[p.id]).map((p) => p.id);
  const selectedProducts = products.filter((p) => checked[p.id]);
  const total = selectedProducts.reduce((acc, p) => acc + p.price, 0);
  const canAdd = selectedIds.length > 0 && !isAdding;

  // Nothing to show if fewer than 2 products
  if (!loading && products.length < 2) return null;

  return (
    <section className="space-y-4 py-1 opacity-0 intersect:opacity-100 transition duration-700">
      {/* Section title */}
      <h2 className="text-[18px] font-semibold text-[#0F1111] leading-tight">
        Frequently Bought Together
      </h2>

      {loading ? (
        <FBTSkeleton />
      ) : (
        <div className="flex flex-wrap items-start gap-3 md:gap-4">
          {/* Product tiles with + separators */}
          {products.map((product, idx) => (
            <div key={product.id} className="flex items-center gap-3">
              {idx > 0 && (
                <Plus className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-[40px]" />
              )}
              <FBTTile
                product={product}
                checked={!!checked[product.id]}
                currency={currency}
                onToggle={() => toggleProduct(product.id)}
              />
            </div>
          ))}

          {/* Summary panel */}
          <div
            className={cn(
              'flex flex-col justify-center gap-2.5 self-center',
              'border-l border-border/60 pl-4 ml-1',
              'min-w-[148px] md:min-w-[168px]'
            )}
          >
            <p className="text-[13px] text-[#0F1111] leading-snug">
              Total price:{' '}
              <span className="font-semibold">
                {currency}{total.toFixed(2)}
              </span>
            </p>
            {selectedIds.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Select at least one item
              </p>
            )}
            <button
              type="button"
              disabled={!canAdd}
              onClick={() => onAddAll(selectedIds)}
              className={cn(
                'w-full py-1.5 px-2 rounded-sm text-[12px] font-medium leading-none text-[#0F1111]',
                'bg-[#FFD814] hover:bg-[#F7CA00]',
                'border border-[#FCD200] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]',
                'transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isAdding
                ? 'Adding…'
                : selectedIds.length === products.length
                ? `Add both to Cart`
                : `Add ${selectedIds.length} to Cart`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
