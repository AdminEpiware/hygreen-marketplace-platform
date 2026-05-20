import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, X, Clock, TrendingUp, Package, Store, Tag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearch, type SearchSuggestion } from '@/hooks/useSearch';

// ── Minimal SpeechRecognition types (not in all TS libs) ──────────────────────
interface ISpeechRecognitionResult { readonly [index: number]: { readonly transcript: string }; }
interface ISpeechRecognitionResultList { readonly [index: number]: ISpeechRecognitionResult; }
interface ISpeechRecognitionEvent { readonly results: ISpeechRecognitionResultList; }
interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;

// ── Filter Chips ─────────────────────────────────────────────────────────────
// Each chip navigates immediately to the relevant page/URL when clicked.
//   nearby        → /stores                     (browse nearby stores)
//   lowest_price  → /products?sort=price_asc    (products sorted by price ↑)
//   fast_delivery → /products?filter=fast_delivery
//   top_rated     → /products?sort=rating_desc  (products sorted by rating ↓)
//   in_stock      → /products?filter=in_stock   (explicitly filtered to in-stock)
const FILTER_CHIPS = [
  { id: 'nearby',        label: 'Nearby Stores' },
  { id: 'lowest_price',  label: 'Lowest Price'  },
  { id: 'fast_delivery', label: 'Fast Delivery' },
  { id: 'top_rated',     label: 'Top Rated'     },
  { id: 'in_stock',      label: 'In Stock'      },
] as const;

type FilterId = typeof FILTER_CHIPS[number]['id'];

/** Returns the destination URL for a given filter chip. */
function chipDestination(id: FilterId, currentQuery: string): string {
  if (id === 'nearby') return '/stores';
  const params = new URLSearchParams();
  if (currentQuery.trim()) params.set('q', currentQuery.trim());
  if (id === 'lowest_price')  params.set('sort', 'price_asc');
  else if (id === 'top_rated') params.set('sort', 'rating_desc');
  else params.set('filter', id);          // fast_delivery | in_stock
  return `/products?${params.toString()}`;
}

// ── Suggestion Icon ───────────────────────────────────────────────────────────

function SuggestionIcon({ type, imageUrl }: { type: SearchSuggestion['type']; imageUrl?: string | null }) {
  if (type === 'product' && imageUrl) {
    return (
      <div className="h-8 w-8 rounded-sm overflow-hidden bg-muted flex-none border border-border/40">
        <img src={imageUrl} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
      </div>
    );
  }
  const Icon = type === 'store' ? Store : type === 'category' ? Tag : Package;
  return (
    <div className="h-8 w-8 rounded-sm bg-muted/60 flex items-center justify-center flex-none border border-border/40">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

// ── Grouped suggestion header ────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-1">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BuyerSearchBarProps {
  className?: string;
}

export function BuyerSearchBar({ className }: BuyerSearchBarProps) {
  const navigate = useNavigate();
  const { query, setQuery, suggestions, loading, recentSearches, trendingSearches, commitSearch, clearRecent } = useSearch();
  const [focused, setFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Voice search
  const startVoice = useCallback(() => {
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as SpeechRecognitionCtor | undefined;
    if (!SR) {
      alert('Voice search is not supported in this browser.');
      return;
    }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      inputRef.current?.focus();
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [setQuery]);

  // Navigate on suggestion click
  const handleSuggestionClick = (s: SearchSuggestion) => {
    commitSearch(s.label);
    setFocused(false);
    if (s.type === 'product') navigate(`/product/${s.id}`);
    else if (s.type === 'store') navigate(`/store/${s.id}`);
    else navigate(`/products?category=${s.label.toLowerCase()}`);
  };

  // Navigate on submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    commitSearch(query.trim());
    setFocused(false);
    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
    commitSearch(q);
    setFocused(false);
    navigate(`/products?q=${encodeURIComponent(q)}`);
  };

  // Each chip navigates immediately — no local toggle accumulation
  const handleFilterChipClick = (id: FilterId) => {
    setFocused(false);
    navigate(chipDestination(id, query));
  };

  // Group suggestions
  const productSugs = suggestions.filter((s) => s.type === 'product');
  const storeSugs = suggestions.filter((s) => s.type === 'store');
  const catSugs = suggestions.filter((s) => s.type === 'category');
  const hasSuggestions = suggestions.length > 0;
  const showDropdown = focused && (hasSuggestions || loading || query.length === 0);

  return (
    <div ref={containerRef} className={cn('w-full', className)}>

      {/* ── Row 1: Search input ─────────────────────────────────────────────
          pr-2 md:pr-8 reserves right-side padding so the input doesn't butt
          against the container edge. No max-w cap — fills the available width. */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 pr-2 md:pr-8"
      >
        {/* Input field — flex-1 fills all remaining width */}
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
            placeholder="Search products, stores, categories..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Voice search */}
        <button
          type="button"
          onClick={startVoice}
          className={cn(
            'flex items-center justify-center h-11 w-11 rounded-lg border transition-colors shrink-0',
            isListening
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-primary hover:border-primary'
          )}
          title="Voice search"
        >
          <Mic className={cn('h-4 w-4', isListening && 'animate-pulse')} />
        </button>

        {/* Submit */}
        <button
          type="submit"
          className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary hover:bg-primary/90 border border-primary shrink-0 transition-colors"
          title="Search"
        >
          <Search className="h-4 w-4 text-primary-foreground" />
        </button>
      </form>

      {/* ── Row 2: Filter chips — click navigates immediately ───────────────  */}
      <div
        className="flex items-center gap-2.5 mt-3 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleFilterChipClick(chip.id)}
            className="flex-none h-8 px-4 rounded-full text-[12.5px] font-medium border transition-colors whitespace-nowrap bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-[420px] overflow-y-auto">

          {/* No input → recent + trending */}
          {query.length === 0 && (
            <>
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Searches</span>
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleRecentClick(q)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors text-left"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground flex-none" />
                      <span className="text-[13px] text-foreground truncate">{q}</span>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <GroupHeader label="Trending Searches" />
                {trendingSearches.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleRecentClick(q)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors text-left"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-primary flex-none" />
                    <span className="text-[13px] text-foreground truncate">{q}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Has query → grouped suggestions */}
          {query.length >= 2 && (
            <>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </div>
              )}

              {!loading && suggestions.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No results found for "{query}"
                </div>
              )}

              {!loading && productSugs.length > 0 && (
                <div>
                  <GroupHeader label="Products" />
                  {productSugs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                    >
                      <SuggestionIcon type="product" imageUrl={s.imageUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-foreground leading-snug truncate">{s.label}</p>
                        {s.sublabel && <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{s.sublabel}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && storeSugs.length > 0 && (
                <div>
                  <GroupHeader label="Stores" />
                  {storeSugs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                    >
                      <SuggestionIcon type="store" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-foreground leading-snug truncate">{s.label}</p>
                        {s.sublabel && <p className="text-[11px] text-primary leading-none mt-0.5">{s.sublabel}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && catSugs.length > 0 && (
                <div>
                  <GroupHeader label="Categories" />
                  {catSugs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                    >
                      <SuggestionIcon type="category" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-foreground leading-snug truncate">{s.label}</p>
                        {s.sublabel && <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{s.sublabel}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
