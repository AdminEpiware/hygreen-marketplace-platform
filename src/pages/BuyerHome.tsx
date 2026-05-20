import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/home/ProductCard';
import { StoreSection } from '@/components/home/StoreSection';
import { StoreCarousel } from '@/components/home/StoreCarousel';
import { FrequentlyBoughtTogether, type FBTProduct } from '@/components/home/FrequentlyBoughtTogether';
import { Store, ShoppingCart, Package, RotateCcw } from 'lucide-react';
import { BuyerSearchBar } from '@/components/home/BuyerSearchBar';
import { toast } from 'sonner';
import { getStoreName } from '@/lib/store';
import type { Profile, Product } from '@/types/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Number of products fetched per page. Fetch PAGE_SIZE+1 to detect hasMore. */
const PAGE_SIZE = 16;

interface StoreWithProducts extends Profile {
  has_pay_later: boolean;
  top_products: Product[];
}

/** Per-store pagination metadata */
interface StorePagination {
  offset: number;      // products already loaded
  hasMore: boolean;    // more products available on server
  loadingMore: boolean; // fetch in progress
  loadError: boolean;  // last fetch errored
}

interface PopularProduct extends Product {
  order_count: number;
  seller_name: string;
}

interface RepeatProduct extends Product {
  last_ordered: string;
  order_count: number;
  seller_name: string;
}

// ─── Per-section skeleton ─────────────────────────────────────────────────────

function CarouselSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden pb-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-none w-[120px] md:w-[136px] space-y-1.5">
          <Skeleton className="h-[100px] md:h-[112px] w-full rounded-sm bg-muted" />
          <Skeleton className="h-2.5 w-3/4 rounded bg-muted" />
          <Skeleton className="h-2.5 w-1/2 rounded bg-muted" />
          <Skeleton className="h-6 w-full rounded-sm bg-muted mt-1" />
        </div>
      ))}
    </div>
  );
}

