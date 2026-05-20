import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarRating } from '@/components/ui/star-rating';
import { Search, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getProductImageWithFallback } from '@/utils/productImages';
import type { Product, ProductCategory } from '@/types/types';

const CATEGORIES: { value: ProductCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'meat', label: 'Meat' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'snacks', label: 'Snacks' },
];

export default function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // searchQuery synced from URL param `q`
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get('category') || 'all'
  );
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const { user, profile, convertPrice, formatPriceWithUnit, refreshCartCount } = useAuth();

  // Active sort / filter from URL
  const activeSort   = searchParams.get('sort')   || '';   // price_asc | rating_desc
  const activeFilter = searchParams.get('filter') || '';   // fast_delivery | in_stock

  // Readable labels for active URL params shown as dismissable badges
  const sortLabel: Record<string, string> = {
    price_asc:    'Lowest Price',
    rating_desc:  'Top Rated',
  };
  const filterLabel: Record<string, string> = {
    fast_delivery: 'Fast Delivery',
    in_stock:      'In Stock',
  };

  // Sync local state when URL params change (e.g. navigating from a chip or trending search)
  useEffect(() => {
    const q   = searchParams.get('q')        || '';
    const cat = searchParams.get('category') || 'all';
    setSearchQuery(q);
    setSelectedCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    void fetchProducts();
  }, [selectedCategory, activeSort]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*')
      .gt('available_quantity', 0);

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    // Apply URL-driven sort
    if (activeSort === 'price_asc') {
      query = query.order('price', { ascending: true });
    } else if (activeSort === 'rating_desc') {
      query = query.order('average_rating', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load products');
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /** Update search query and push to URL */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  /** Update category and push to URL */
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    const next = new URLSearchParams(searchParams);
    if (value !== 'all') next.set('category', value);
    else next.delete('category');
    setSearchParams(next, { replace: true });
  };

  /** Dismiss a sort or filter chip */
  const dismissParam = (key: 'sort' | 'filter') => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const addToCart = async (productId: string) => {
    if (!user || !profile || profile.role !== 'buyer') {
      toast.error('Please sign in as a buyer to add items to cart');
      return;
    }

    setAddingToCart(productId);

    try {
      // Get product to find seller_id
      const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .single();

      if (!product) {
        toast.error('Product not found');
        return;
      }

      // Check if item already exists in cart for this seller
      const { data: existingItem } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('buyer_id', user.id)
        .eq('product_id', productId)
        .eq('seller_id', product.seller_id)
        .maybeSingle();

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) {
          toast.error('Failed to update cart');
          console.error(error);
        } else {
          toast.success('Cart updated!');
          await refreshCartCount();
        }
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart')
          .insert({
            buyer_id: user.id,
            product_id: productId,
            seller_id: product.seller_id,
            quantity: 1,
          });

        if (error) {
          toast.error('Failed to add to cart');
          console.error(error);
        } else {
          toast.success('Added to cart!');
          await refreshCartCount();
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Fresh Groceries</h1>
          <p className="text-muted-foreground">Browse our selection of quality products</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active sort / filter badges from URL params */}
        {(activeSort || activeFilter) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {activeSort && (
              <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                {sortLabel[activeSort] ?? activeSort}
                <button
                  type="button"
                  onClick={() => dismissParam('sort')}
                  className="ml-0.5 hover:text-destructive transition-colors"
                  aria-label="Remove sort filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {activeFilter && (
              <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                {filterLabel[activeFilter] ?? activeFilter}
                <button
                  type="button"
                  onClick={() => dismissParam('filter')}
                  className="ml-0.5 hover:text-destructive transition-colors"
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full bg-muted" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-muted" />
                  <Skeleton className="h-4 w-1/2 bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <Link to={`/products/${product.id}`}>
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={getProductImageWithFallback(product.image_url, product.category)}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getProductImageWithFallback(null, product.category);
                      }}
                    />
                  </div>
                </Link>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/products/${product.id}`}>
                      <h3 className="font-medium hover:text-primary transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {product.category}
                    </Badge>
                  </div>
                  {product.review_count > 0 && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={product.average_rating} size={14} />
                      <span className="text-xs text-muted-foreground">
                        ({product.review_count})
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">
                      ₹{convertPrice(product.price, product.base_currency).toFixed(2)}/{product.unit}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.available_quantity} {product.unit} available
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full"
                    onClick={() => addToCart(product.id)}
                    disabled={!user || profile?.role !== 'buyer' || addingToCart === product.id}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {addingToCart === product.id ? 'Adding...' : 'Add to Cart'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
