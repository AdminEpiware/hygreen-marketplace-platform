import { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore
import { supabase } from '@/db/supabase';

export interface SearchSuggestion {
  type: 'product' | 'store' | 'category';
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string | null;
  price?: number;
  currency?: string;
}

interface UseSearchOptions {
  debounceMs?: number;
  minChars?: number;
}

const RECENT_KEY = 'buyer_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const prev = getRecentSearches().filter((q) => q !== query);
    const next = [query, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // ignore
  }
}

// Static trending searches (can be replaced with a DB query)
const TRENDING_SEARCHES = [
  'Fresh vegetables',
  'Organic milk',
  'Whole wheat bread',
  'Seasonal fruits',
  'Daily groceries',
];

export function useSearch({ debounceMs = 300, minChars = 2 }: UseSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [trendingSearches] = useState<string[]>(TRENDING_SEARCHES);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  // Fetch suggestions when debouncedQuery changes
  useEffect(() => {
    if (debouncedQuery.trim().length < minChars) {
      setSuggestions([]);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const q = debouncedQuery.trim().toLowerCase();

    const fetch = async () => {
      setLoading(true);
      try {
        const results: SearchSuggestion[] = [];

        // Products: match on name or category
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, unit, category, image_url, base_currency')
          .or(`name.ilike.%${q}%,category.ilike.%${q}%`)
          .gt('available_quantity', 0)
          .order('name')
          .limit(4);

        (products || []).forEach((p: any) => {
          results.push({
            type: 'product',
            id: p.id,
            label: p.name,
            sublabel: `${p.base_currency || '₹'}${Number(p.price).toFixed(2)} / ${p.unit}`,
            imageUrl: p.image_url,
            price: p.price,
            currency: p.base_currency || '₹',
          });
        });

        // Stores: match store_name or full_name
        const { data: stores } = await supabase
          .from('profiles')
          .select('id, store_name, business_name, full_name, pay_later_enabled')
          .eq('role', 'seller')
          .or(`store_name.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(4);

        (stores || []).forEach((s: any) => {
          const name = s.store_name?.trim() || s.business_name?.trim() || s.full_name?.trim() || 'Store';
          results.push({
            type: 'store',
            id: s.id,
            label: name,
            sublabel: s.pay_later_enabled ? 'Pay Later available' : undefined,
          });
        });

        // Categories: deduplicate from products
        const { data: cats } = await supabase
          .from('products')
          .select('category')
          .ilike('category', `%${q}%`)
          .gt('available_quantity', 0);

        const uniqueCats = [...new Set((cats || []).map((c: any) => c.category as string))].slice(0, 3);
        uniqueCats.forEach((cat) => {
          results.push({
            type: 'category',
            id: `cat_${cat}`,
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            sublabel: 'Category',
          });
        });

        setSuggestions(results);
      } catch {
        // silently ignore aborts
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, [debouncedQuery, minChars]);

  const commitSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    saveRecentSearch(q.trim());
    setRecentSearches(getRecentSearches());
  }, []);

  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    recentSearches,
    trendingSearches,
    commitSearch,
    clearRecent,
  };
}
