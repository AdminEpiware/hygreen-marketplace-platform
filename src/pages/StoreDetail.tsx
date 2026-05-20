import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayLaterCrown } from '@/components/common/PayLaterCrown';
import { Store, Search, ShoppingCart, Star, ChevronRight, ArrowLeft, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/currency';
import { getStoreName } from '@/lib/store';
import type { Product, Profile, ProductCategory } from '@/types/types';

interface StoreInfo extends Profile {
  product_count?: number;
}

export default function StoreDetail() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user, profile, refreshCartCount } = useAuth();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  /** Most recent pay-later request status for this buyer + this store */
  const [payLaterStatus, setPayLaterStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => {
    if (!storeId) {
      navigate('/stores');
      return;
    }
    fetchStoreAndProducts();
    if (user && profile?.role === 'buyer') {
      fetchPayLaterStatus();
    }
  }, [storeId]);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const fetchStoreAndProducts = async () => {
    if (!storeId) return;

    try {
      setLoading(true);

      // Fetch store info — use maybeSingle so a missing/non-seller profile
      // returns null instead of throwing PGRST116.
      const { data: storeData, error: storeError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', storeId)
        .eq('role', 'seller')
        .maybeSingle();

      if (storeError) throw storeError;

      // If the profile row doesn't exist, stay on the page with empty state
      // instead of navigating away with a confusing error.
      if (!storeData) {
        setStore(null);
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
        return;
      }

      setStore(storeData);

      // Fetch products for this store
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', storeId)
        .gt('available_quantity', 0)
        .order('name');

      if (productsError) throw productsError;

      setProducts(productsData || []);
      setFilteredProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching store details:', error);
      toast.error('Failed to load store details');
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayLaterStatus = async () => {
    if (!user || !storeId) return;
    try {
      const { data, error } = await supabase
        .from('buyer_pay_later_requests')
        .select('status')
        .eq('buyer_id', user.id)
        .eq('store_id', storeId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setPayLaterStatus(data?.status ?? null);
    } catch (err) {
      console.error('Error fetching pay-later status:', err);
    }
  };

  const filterProducts = () => {    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = async (product: Product) => {
    if (!user || profile?.role !== 'buyer') {
      toast.error('Please sign in as a buyer to add items to cart');
      return;
    }

    if (!storeId) {
      toast.error('Invalid store');
      return;
    }

    setAddingToCart(product.id);

    try {
      // Check if item already in cart for this seller
      const { data: existingItem } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('buyer_id', user.id)
        .eq('product_id', product.id)
        .eq('seller_id', storeId)
        .maybeSingle();

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart')
          .update({
            quantity: existingItem.quantity + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingItem.id);

        if (error) throw error;
        toast.success('Cart updated!');
      } else {
        // Insert new item
        const { error } = await supabase.from('cart').insert({
          buyer_id: user.id,
          product_id: product.id,
          seller_id: storeId,
          quantity: 1,
        });

        if (error) throw error;
        toast.success('Added to cart!');
      }

      await refreshCartCount();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const getCategoryLabel = (category: ProductCategory): string => {
    const labels: Record<ProductCategory, string> = {
      vegetables: 'Vegetables',
      fruits: 'Fruits',
      grocery: 'Grocery',
      dairy: 'Dairy',
      bakery: 'Bakery',
      meat: 'Meat',
      beverages: 'Beverages',
      snacks: 'Snacks',
    };
    return labels[category] || category;
  };

  if (!user || profile?.role !== 'buyer') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/stores" className="hover:text-foreground transition-colors">
            Stores
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{getStoreName(store)}</span>
        </div>

        {/* Store Header */}
        {loading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center gap-6 animate-pulse">
                <div className="w-24 h-24 bg-muted rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="h-8 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : store ? (          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Store Image */}
                <div className="shrink-0">
                  {store.profile_photo_url ? (
                    <img
                      src={store.profile_photo_url}
                      alt={getStoreName(store)}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <Store className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Store Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h1 className="text-3xl font-semibold text-balance mb-2">
                        {getStoreName(store)}
                      </h1>
                      {store.business_type && (
                        <Badge variant="outline">
                          {store.business_type === 'individual' ? 'Individual Seller' : 'Company'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Pay Later crown — only shown when this store supports Pay Later */}
                      {store.pay_later_enabled && (
                        <PayLaterCrown size={24} showLabel />
                      )}
                      {/* Per-store Pay Later request action */}
                      {store.pay_later_enabled && (
                        payLaterStatus === 'approved' ? (
                          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            Pay Later Active
                          </Badge>
                        ) : payLaterStatus === 'pending' ? (
                          <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                            <Clock className="h-3.5 w-3.5 text-yellow-600" />
                            Request Pending
                          </Badge>
                        ) : (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link to={`/buyer/pay-later-request/${storeId}`}>
                              <CreditCard className="h-4 w-4" />
                              Request Pay Later
                            </Link>
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                  {store.business_address && (
                    <p className="text-muted-foreground text-pretty mt-2">
                      {store.business_address}
                    </p>
                  )}
                </div>

                {/* Back Button */}
                <Button variant="outline" onClick={() => navigate('/stores')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Stores
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Store profile not found — show a friendly empty state */
          <Card>
            <CardContent className="py-16 text-center">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Store unavailable</p>
              <p className="text-sm text-muted-foreground mb-6">
                This store could not be found. It may have been removed.
              </p>
              <Button variant="outline" onClick={() => navigate('/stores')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Stores
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="vegetables">Vegetables</SelectItem>
              <SelectItem value="fruits">Fruits</SelectItem>
              <SelectItem value="grocery">Grocery</SelectItem>
              <SelectItem value="dairy">Dairy</SelectItem>
              <SelectItem value="bakery">Bakery</SelectItem>
              <SelectItem value="meat">Meat</SelectItem>
              <SelectItem value="beverages">Beverages</SelectItem>
              <SelectItem value="snacks">Snacks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="h-full">
                <CardContent className="p-4">
                  <div className="space-y-3 animate-pulse">
                    <div className="aspect-square bg-muted rounded" />
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No products found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'This store has no products available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="h-full flex flex-col">
                  <CardContent className="p-4 flex flex-col h-full">
                    {/* Product Image */}
                    <div
                      className="aspect-square bg-muted rounded mb-4 overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col">
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs mb-2">
                          {getCategoryLabel(product.category)}
                        </Badge>
                        <h3
                          className="font-semibold text-balance leading-tight cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          {product.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        {product.average_rating > 0 && (
                          <>
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="font-medium">{product.average_rating.toFixed(1)}</span>
                            <span>({product.review_count})</span>
                          </>
                        )}
                      </div>

                      <div className="mt-auto space-y-3">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl font-semibold">{formatPrice(product.price, product.base_currency || DEFAULT_CURRENCY)}</span>
                            <span className="text-sm text-muted-foreground ml-1">/ {product.unit}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {product.available_quantity} available
                          </span>
                        </div>

                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={addingToCart === product.id || !user || profile?.role !== 'buyer'}
                          className="w-full gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          {addingToCart === product.id ? 'Adding...' : 'Add to Cart'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
