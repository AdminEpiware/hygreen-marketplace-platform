import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { PayLaterCrown } from '@/components/common/PayLaterCrown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewItem } from '@/components/common/ReviewItem';
import { OrderTracking } from '@/components/buyer/OrderTracking';
import { BuyerOrderCard } from '@/components/buyer/BuyerOrderCard';
import { ProductQuickView } from '@/components/buyer/ProductQuickView';
import { Package, Clock, DollarSign, Home, TrendingUp, RefreshCw, ShoppingCart, Store as StoreIcon, Eye, CreditCard, CheckCircle2, Calendar, XCircle, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getStoreName } from '@/lib/store';
import type { OrderWithItems, Profile, ReviewWithResponse, Product } from '@/types/types';

interface StoreWithProducts {
  id: string;
  store_name?: string | null;
  business_name?: string | null;
  full_name?: string | null;
  pay_later_enabled: boolean;
  products: Product[];
}

/** Map of store_id → most recent pay-later request status for this buyer */
type PayLaterStatusMap = Record<string, 'pending' | 'approved' | 'rejected'>;

/** Full per-store Pay Later record for the My Pay Later tab */
interface StorePLRecord {
  store_id: string;
  store_name: string;
  pay_later_enabled: boolean;
  status: 'pending' | 'approved' | 'rejected' | null;
  payment_plan: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  /** Total amount of orders placed using Pay Later at this store */
  pay_later_order_total: number;
}

interface PopularProduct extends Product {
  order_count: number;
  seller_name: string;
}

interface RecentProduct extends Product {
  last_ordered: string;
  seller_name: string;
}