/** Horizontal section divider */
function SectionDivider() {
  return <div className="border-t border-border/60" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BuyerHome() {
  const { user, profile, currency, refreshCartCount, activeStore } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState<StoreWithProducts[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [repeatProducts, setRepeatProducts] = useState<RepeatProduct[]>([]);
  const [fbtProducts, setFbtProducts] = useState<FBTProduct[]>([]);
  const [addingFbt, setAddingFbt] = useState(false);

  // Independent loading states per section for progressive rendering
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingFbt, setLoadingFbt] = useState(true);

  // Per-store pagination metadata, keyed by store id
  const [storePagination, setStorePagination] = useState<Map<string, StorePagination>>(new Map());

  // Guards against concurrent loads for the same store
  const loadingStoreRef = useRef<Set<string>>(new Set());

  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());

  // Pay Later statuses per store for the logged-in buyer
  const [payLaterStatuses, setPayLaterStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});

  // ── Role redirect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile?.role === 'seller') navigate('/seller/dashboard');
    else if (profile?.role === 'admin') navigate('/admin/dashboard');
  }, [profile, navigate]);

  // ── Progressive data load ─────────────────────────────────────────────────
  useEffect(() => {
    void fetchPopularProducts();
    void fetchStoresWithProducts();
    void fetchFBTProducts();
    if (user) {
      void fetchRepeatProducts();
      void fetchPayLaterStatuses();
    } else {
      setLoadingRecent(false);
    }
  }, [user]);

  // ── Fetch: pay later statuses for all stores ──────────────────────────────
  const fetchPayLaterStatuses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('buyer_pay_later_requests')
        .select('store_id, status')
        .eq('buyer_id', user.id)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, 'pending' | 'approved' | 'rejected'> = {};
      for (const row of data ?? []) {
        if (row.store_id && !map[row.store_id]) {
          map[row.store_id] = row.status;
        }
      }
      setPayLaterStatuses(map);
    } catch (err) {
      console.error('Error fetching pay-later statuses:', err);
    }
  };

  // ── Fetch: frequently bought together ────────────────────────────────────
  const fetchFBTProducts = async () => {
    setLoadingFbt(true);
    try {
      let pairs: FBTProduct[] = [];

      if (user) {
        // Strategy: find products that appear in the same orders as other products
        const { data: orderItems } = await supabase
          .from('order_items')
          .select(`
            order_id, product_id,
            products!inner(id, name, price, unit, image_url, available_quantity),
            orders!inner(buyer_id)
          `)
          .eq('orders.buyer_id', user.id)
          .order('order_id', { ascending: false })
          .limit(200);

        if (orderItems && orderItems.length > 0) {
          // Group by order
          const byOrder = new Map<string, any[]>();
          for (const item of orderItems as any[]) {
            if (!item.products?.id) continue;
            const bucket = byOrder.get(item.order_id) ?? [];
            bucket.push(item.products);
            byOrder.set(item.order_id, bucket);
          }
          // Find most frequent co-purchase pair
          const pairCount = new Map<string, { products: FBTProduct[]; count: number }>();
          for (const products of byOrder.values()) {
            if (products.length < 2) continue;
            // Take first 2 distinct products in the order
            const [a, b] = products.slice(0, 2);
            const key = [a.id, b.id].sort().join('|');
            const entry = pairCount.get(key);
            if (entry) {
              entry.count++;
            } else {
              pairCount.set(key, {
                products: [
                  { id: a.id, name: a.name, price: a.price, unit: a.unit, imageUrl: a.image_url },
                  { id: b.id, name: b.name, price: b.price, unit: b.unit, imageUrl: b.image_url },
                ],
                count: 1,
              });
            }
          }
          if (pairCount.size > 0) {
            const best = Array.from(pairCount.values()).sort((a, b) => b.count - a.count)[0];
            pairs = best.products;
          }
        }
      }

      // Fallback: use top 2 globally most-ordered products
      if (pairs.length < 2) {
        const { data: topItems } = await supabase
          .from('order_items')
          .select(`
            product_id,
            products!inner(id, name, price, unit, image_url, available_quantity)
          `)
          .limit(300);

        if (topItems && topItems.length > 0) {
          const counts = new Map<string, { product: FBTProduct; count: number }>();
          for (const item of topItems as any[]) {
            const p = item.products;
            if (!p?.id) continue;
            const entry = counts.get(p.id);
            if (entry) { entry.count++; }
            else {
              counts.set(p.id, {
                product: { id: p.id, name: p.name, price: p.price, unit: p.unit, imageUrl: p.image_url },
                count: 1,
              });
            }
          }
          pairs = Array.from(counts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map((e) => e.product);
        }
      }

      setFbtProducts(pairs.length >= 2 ? pairs : []);
    } catch (err) {
      console.error('FBT fetch error:', err);
      setFbtProducts([]);
    } finally {
      setLoadingFbt(false);
    }
  };

  // ── Fetch: most-bought products (global) ──────────────────────────────────
  const fetchPopularProducts = async () => {
    setLoadingPopular(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_id,
          products!inner(
            id, name, price, unit, category, image_url, available_quantity,
            seller_id, average_rating, review_count,
            seller:profiles!products_seller_id_fkey(store_name, full_name)
          )
        `);

      if (error) throw error;

      const productCounts = new Map<string, { product: any; count: number }>();
      (data as any[])?.forEach((item) => {
        const p = item.products;
        if (!p?.id) return;
        const existing = productCounts.get(p.id);
        if (existing) {
          existing.count++;
        } else {
          productCounts.set(p.id, {
            product: {
              ...p,
              seller_name: getStoreName(p.seller),
            },
            count: 1,
          });
        }
      });

      const popular = Array.from(productCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, PAGE_SIZE)
        .map((item) => ({ ...item.product, order_count: item.count }));

      setPopularProducts(popular);
    } catch (error) {
      console.error('Error fetching popular products:', error);
    } finally {
      setLoadingPopular(false);
    }
  };

  // ── Fetch: recently bought by current user ────────────────────────────────
  const fetchRepeatProducts = async () => {
    if (!user) return;
    setLoadingRecent(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_id, created_at,
          products!inner(
            id, name, price, unit, category, image_url, available_quantity,
            seller_id, average_rating, review_count,
            seller:profiles!products_seller_id_fkey(store_name, full_name)
          ),
          orders!inner(buyer_id)
        `)
        .eq('orders.buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const productMap = new Map<string, { product: any; count: number; lastOrdered: string }>();
      (data as any[])?.forEach((item) => {
        const p = item.products;
        if (!p?.id) return;
        const existing = productMap.get(p.id);
        if (existing) {
          existing.count++;
          if (new Date(item.created_at) > new Date(existing.lastOrdered)) {
            existing.lastOrdered = item.created_at;
          }
        } else {
          productMap.set(p.id, {
            product: {
              ...p,
              seller_name: getStoreName(p.seller),
            },
            count: 1,
            lastOrdered: item.created_at,
          });
        }
      });

      const repeat = Array.from(productMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, PAGE_SIZE)
        .map((item) => ({
          ...item.product,
          order_count: item.count,
          last_ordered: item.lastOrdered,
        }));

      setRepeatProducts(repeat);
    } catch (error) {
      console.error('Error fetching repeat products:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  // ── Fetch: stores + their first page of products ──────────────────────────
  const fetchStoresWithProducts = async () => {
    setLoadingStores(true);
    try {
      const { data: sellers, error: sellersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'seller')
        .order('store_name', { nullsFirst: false });

      if (sellersError) throw sellersError;
      if (!sellers?.length) { setStores([]); return; }

      const storesWithProducts = await Promise.all(
        sellers.map(async (seller: Profile) => {
          // Fetch PAGE_SIZE+1 to detect whether more pages exist
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('seller_id', seller.id)
            .gt('available_quantity', 0)
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE + 1);

          if (productsError) {
            console.error('Error fetching products for seller:', seller.id, productsError);
          }

          const raw = (products as Product[]) || [];
          const hasMore = raw.length > PAGE_SIZE;
          const page = hasMore ? raw.slice(0, PAGE_SIZE) : raw;

          return {
            store: {
              ...seller,
              has_pay_later: (seller as any).pay_later_enabled || false,
              top_products: page,
            },
            pagination: {
              offset: page.length,
              hasMore,
              loadingMore: false,
              loadError: false,
            },
          };
        })
      );

      // Show ALL seller stores — even those with no products yet
      setStores(storesWithProducts.map((s) => s.store));

      const paginationMap = new Map<string, StorePagination>();
      storesWithProducts.forEach(({ store, pagination }) => {
        paginationMap.set(store.id, pagination);
      });
      setStorePagination(paginationMap);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoadingStores(false);
    }
  };

  // ── Load more products for a specific store ───────────────────────────────
  const loadMoreStoreProducts = useCallback(async (storeId: string) => {
    // Guard: prevent concurrent fetches for the same store
    if (loadingStoreRef.current.has(storeId)) return;

    const pagination = storePagination.get(storeId);
    if (!pagination || !pagination.hasMore || pagination.loadingMore) return;

    loadingStoreRef.current.add(storeId);

    // Set loadingMore = true
    setStorePagination((prev) => {
      const next = new Map(prev);
      const current = next.get(storeId);
      if (current) next.set(storeId, { ...current, loadingMore: true, loadError: false });
      return next;
    });

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', storeId)
        .gt('available_quantity', 0)
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + PAGE_SIZE); // inclusive range

      if (error) throw error;

      const raw = (data as Product[]) || [];
      // range() returns up to PAGE_SIZE+1 items; check for more
      const hasMore = raw.length > PAGE_SIZE;
      const newProducts = hasMore ? raw.slice(0, PAGE_SIZE) : raw;

      // Deduplicate by id against existing products
      setStores((prev) =>
        prev.map((store) => {
          if (store.id !== storeId) return store;
          const existingIds = new Set(store.top_products.map((p) => p.id));
          const unique = newProducts.filter((p) => !existingIds.has(p.id));
          return { ...store, top_products: [...store.top_products, ...unique] };
        })
      );

      setStorePagination((prev) => {
        const next = new Map(prev);
        const current = next.get(storeId);
        if (current) {
          next.set(storeId, {
            offset: current.offset + newProducts.length,
            hasMore,
            loadingMore: false,
            loadError: false,
          });
        }
        return next;
      });
    } catch (error) {
      console.error(`Error loading more products for store ${storeId}:`, error);
      setStorePagination((prev) => {
        const next = new Map(prev);
        const current = next.get(storeId);
        if (current) next.set(storeId, { ...current, loadingMore: false, loadError: true });
        return next;
      });
    } finally {
      loadingStoreRef.current.delete(storeId);
    }
  }, [storePagination]);

  // ── Add to cart ──────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    async (product: Product) => {
      if (!user) {
        toast.error('Please sign in to add items to cart');
        navigate('/login');
        return;
      }
      if (profile?.role !== 'buyer') {
        toast.error('Only buyers can add items to cart');
        return;
      }

      setAddingToCart((prev) => new Set(prev).add(product.id));

      try {
        let existingQuery = supabase
          .from('cart')
          .select('id, quantity')
          .eq('buyer_id', user.id)
          .eq('product_id', product.id)
          .eq('seller_id', product.seller_id);

        if (activeStore) existingQuery = existingQuery.eq('buyer_store_id', activeStore.id);

        const { data: existingItem } = await existingQuery.maybeSingle();

        if (existingItem) {
          const { error } = await supabase
            .from('cart')
            .update({ quantity: existingItem.quantity + 1 })
            .eq('id', existingItem.id);
          if (error) throw error;
        } else {
          const cartItem: Record<string, unknown> = {
            buyer_id: user.id,
            product_id: product.id,
            seller_id: product.seller_id,
            quantity: 1,
          };
          if (activeStore) cartItem.buyer_store_id = activeStore.id;
          const { error } = await supabase.from('cart').insert(cartItem);
          if (error) throw error;
        }

        await refreshCartCount();
        toast.success(`${product.name} added to cart`);
      } catch (error) {
        console.error('Error adding to cart:', error);
        toast.error('Failed to add to cart');
      } finally {
        setAddingToCart((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }
    },
    [user, profile, activeStore, navigate, refreshCartCount]
  );

  // ── Reorder: add with last-ordered quantity ──────────────────────────────
  const handleReorder = useCallback(
    async (product: RepeatProduct) => {
      if (!user) { toast.error('Please sign in to reorder'); navigate('/login'); return; }
      if (profile?.role !== 'buyer') { toast.error('Only buyers can add items to cart'); return; }

      setAddingToCart((prev) => new Set(prev).add(product.id));
      const qty = Math.max(1, product.order_count ?? 1);
      try {
        let existingQuery = supabase
          .from('cart')
          .select('id, quantity')
          .eq('buyer_id', user.id)
          .eq('product_id', product.id)
          .eq('seller_id', product.seller_id);
        if (activeStore) existingQuery = existingQuery.eq('buyer_store_id', activeStore.id);
        const { data: existingItem } = await existingQuery.maybeSingle();

        if (existingItem) {
          await supabase.from('cart').update({ quantity: existingItem.quantity + qty }).eq('id', existingItem.id);
        } else {
          const cartItem: Record<string, unknown> = {
            buyer_id: user.id,
            product_id: product.id,
            seller_id: product.seller_id,
            quantity: qty,
          };
          if (activeStore) cartItem.buyer_store_id = activeStore.id;
          await supabase.from('cart').insert(cartItem);
        }
        await refreshCartCount();
        toast.success(`${product.name} added to cart`);
      } catch (err) {
        console.error('Reorder error:', err);
        toast.error('Failed to reorder');
      } finally {
        setAddingToCart((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
      }
    },
    [user, profile, activeStore, navigate, refreshCartCount]
  );
  const handleAddAllFBT = useCallback(
    async (selectedIds: string[]) => {
      if (!user) { toast.error('Please sign in to add items to cart'); navigate('/login'); return; }
      if (profile?.role !== 'buyer') { toast.error('Only buyers can add items to cart'); return; }
      setAddingFbt(true);
      const products = fbtProducts.filter((p) => selectedIds.includes(p.id));
      let added = 0;
      for (const p of products) {
        try {
          // Re-use handleAddToCart logic via supabase directly
          let q = supabase.from('cart').select('id, quantity')
            .eq('buyer_id', user.id).eq('product_id', p.id);
          if (activeStore) q = q.eq('buyer_store_id', activeStore.id);
          const { data: existing } = await q.maybeSingle();
          if (existing) {
            await supabase.from('cart').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
          } else {
            const item: Record<string, unknown> = { buyer_id: user.id, product_id: p.id, quantity: 1 };
            if (activeStore) item.buyer_store_id = activeStore.id;
            await supabase.from('cart').insert(item);
          }
          added++;
        } catch {
          // swallow per-item errors; we'll report summary
        }
      }
      await refreshCartCount();
      if (added === products.length) toast.success(`${added} item${added > 1 ? 's' : ''} added to cart`);
      else toast.error('Some items could not be added');
      setAddingFbt(false);
    },
    [user, profile, activeStore, fbtProducts, navigate, refreshCartCount]
  );

  // Currency symbol only (strip "0.00")
  const sym = `${currency}`.replace(/[\d.,]/g, '') || currency;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      {/* ── Sticky search bar — exact offset matches header fixed height ─────
          Mobile header h-[192px]  → top-[192px]
          Desktop header h-[248px] → top-[248px]                            */}
      <div className="sticky top-[192px] md:top-[248px] z-40 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="container max-w-screen-xl px-4 md:px-6 py-5 md:py-6 relative">
          <BuyerSearchBar />
        </div>
      </div>
      <main className="bg-background min-h-screen">

        {/* ── Page content wrapper ──────────────────────────────────────────── */}
        <div className="container max-w-screen-xl px-4 md:px-6">

        {/* ── 0. Stores List ────────────────────────────────────────────────── */}
        <div className="py-6 md:py-8">
          <h2 className="text-[18px] font-semibold text-[#0F1111] mb-4 text-balance">Stores</h2>
          {loadingStores ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-none w-36 space-y-2">
                  <Skeleton className="h-16 w-16 rounded-full bg-muted mx-auto" />
                  <Skeleton className="h-3 w-24 rounded bg-muted mx-auto" />
                  <Skeleton className="h-2.5 w-16 rounded bg-muted mx-auto" />
                </div>
              ))}
            </div>
          ) : stores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stores available yet.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {stores.map((store) => {
                const name = getStoreName(store as any);
                const initial = name.charAt(0).toUpperCase();
                const productCount = store.top_products.length;
                const pagination = storePagination.get(store.id);
                const hasMore = pagination?.hasMore ?? false;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`store-section-${store.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex-none flex flex-col items-center gap-2 w-28 py-3 px-2 rounded-xl border border-border/60 bg-background hover:border-[#007185]/50 hover:bg-[#007185]/5 transition-colors group text-center"
                  >
                    {/* Avatar */}
                    <span className="flex items-center justify-center h-14 w-14 rounded-full bg-[#007185]/10 text-[#007185] text-xl font-semibold group-hover:bg-[#007185]/20 transition-colors shrink-0 border border-[#007185]/20">
                      {initial}
                    </span>
                    {/* Store name */}
                    <span className="text-[13px] text-[#0F1111] font-medium leading-snug line-clamp-2 group-hover:text-[#007185] transition-colors w-full">
                      {name}
                    </span>
                    {/* Product count */}
                    <span className="text-[11px] text-muted-foreground leading-none">
                      {productCount === 0
                        ? 'No products'
                        : hasMore
                          ? `${productCount}+ products`
                          : `${productCount} product${productCount !== 1 ? 's' : ''}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <SectionDivider />

        {/* ── 1. Frequently Bought Together ─────────────────────────────────── */}
          {(loadingFbt || fbtProducts.length >= 2) && (
            <>
              <div className="py-6 md:py-8">
                <FrequentlyBoughtTogether
                  products={fbtProducts}
                  loading={loadingFbt}
                  currency={sym}
                  onAddAll={handleAddAllFBT}
                  isAdding={addingFbt}
                />
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── 2. Most Bought Products ─────────────────────────────────────────── */}
          {(loadingPopular || popularProducts.length > 0) && (
            <>
              <div className="py-6 md:py-8 space-y-4 opacity-0 intersect:opacity-100 transition duration-700">
                <h2 className="text-[18px] font-semibold text-[#0F1111] text-balance">
                  Most Bought Products
                </h2>
                {loadingPopular ? (
                  <CarouselSkeleton />
                ) : (
                  <StoreCarousel>
                    {popularProducts.map((product) => (
                      <div key={product.id} className="snap-start">
                        <ProductCard
                          id={product.id}
                          name={product.name}
                          price={product.price}
                          unit={product.unit}
                          imageUrl={product.image_url}
                          sellerName={product.seller_name}
                          brandName={product.brand_name}
                          averageRating={product.average_rating}
                          reviewCount={product.review_count}
                          currency={sym}
                          isAdding={addingToCart.has(product.id)}
                          onAddToCart={() => handleAddToCart(product)}
                          size="compact"
                        />
                      </div>
                    ))}
                  </StoreCarousel>
                )}
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── 3. Recently Bought by You ────────────────────────────────────────── */}
          {user && (loadingRecent || repeatProducts.length > 0) && (
            <>
              <div className="py-6 md:py-8 space-y-4 opacity-0 intersect:opacity-100 transition duration-700">
                <h2 className="text-[18px] font-semibold text-[#0F1111] text-balance">
                  Recently Bought by You
                </h2>
                {loadingRecent ? (
                  <CarouselSkeleton />
                ) : (
                  <StoreCarousel>
                    {repeatProducts.map((product) => (
                      <div key={product.id} className="snap-start flex flex-col gap-1.5">
                        <ProductCard
                          id={product.id}
                          name={product.name}
                          price={product.price}
                          unit={product.unit}
                          imageUrl={product.image_url}
                          sellerName={product.seller_name}
                          brandName={product.brand_name}
                          averageRating={product.average_rating}
                          reviewCount={product.review_count}
                          currency={sym}
                          isAdding={addingToCart.has(product.id)}
                          onAddToCart={() => handleAddToCart(product)}
                          size="compact"
                        />
                        {/* Last purchased date */}
                        {product.last_ordered && (
                          <p className="text-[10px] text-muted-foreground text-center leading-none px-1 truncate">
                            Last bought {new Date(product.last_ordered).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                        {/* Reorder button */}
                        <button
                          type="button"
                          onClick={() => handleReorder(product)}
                          disabled={addingToCart.has(product.id)}
                          className="flex items-center justify-center gap-1 w-full rounded-sm border border-[#007185] text-[#007185] hover:bg-[#007185]/8 text-[11px] font-medium py-1 transition-colors disabled:opacity-50"
                          style={{ width: '120px' }}
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          Reorder
                        </button>
                      </div>
                    ))}
                  </StoreCarousel>
                )}
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── 4. Shop by Store ──────────────────────────────────────────────── */}
          {loadingStores ? (
            <div className="py-6 md:py-8 space-y-8">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-5 w-40 rounded bg-muted" />
                  <CarouselSkeleton />
                </div>
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center opacity-0 intersect:opacity-100 transition duration-700">
              <div className="h-14 w-14 rounded-sm bg-muted/40 flex items-center justify-center">
                <Store className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">No stores yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back soon — stores will appear here once sellers are active.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 opacity-0 intersect:opacity-100 transition duration-700">
              {stores.map((store, idx) => {
                const pagination = storePagination.get(store.id);
                return (
                  <div key={store.id} id={`store-section-${store.id}`}>
                    {idx > 0 && <SectionDivider />}
                    <div className="py-5 md:py-6">
                      <StoreSection
                        storeId={store.id}
                        storeName={getStoreName(store as any)}
                        storeAddress={(store as any).business_address || undefined}
                        hasPayLater={store.has_pay_later}
                        payLaterStatus={payLaterStatuses[store.id] ?? null}
                        hasMore={pagination?.hasMore ?? false}
                        isLoadingMore={pagination?.loadingMore ?? false}
                        loadError={pagination?.loadError ?? false}
                        onLoadMore={() => void loadMoreStoreProducts(store.id)}
                      >
                        {store.top_products.length === 0 ? (
                          <div className="flex flex-col items-center justify-center w-44 py-10 gap-2 text-center text-muted-foreground">
                            <Package className="h-6 w-6 opacity-30" />
                            <span className="text-xs">No products yet</span>
                          </div>
                        ) : (
                          store.top_products.map((product) => (
                            <div key={product.id} className="snap-start">
                              <ProductCard
                                id={product.id}
                                name={product.name}
                                price={product.price}
                                unit={product.unit}
                                imageUrl={product.image_url}
                                brandName={product.brand_name}
                                averageRating={product.average_rating}
                                reviewCount={product.review_count}
                                currency={sym}
                                isAdding={addingToCart.has(product.id)}
                                onAddToCart={() => handleAddToCart(product)}
                                size="compact"
                              />
                            </div>
                          ))
                        )}
                      </StoreSection>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Guest sign-in nudge ──────────────────────────────────────────── */}
          {!user && (
            <>
              <SectionDivider />
              <div className="py-12 flex flex-col items-center gap-3 text-center opacity-0 intersect:opacity-100 transition duration-700">
                <div className="h-10 w-10 rounded-sm bg-muted/40 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[#0F1111]">Sign in for a personalised experience</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    See your purchase history and get reorder suggestions tailored for you.
                  </p>
                </div>
                <Button size="sm" asChild
                  className="h-8 text-xs px-5 rounded-sm bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200]"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </>
          )}

        </div>
      </main>
    </>
  );
}

