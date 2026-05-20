import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Distance from the right edge (px) that triggers the onNearEnd callback */
const NEAR_END_THRESHOLD = 200;

interface StoreCarouselProps {
  children: ReactNode;
  className?: string;
  /**
   * Called when the user scrolls within NEAR_END_THRESHOLD pixels of the
   * right edge. Debounced so it fires at most once per continuous scroll
   * gesture. Will not re-fire until the callback prop reference changes.
   */
  onNearEnd?: () => void;
}

export function StoreCarousel({ children, className, onNearEnd }: StoreCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Dragging refs
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  // Debounce: prevent near-end from firing twice in the same scroll burst
  const nearEndFired = useRef(false);
  // Keep onNearEnd stable in the scroll handler
  const onNearEndRef = useRef(onNearEnd);
  useEffect(() => { onNearEndRef.current = onNearEnd; }, [onNearEnd]);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setCanScrollLeft(left);
    setCanScrollRight(right);

    // Near-end detection — fire once per approach
    if (onNearEndRef.current) {
      const distanceFromEnd = el.scrollWidth - el.scrollLeft - el.clientWidth;
      if (distanceFromEnd <= NEAR_END_THRESHOLD && !nearEndFired.current) {
        nearEndFired.current = true;
        onNearEndRef.current();
      } else if (distanceFromEnd > NEAR_END_THRESHOLD + 50) {
        // Reset so it can fire again if user scrolls away and comes back
        nearEndFired.current = false;
      }
    }
  }, []);

  // Update arrow states on mount + resize
  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows]);

  // Reset the debounce gate whenever new products are appended
  // (children change → new scrollWidth → near-end is no longer valid)
  useEffect(() => {
    nearEndFired.current = false;
    // Re-check arrows after children update
    updateArrows();
  }, [children, updateArrows]);

  const scrollByPage = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // ── Mouse drag ───────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStartX.current = e.pageX;
    scrollStartLeft.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing';
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.pageX - dragStartX.current;
    if (Math.abs(dx) > 4) hasDragged.current = true;
    scrollRef.current.scrollLeft = scrollStartLeft.current - dx;
  };

  const stopDrag = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  };

  // Prevent link-clicks from firing after a drag
  const onClickCapture = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged.current = false;
    }
  };

  return (
    <div className={cn('relative group/carousel', className)}>
      {/* Left Arrow */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => scrollByPage('left')}
        aria-label="Scroll left"
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 z-10',
          'h-8 w-8 rounded-full bg-background/90 border border-border/60 shadow-sm backdrop-blur-sm',
          'opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200',
          '-translate-x-3',
          !canScrollLeft && '!pointer-events-none !opacity-0'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Left fade edge */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-3 w-6 bg-gradient-to-r from-background to-transparent z-[1] pointer-events-none transition-opacity duration-200',
          !canScrollLeft && 'opacity-0'
        )}
      />

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onClickCapture={onClickCapture}
        className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory select-none cursor-grab"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Leading spacer for fade */}
        <div className="shrink-0 w-0" />
        {children}
        {/* Trailing spacer */}
        <div className="shrink-0 w-2" />
      </div>

      {/* Right fade edge */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-background to-transparent z-[1] pointer-events-none transition-opacity duration-200',
          !canScrollRight && 'opacity-0'
        )}
      />

      {/* Right Arrow */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => scrollByPage('right')}
        aria-label="Scroll right"
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 z-10',
          'h-8 w-8 rounded-full bg-background/90 border border-border/60 shadow-sm backdrop-blur-sm',
          'opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200',
          'translate-x-3',
          !canScrollRight && '!pointer-events-none !opacity-0'
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