export default function BuyerDashboard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [reviews, setReviews] = useState<ReviewWithResponse[]>([]);
  const [stores, setStores] = useState<StoreWithProducts[]>([]);
  const [payLaterStatuses, setPayLaterStatuses] = useState<PayLaterStatusMap>({});
  const [payLaterRecords, setPayLaterRecords] = useState<StorePLRecord[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeLoading, setHomeLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewSellerName, setQuickViewSellerName] = useState<string>('');
  const { user, profile, formatPrice, refreshCartCount, activeStore } = useAuth();

  useEffect(() => {
    if (user && profile?.role === 'buyer') {
      fetchOrders();
      fetchReviews();
      fetchHomeData();
    }
  }, [user, profile]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        seller_profile:profiles!orders_seller_id_fkey(
          store_name,
          business_name,
          full_name
        )
      `)
      .eq('buyer_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, product:products(*), review_response:review_responses(*)')
      .eq('buyer_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch reviews:', error);
    } else {
      setReviews(data || []);
    }
  };

  const fetchHomeData = async () => {
    setHomeLoading(true);
    await Promise.all([
      fetchStoresWithProducts(),
      fetchPopularProducts(),
      fetchRecentProducts(),
      fetchPayLaterStatuses(),
    ]);
    setHomeLoading(false);
  };

  const fetchStoresWithProducts = async () => {
    try {
      // Fetch all sellers including pay_later_enabled flag
      const { data: sellers, error: sellersError } = await supabase
        .from('profiles')
        .select('id, store_name, business_name, full_name, pay_later_enabled')
        .eq('role', 'seller')
        .order('store_name');

      if (sellersError) throw sellersError;

      if (!sellers || sellers.length === 0) {
        setStores([]);
        return;
      }

      // Fetch top products for each seller
      const storesWithProducts = await Promise.all(
        sellers.map(async (seller) => {
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('seller_id', seller.id)
            .eq('is_available', true)
            .order('created_at', { ascending: false })
            .limit(10);

          if (productsError) {
            console.error('Error fetching products for seller:', seller.id, productsError);
          }

          return {
            ...seller,
            pay_later_enabled: seller.pay_later_enabled ?? false,
            products: products || [],
          };
        })
      );

      // Filter out stores with no products
      setStores(storesWithProducts.filter(store => store.products.length > 0));
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  /** Load this buyer's most recent pay-later request per store — populates both the
   *  status map (used in store cards) and the full records list (used in My Pay Later tab). */
  const fetchPayLaterStatuses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('buyer_pay_later_requests')
        .select('store_id, store_name, status, payment_plan, requested_at, reviewed_at, rejection_reason')
        .eq('buyer_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Keep only the most recent request per store
      const map: PayLaterStatusMap = {};
      const fullMap: Record<string, typeof data[0]> = {};
      (data || []).forEach((row) => {
        if (!map[row.store_id]) {
          map[row.store_id] = row.status;
          fullMap[row.store_id] = row;
        }
      });
      setPayLaterStatuses(map);

      // Fetch Pay Later order totals per store
      const { data: plOrders } = await supabase
        .from('orders')
        .select('seller_id, total_amount')
        .eq('buyer_id', user.id)
        .eq('payment_type', 'pay_later');

      const orderTotals: Record<string, number> = {};
      (plOrders || []).forEach((o) => {
        orderTotals[o.seller_id] = (orderTotals[o.seller_id] || 0) + o.total_amount;
      });

      // Build full records from stores that have Pay Later enabled
      // We'll refresh after fetchStoresWithProducts sets stores
      setPayLaterRecords(
        Object.values(fullMap).map((row) => ({
          store_id: row.store_id,
          store_name: row.store_name || 'Store',
          pay_later_enabled: true,
          status: row.status,
          payment_plan: row.payment_plan,
          requested_at: row.requested_at,
          reviewed_at: row.reviewed_at ?? null,
          rejection_reason: row.rejection_reason ?? null,
          pay_later_order_total: orderTotals[row.store_id] || 0,
        }))
      );
    } catch (error) {
      console.error('Error fetching pay-later statuses:', error);
    }
  };

  const fetchPopularProducts = async () => {
    try {
      // Get most ordered products across all users
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_id,
          products!inner(
            id,
            name,
            price,
            unit,
            category,
            image_url,
            is_available,
            seller_id,
            seller:profiles!products_seller_id_fkey(
              store_name,
              full_name
            )
          )
        `)
        .eq('products.is_available', true);

      if (error) throw error;

      // Count occurrences
      const productCounts = new Map<string, { product: any; count: number }>();

      data?.forEach((item: any) => {
        const product = item.products;
        if (product && product.id) {
          const existing = productCounts.get(product.id);
          if (existing) {
            existing.count++;
          } else {
            productCounts.set(product.id, {
              product: {
                ...product,
                seller_name: product.seller?.store_name || product.seller?.full_name || 'Unknown Store',
              },
              count: 1,
            });
          }
        }
      });

      // Sort and take top 10
      const popular = Array.from(productCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item) => ({
          ...item.product,
          order_count: item.count,
        }));

      setPopularProducts(popular);
    } catch (error) {
      console.error('Error fetching popular products:', error);
    }
  };

  const fetchRecentProducts = async () => {
    if (!user) return;

    try {
      // Get products from buyer's recent orders
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_id,
          created_at,
          products!inner(
            id,
            name,
            price,
            unit,
            category,
            image_url,
            is_available,
            seller_id,
            seller:profiles!products_seller_id_fkey(
              store_name,
              full_name
            )
          ),
          orders!inner(
            buyer_id
          )
        `)
        .eq('orders.buyer_id', user.id)
        .eq('products.is_available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique products with last order date
      const productMap = new Map<string, { product: any; lastOrdered: string }>();

      data?.forEach((item: any) => {
        const product = item.products;
        if (product && product.id) {
          const existing = productMap.get(product.id);
          if (!existing || new Date(item.created_at) > new Date(existing.lastOrdered)) {
            productMap.set(product.id, {
              product: {
                ...product,
                seller_name: product.seller?.store_name || product.seller?.full_name || 'Unknown Store',
              },
              lastOrdered: item.created_at,
            });
          }
        }
      });

      // Sort by most recent and take top 10
      const recent = Array.from(productMap.values())
        .sort((a, b) => new Date(b.lastOrdered).getTime() - new Date(a.lastOrdered).getTime())
        .slice(0, 10)
        .map((item) => ({
          ...item.product,
          last_ordered: item.lastOrdered,
        }));

      setRecentProducts(recent);
    } catch (error) {
      console.error('Error fetching recent products:', error);
    }
  };

  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    if (!user || profile?.role !== 'buyer') {
      toast.error('Please sign in as a buyer to add items to cart');
      return;
    }

    setAddingToCart((prev) => new Set(prev).add(product.id));

    try {
      // Build query to check existing item
      let existingQuery = supabase
        .from('cart')
        .select('id, quantity')
        .eq('buyer_id', user.id)
        .eq('product_id', product.id)
        .eq('seller_id', product.seller_id);

      // If activeStore exists, filter by buyer_store_id
      if (activeStore) {
        existingQuery = existingQuery.eq('buyer_store_id', activeStore.id);
      }

      const { data: existingItem } = await existingQuery.maybeSingle();

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Insert new item with buyer_store_id if available
        const cartItem: any = {
          buyer_id: user.id,
          product_id: product.id,
          seller_id: product.seller_id,
          quantity: quantity,
        };

        // Add buyer_store_id if activeStore exists
        if (activeStore) {
          cartItem.buyer_store_id = activeStore.id;
        }

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
  };

  const handleQuickView = (product: Product, sellerName: string) => {
    setQuickViewProduct(product);
    setQuickViewSellerName(sellerName);
    setQuickViewOpen(true);
  };

  const hasReview = (productId: string, orderId: string) => {
    return reviews.some(r => r.product_id === productId && r.order_id === orderId);
  };

  const pendingPayments = orders.filter(o => o.payment_status === 'pending');
  const completedOrders = orders.filter(o => o.order_status === 'delivered');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      placed: 'bg-blue-500',
      confirmed: 'bg-yellow-500',
      packed: 'bg-orange-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (!user || profile?.role !== 'buyer') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Please sign in as a buyer</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
            {profile.buyer_code && (
              <Badge variant="outline" className="font-mono">
                {profile.buyer_code}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/stores">
                  <Package className="h-4 w-4" />
                  Browse Stores
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-semibold">{orders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold">{pendingPayments.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-semibold">{completedOrders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-semibold">
                  {formatPrice(orders.reduce((sum, o) => sum + o.total_amount, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="home" className="space-y-4">
          <TabsList>
            <TabsTrigger value="home">
              <Home className="h-4 w-4 mr-2" />
              Home
            </TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
            <TabsTrigger value="pending">Pending Payments</TabsTrigger>
            <TabsTrigger value="paylater" className="gap-1.5">
              <Crown className="h-4 w-4" />
              My Pay Later
            </TabsTrigger>
            <TabsTrigger value="reviews">My Reviews</TabsTrigger>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home" className="space-y-8">
            {homeLoading ? (
              <div className="space-y-8">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Section 1: Store-wise Product Listing */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <StoreIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-semibold text-balance">Shop by Store</h2>
                  </div>

                  {stores.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <StoreIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No stores with products available</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {stores.map((store) => {
                        const plStatus = payLaterStatuses[store.id];
                        return (
                        <Card key={store.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <CardTitle className="text-lg text-balance">
                                <Link
                                  to={`/store/${store.id}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {getStoreName(store)}
                                </Link>
                              </CardTitle>
                              <div className="flex items-center gap-2 shrink-0">
                                <Link to={`/store/${store.id}`}>
                                  <Button variant="ghost" size="sm">
                                    View Store
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {store.products.slice(0, 6).map((product) => (
                                <div
                                  key={product.id}
                                  className="flex gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                                >
                                  {product.image_url && (
                                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <Link
                                      to={`/product/${product.id}`}
                                      className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                                    >
                                      {product.name}
                                    </Link>
                                    <p className="text-sm font-semibold mt-1">
                                      {formatPrice(product.price)}
                                      <span className="text-xs text-muted-foreground ml-1">
                                        / {product.unit}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleQuickView(product, getStoreName(store))}
                                      title="Quick View"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleAddToCart(product)}
                                      disabled={addingToCart.has(product.id)}
                                      title="Add to Cart"
                                    >
                                      <ShoppingCart className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* ── Per-store Pay Later section ── */}
                            {store.pay_later_enabled && (
                              <>
                                <Separator className="mt-4" />
                                <div className="mt-4 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    <span className="text-sm font-medium">Pay Later</span>
                                  </div>

                                  {plStatus === 'approved' ? (
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                        <div>
                                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                            Active — Pay Later enabled for this store
                                          </p>
                                          {payLaterRecords.find(r => r.store_id === store.id)?.payment_plan && (
                                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                              <Calendar className="h-3 w-3 inline mr-1" />
                                              {payLaterRecords.find(r => r.store_id === store.id)?.payment_plan} payment plan
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                                        <Link to={`/buyer/pay-later-request/${store.id}`}>
                                          <CreditCard className="h-3.5 w-3.5" />
                                          View Details
                                        </Link>
                                      </Button>
                                    </div>
                                  ) : plStatus === 'pending' ? (
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
                                        <div>
                                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                                            Request under review
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            The seller is reviewing your application
                                          </p>
                                        </div>
                                      </div>
                                      <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                                        <Link to={`/buyer/pay-later-request/${store.id}`}>
                                          <Eye className="h-3.5 w-3.5" />
                                          View Status
                                        </Link>
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          This store offers Pay Later — buy now, pay on your schedule.
                                        </p>
                                      </div>
                                      <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                                        <Link to={`/buyer/pay-later-request/${store.id}`}>
                                          <CreditCard className="h-3.5 w-3.5" />
                                          Request Pay Later
                                        </Link>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ); })}
                    </div>
                  )}
                </section>

                {/* Section 2: Most People Bought */}
                {popularProducts.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h2 className="text-2xl font-semibold text-balance">Most People Bought</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {popularProducts.map((product) => (
                        <Card key={product.id} className="h-full flex flex-col">
                          <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                            {product.image_url && (
                              <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="space-y-2 flex-1 flex flex-col">
                              <div className="flex-1">
                                <Link
                                  to={`/product/${product.id}`}
                                  className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                                >
                                  {product.name}
                                </Link>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {product.seller_name}
                                </p>
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-base font-semibold">
                                    {formatPrice(product.price)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    per {product.unit}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {product.order_count} orders
                                </Badge>
                              </div>

                              <Button
                                size="sm"
                                className="w-full mt-auto"
                                onClick={() => handleAddToCart(product)}
                                disabled={addingToCart.has(product.id)}
                              >
                                <ShoppingCart className="mr-2 h-3 w-3" />
                                Add to Cart
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section 3: Recently Bought by You */}
                {recentProducts.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-primary" />
                      <h2 className="text-2xl font-semibold text-balance">Recently Bought by You</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {recentProducts.map((product) => (
                        <Card key={product.id} className="h-full flex flex-col">
                          <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                            {product.image_url && (
                              <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="space-y-2 flex-1 flex flex-col">
                              <div className="flex-1">
                                <Link
                                  to={`/product/${product.id}`}
                                  className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                                >
                                  {product.name}
                                </Link>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {product.seller_name}
                                </p>
                              </div>

                              <div>
                                <p className="text-base font-semibold">
                                  {formatPrice(product.price)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  per {product.unit}
                                </p>
                              </div>

                              <Button
                                size="sm"
                                className="w-full mt-auto"
                                onClick={() => handleAddToCart(product)}
                                disabled={addingToCart.has(product.id)}
                              >
                                <ShoppingCart className="mr-2 h-3 w-3" />
                                Buy Again
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty State for New Users */}
                {recentProducts.length === 0 && popularProducts.length === 0 && stores.length > 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Start Shopping!</h3>
                      <p className="text-muted-foreground mb-4">
                        Browse products from stores above and start adding to your cart
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Button asChild>
                    <Link to="/stores">Browse Stores</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <BuyerOrderCard key={order.id} order={order} hasReview={hasReview} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingPayments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No pending payments</p>
                </CardContent>
              </Card>
            ) : (
              pendingPayments.map((order) => (
                <Card key={order.id} className="border-yellow-500/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-yellow-500">Payment Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Amount Due</span>
                      <span className="font-semibold text-yellow-600">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>
                    {order.due_date && (
                      <p className="text-sm text-muted-foreground">
                        Due by: {new Date(order.due_date).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Payment method: {order.payment_type.replace(/_/g, ' ')}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── My Pay Later Tab ── */}
          <TabsContent value="paylater" className="space-y-6">
            {homeLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : payLaterRecords.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center space-y-4">
                  <Crown className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <div>
                    <p className="font-medium">No Pay Later requests yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Visit a store that offers Pay Later and submit your application.
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link to="/stores">Browse Stores</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <h2 className="text-xl font-semibold">My Pay Later Accounts</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your Pay Later request status and credit details per store.
                </p>
                <div className="space-y-4">
                  {payLaterRecords.map((rec) => (
                    <Card key={rec.store_id}>
                      <CardContent className="p-5 space-y-4">
                        {/* Store header row */}
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <StoreIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/store/${rec.store_id}`}
                                className="font-semibold hover:text-primary transition-colors truncate block"
                              >
                                {rec.store_name}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {rec.requested_at
                                  ? `Requested ${new Date(rec.requested_at).toLocaleDateString()}`
                                  : 'No request yet'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {rec.status === 'approved' ? (
                              <Badge variant="secondary" className="gap-1.5 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                Active
                              </Badge>
                            ) : rec.status === 'pending' ? (
                              <Badge variant="outline" className="gap-1.5 py-1">
                                <Clock className="h-3.5 w-3.5 text-yellow-600" />
                                Pending Review
                              </Badge>
                            ) : rec.status === 'rejected' ? (
                              <Badge variant="destructive" className="gap-1.5 py-1">
                                <XCircle className="h-3.5 w-3.5" />
                                Rejected
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <Separator />

                        {/* Credit & plan details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Payment Plan</p>
                            <p className="font-medium capitalize mt-0.5">
                              {rec.payment_plan || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="font-medium capitalize mt-0.5">{rec.status || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Reviewed On</p>
                            <p className="font-medium mt-0.5">
                              {rec.reviewed_at
                                ? new Date(rec.reviewed_at).toLocaleDateString()
                                : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Pay Later Orders</p>
                            <p className="font-medium mt-0.5">{formatPrice(rec.pay_later_order_total)}</p>
                          </div>
                        </div>

                        {/* Rejection reason */}
                        {rec.status === 'rejected' && rec.rejection_reason && (
                          <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20">
                            <p className="text-xs text-muted-foreground">Rejection reason</p>
                            <p className="text-sm mt-0.5">{rec.rejection_reason}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                            <Link to={`/buyer/pay-later-request/${rec.store_id}`}>
                              {rec.status === 'approved' ? (
                                <><Eye className="h-3.5 w-3.5" /> View Details</>
                              ) : rec.status === 'pending' ? (
                                <><Eye className="h-3.5 w-3.5" /> View Status</>
                              ) : (
                                <><CreditCard className="h-3.5 w-3.5" /> Apply Again</>
                              )}
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
                            <Link to={`/store/${rec.store_id}`}>
                              <StoreIcon className="h-3.5 w-3.5" />
                              Visit Store
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No reviews yet</p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  canEdit
                  canDelete
                  onUpdate={fetchReviews}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Product Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onAddToCart={handleAddToCart}
        sellerName={quickViewSellerName}
      />
    </div>
  );
}
