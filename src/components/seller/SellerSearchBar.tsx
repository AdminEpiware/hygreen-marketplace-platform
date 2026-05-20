import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ScanLine, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
// @ts-ignore
import { supabase } from '@/db/supabase';

interface ProductResult {
  id: string;
  name: string;
  product_code?: string | null;
  sku?: string | null;
  category: string;
  available_quantity: number;
}

interface AlertItem {
  id: string;
  name: string;
  available_quantity: number;
}

type FilterId = 'low_stock' | 'out_of_stock' | 'recently_added' | 'best_selling';

const FILTER_CHIPS: { id: FilterId; label: string }[] = [
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'out_of_stock', label: 'Out of Stock' },
  { id: 'recently_added', label: 'Recently Added' },
  { id: 'best_selling', label: 'Best Selling' },
];

function stockLabel(qty: number) {
  if (qty === 0) return { text: 'Out of Stock', cls: 'text-destructive' };
  if (qty <= 10) return { text: 'Low Stock', cls: 'text-amber-600' };
  return { text: 'In Stock', cls: 'text-[#007600]' };
}

interface SellerSearchBarProps {
  sellerId: string;
  onFilterChange?: (filters: FilterId[]) => void;
  className?: string;
}

export function SellerSearchBar({ sellerId, onFilterChange, className }: SellerSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterId>>(new Set());
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch low-stock alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, available_quantity')
        .eq('seller_id', sellerId)
        .lte('available_quantity', 10)
        .order('available_quantity', { ascending: true })
        .limit(5);
      setAlerts(data || []);
    };
    void fetchAlerts();
  }, [sellerId]);

  // Instant search (no debounce)
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.trim().toLowerCase();
    setLoading(true);

    const run = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, product_code, sku, category, available_quantity, barcode')
          .eq('seller_id', sellerId)
          .or(
            `name.ilike.%${q}%,product_code.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%,barcode.ilike.%${q}%`
          )
          .order('name')
          .limit(10);
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [query, sellerId]);

  // Toggle filter
  const toggleFilter = useCallback((id: FilterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onFilterChange?.([...next]);
      return next;
    });
  }, [onFilterChange]);

  // Barcode scan via camera (uses jsQR if available, else prompt)
  const handleBarcodeScan = useCallback(() => {
    // Try to use device camera with a quick scan via <video>
    // Simplified: prompt for barcode value if no camera API available
    const code = prompt('Enter barcode value (camera scan coming soon):');
    if (!code) return;
    setQuery(code.trim());
    setScanMsg(`Scanned: ${code.trim()}`);
    setTimeout(() => setScanMsg(null), 3000);
    inputRef.current?.focus();
  }, []);

  const handleResultClick = (product: ProductResult) => {
    setFocused(false);
    navigate(`/seller/products?edit=${product.id}`);
  };

  const showDropdown = focused && (query.length > 0 || alerts.length > 0);

  return (
    <div ref={containerRef} className={cn('w-full relative', className)}>
      {/* ── Input row — pr-2 md:pr-8 reserves right margin, fills full width ── */}
      <div className="flex items-center gap-2 pr-2 md:pr-8">
        <div className={cn(
          'flex-1 flex items-center gap-2 h-11 px-4 rounded-lg border bg-background transition-colors',
          focused ? 'border-primary ring-1 ring-primary/20' : 'border-border'
        )}>
          {loading
            ? <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
            : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search product name, code, category..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Barcode scan */}
        <button
          type="button"
          onClick={handleBarcodeScan}
          className="flex items-center justify-center h-11 w-11 rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary transition-colors shrink-0"
          title="Barcode scan"
        >
          <ScanLine className="h-4 w-4" />
        </button>
      </div>

      {/* Scan feedback */}
      {scanMsg && (
        <p className="text-[11px] text-primary mt-1">{scanMsg}</p>
      )}

      {/* ── Filter chips — own row below search bar ───────────────────────── */}
      <div className="flex gap-2.5 mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {FILTER_CHIPS.map((chip) => {
          const active = activeFilters.has(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => toggleFilter(chip.id)}
              className={cn(
                'flex-none h-8 px-4 rounded-full text-[12.5px] font-medium border transition-colors whitespace-nowrap',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-[360px] overflow-y-auto">

          {/* Alerts (when no query) */}
          {query.length === 0 && alerts.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inventory Alerts</span>
              </div>
              {alerts.map((a) => {
                const { text, cls } = stockLabel(a.available_quantity);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { navigate(`/seller/products?edit=${a.id}`); setFocused(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                  >
                    <Package className="h-4 w-4 text-amber-500 flex-none" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground truncate">{a.name}</p>
                      <p className={cn('text-[11px] leading-none mt-0.5', cls)}>
                        {text} — {a.available_quantity} left
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search results */}
          {query.length > 0 && (
            <>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </div>
              )}
              {!loading && results.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No products found for "{query}"
                </div>
              )}
              {!loading && results.map((r) => {
                const { text, cls } = stockLabel(r.available_quantity);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleResultClick(r)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                  >
                    <Package className="h-4 w-4 text-muted-foreground flex-none" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground truncate">{r.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.product_code && (
                          <span className="text-[10px] text-muted-foreground">#{r.product_code}</span>
                        )}
                        {r.sku && (
                          <span className="text-[10px] text-muted-foreground">SKU: {r.sku}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground capitalize">{r.category}</span>
                        <span className={cn('text-[10px] font-medium', cls)}>{text}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
