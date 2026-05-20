import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReviewItem } from '@/components/common/ReviewItem';
import { BuyerManagement } from '@/components/seller/BuyerManagement';
import { OrderManagement } from '@/components/seller/OrderManagement';
import { SellerSearchBar } from '@/components/seller/SellerSearchBar';
import { SellerProductCard } from '@/components/seller/SellerProductCard';
import { Package, DollarSign, ShoppingBag, Clock, Receipt, BarChart3, FileCheck, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderWithItems, OrderStatus, SalesSummary, ReviewWithResponse, Product } from '@/types/types';

interface ProductOption {
  id: string;
  name: string;
}

type ProductFilterId = 'low_stock' | 'out_of_stock' | 'recently_added' | 'best_selling';

export default function SellerDashboard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [sales, setSales] = useState<SalesSummary>({ daily: 0, weekly: 0, monthly: 0 });
  const [reviews, setReviews] = useState<ReviewWithResponse[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productFilters, setProductFilters] = useState<ProductFilterId[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState<string>('');
  const { user, profile, formatPrice } = useAuth();

  useEffect(() => {
    if (user && profile?.role === 'seller') {
      fetchOrders();
      calculateSales();
      fetchProducts();
      fetchAllProducts();
      fetchReviews();
      fetchStoreName();
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile?.role === 'seller') {
      fetchReviews();
    }
  }, [selectedProduct, sortBy]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('order_items')
      .select('*, order:orders!inner(*)')
      .eq('seller_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch orders:', error);
    } else {
      const groupedOrders: Record<string, OrderWithItems> = {};
      
      data?.forEach((item) => {
        const orderId = item.order.id;
        if (!groupedOrders[orderId]) {
          groupedOrders[orderId] = {
            ...item.order,
            order_items: [],
          };
        }
        groupedOrders[orderId].order_items.push(item);
      });

      setOrders(Object.values(groupedOrders));
    }
    setLoading(false);
  };

  const calculateSales = async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const { data } = await supabase
      .from('order_items')
      .select('item_total, created_at')
      .eq('seller_id', user!.id);

    if (data) {
      const daily = data
        .filter(item => new Date(item.created_at) >= today)
        .reduce((sum, item) => sum + item.item_total, 0);

      const weekly = data
        .filter(item => new Date(item.created_at) >= weekAgo)
        .reduce((sum, item) => sum + item.item_total, 0);

      const monthly = data
        .filter(item => new Date(item.created_at) >= monthAgo)
        .reduce((sum, item) => sum + item.item_total, 0);

      setSales({ daily, weekly, monthly });
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('seller_id', user!.id)
      .order('name');

    if (error) {
      console.error('Failed to fetch products:', error);
    } else {
      setProducts(data || []);
    }
  };

  const fetchAllProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user!.id)
      .order('created_at', { ascending: false });
    if (!error) setAllProducts(data || []);
  };

  const fetchReviews = async () => {
    let query = supabase
      .from('reviews')
      .select('*, product:products!inner(*), buyer:profiles!reviews_buyer_id_fkey(full_name), review_response:review_responses(*)')
      .eq('product.seller_id', user!.id);

    if (selectedProduct !== 'all') {
      query = query.eq('product_id', selectedProduct);
    }

    if (sortBy === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'highest') {
      query = query.order('rating', { ascending: false });
    } else if (sortBy === 'lowest') {
      query = query.order('rating', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch reviews:', error);
    } else {
      setReviews(data || []);
    }
  };

  const fetchStoreName = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('store_name, full_name')
      .eq('id', user!.id)
      .single();

    if (error) {
      console.error('Failed to fetch store name:', error);
    } else {
      // Prefer explicit store_name; fall back to personal full_name
      setStoreName(data?.store_name?.trim() || data?.full_name?.trim() || '');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ order_status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
      console.error(error);
    } else {
      toast.success('Order status updated');
      fetchOrders();
    }
  };

  const filteredDashboardProducts = useMemo(() => {
    let list = [...allProducts];
    if (productFilters.includes('low_stock')) list = list.filter((p) => p.available_quantity > 0 && p.available_quantity <= 10);
    if (productFilters.includes('out_of_stock')) list = list.filter((p) => p.available_quantity === 0);
    if (productFilters.includes('recently_added')) list = list.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 20);
    if (productFilters.includes('best_selling')) {
      // best selling = products with most orders — placeholder sort by name for now
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [allProducts, productFilters]);

  const pendingOrders = orders.filter(o => o.payment_status === 'pending');

  if (!user || profile?.role !== 'seller') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Please sign in as a seller</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* ── Sticky seller search bar — exact offset matches header fixed height */}
      <div className="sticky top-[192px] md:top-[248px] z-40 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="container py-5 md:py-6 relative">
          <SellerSearchBar
            sellerId={user!.id}
            onFilterChange={(f) => setProductFilters(f as ProductFilterId[])}
          />
        </div>
      </div>
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Seller Dashboard</h1>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-1">
              <p className="text-muted-foreground">Manage your products and orders</p>
              {storeName && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 border border-primary/20 w-fit">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{storeName}</span>
                </div>
              )}
              {profile?.seller_code && (
                <Badge variant="outline" className="font-mono w-fit">
                  {profile.seller_code}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/seller/pay-later-approval">
              <Button variant="outline" className="h-9">
                <FileCheck className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Pay Later Requests</span>
                <span className="md:hidden">Pay Later</span>
              </Button>
            </Link>
            <Link to="/seller/sales-report">
              <Button variant="outline" className="h-9">
                <BarChart3 className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Sales Report</span>
                <span className="md:hidden">Sales</span>
              </Button>
            </Link>
            <Link to="/seller/direct-billing">
              <Button variant="outline" className="h-9">
                <Receipt className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Direct Billing</span>
                <span className="md:hidden">Billing</span>
              </Button>
            </Link>
            <Link to="/seller/products">
              <Button className="h-9">
                <ShoppingBag className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Manage Products</span>
                <span className="md:hidden">Products</span>
              </Button>
            </Link>
          </div>
        </div>

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
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Sales</p>
                <p className="text-2xl font-semibold">{formatPrice(sales.daily)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekly Sales</p>
                <p className="text-2xl font-semibold">{formatPrice(sales.weekly)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Sales</p>
                <p className="text-2xl font-semibold">{formatPrice(sales.monthly)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="buyers">Buyer Management</TabsTrigger>
            <TabsTrigger value="reviews">Product Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrderManagement sellerId={user!.id} storeName={storeName} />
          </TabsContent>

          <TabsContent value="products" className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Loading products…</p>
            ) : filteredDashboardProducts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    {allProducts.length === 0
                      ? 'No products yet. Add your first product from Product Management.'
                      : 'No products match the active filters.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground pl-1">
                  {filteredDashboardProducts.length} product{filteredDashboardProducts.length !== 1 ? 's' : ''}
                  {productFilters.length > 0 ? ' (filtered)' : ''}
                </p>
                {filteredDashboardProducts.map((product) => (
                  <SellerProductCard
                    key={product.id}
                    product={product}
                    onUpdate={() => { fetchAllProducts(); fetchProducts(); }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="buyers">
            <BuyerManagement sellerId={user!.id} />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="flex gap-4">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="highest">Highest Rating</SelectItem>
                  <SelectItem value="lowest">Lowest Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  canRespond
                  onUpdate={fetchReviews}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
