import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, RotateCcw, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PayLaterCrown } from '@/components/common/PayLaterCrown';
import { StoreCarousel } from './StoreCarousel';

// ── Inline skeleton cards shown at end of carousel while loading more ─────────

function LoadMoreSkeletons() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`skel-${i}`} className="flex-none w-[120px] md:w-[136px] space-y-1.5 snap-start">
          <Skeleton className="h-[100px] md:h-[112px] w-full rounded-sm bg-muted" />
          <Skeleton className="h-2.5 w-3/4 rounded bg-muted" />
          <Skeleton className="h-2.5 w-1/2 rounded bg-muted" />
          <Skeleton className="h-6 w-full rounded-sm bg-muted mt-1" />
        </div>
      ))}
    </>
  );
}

// ── Inline error card shown at end of carousel on load failure ────────────────

function LoadErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-none w-40 flex flex-col items-center justify-center gap-2 px-3 py-6 rounded-xl border border-border/50 bg-muted/10 text-center snap-start">
      <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
      <p className="text-[11px] text-muted-foreground leading-snug">
        Failed to load more products
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground px-2"
      >
        <RotateCcw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoreSectionProps {
  storeId: string;
  storeName: string;
  storeAddress?: string | null;
  hasPayLater?: boolean;
  /** The buyer's current Pay Later status for this store, or null if not requested */
  payLaterStatus?: 'pending' | 'approved' | 'rejected' | null;
  bannerUrl?: string | null;
  children: ReactNode;
  /** True if there are more products to load from the server */
  hasMore?: boolean;
  /** True while the next page is being fetched */
  isLoadingMore?: boolean;
  /** True if the last page fetch returned an error */
  loadError?: boolean;
  /** Called when the user requests the next page (button click or scroll near end) */
  onLoadMore?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StoreSection({
  storeId,
  storeName,
  storeAddress,
  hasPayLater = false,
  payLaterStatus = null,
  bannerUrl,
  children,
  hasMore = false,
  isLoadingMore = false,
  loadError = false,
  onLoadMore,
}: StoreSectionProps) {
  // Near-end handler: only forward to onLoadMore when appropriate
  const handleNearEnd = onLoadMore && hasMore && !isLoadingMore && !loadError
    ? onLoadMore
    : undefined;

  return (
    <section className="space-y-3 py-1">
      {/* ── Banner ── */}
      {bannerUrl ? (
        <div className="w-full h-20 md:h-28 overflow-hidden rounded-lg bg-muted/30">
          <img
            src={bannerUrl}
            alt={`${storeName} banner`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {/* Store name + Pay Later crown + inline Pay Later action */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/store/${storeId}`}
                className="text-[18px] font-semibold text-[#0F1111] hover:text-[#007185] transition-colors line-clamp-1 leading-snug"
              >
                {storeName}
              </Link>
              {hasPayLater && <PayLaterCrown />}
            </div>

            {/* Inline Pay Later status / request button — only when store supports it */}
            {hasPayLater && (
              <div className="flex items-center" onClick={e => e.stopPropagation()}>
                {payLaterStatus === 'approved' ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[11px] font-normal py-0.5 px-2 text-green-700 bg-green-50 border border-green-200 rounded-full"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Pay Later Active
                  </Badge>
                ) : payLaterStatus === 'pending' ? (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[11px] font-normal py-0.5 px-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-full"
                  >
                    <Clock className="h-3 w-3" />
                    Request Pending
                  </Badge>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-normal text-[#007185] hover:text-[#C7511F] hover:bg-transparent gap-1 p-0"
                  >
                    <Link to={`/buyer/pay-later-request/${storeId}`}>
                      <CreditCard className="h-3 w-3" />
                      Request Pay Later
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {storeAddress && (
            <span className="text-[11px] text-muted-foreground truncate leading-none hidden sm:inline mt-1.5 shrink-0">
              · {storeAddress}
            </span>
          )}
        </div>

        {/* ── Action button: View All / Loading / Visit Store ── */}
        {isLoadingMore ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs h-7 px-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </span>
        ) : hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            className="shrink-0 text-[12px] text-[#007185] hover:text-[#C7511F] transition-colors underline-offset-1 hover:underline"
          >
            See all
          </button>
        ) : (
          <Link
            to={`/store/${storeId}`}
            className="shrink-0 text-[12px] text-[#007185] hover:text-[#C7511F] transition-colors underline-offset-1 hover:underline"
          >
            See all
          </Link>
        )}
      </div>

      {/* ── Product carousel ── */}
      <StoreCarousel onNearEnd={handleNearEnd}>
        {children}
        {/* Inline skeleton cards appended at carousel end while loading more */}
        {isLoadingMore && <LoadMoreSkeletons />}
        {/* Inline error card if load failed */}
        {loadError && !isLoadingMore && onLoadMore && (
          <LoadErrorCard onRetry={onLoadMore} />
        )}
      </StoreCarousel>

      {/* ── Divider ── */}
      <div className="border-b border-border/40 mt-1" />
    </section>
  );
}
