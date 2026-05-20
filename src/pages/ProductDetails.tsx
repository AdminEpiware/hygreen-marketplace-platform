import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarRating } from '@/components/ui/star-rating';
import { ReviewItem } from '@/components/common/ReviewItem';
import { ArrowLeft, ShoppingCart, Heart, Tag, Phone, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getProductImageWithFallback } from '@/utils/productImages';
import type { Product, ReviewWithResponse, Profile } from '@/types/types';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [sellerProfile, setSellerProfile] = useState<Partial<Profile> | null>(null);
  const [reviews, setReviews] = useState<ReviewWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [isFavourited, setIsFavourited] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const { user, profile, convertPrice, formatPriceWithUnit, refreshCartCount } = useAuth();

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchReviews();
  }, [sortBy]);

  useEffect(() => {
    if (id && user && profile?.role === 'buyer') checkFavourite();
  }, [id, user, profile]);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      toast.error('Failed to load product');
      console.error(error);
    } else if (data) {
      setProduct(data);
      fetchSellerProfile(data.seller_id);
    }
    setLoading(false);
  };

  const fetchSellerProfile = async (sellerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, store_name, store_contact, allow_buyer_contact, email')
      .eq('id', sellerId)
      .maybeSingle();
    if (data) setSellerProfile(data);
  };

  const fetchReviews = async () => {
    let query = supabase
      .from('reviews')
      .select('*, buyer:profiles!reviews_buyer_id_fkey(full_name), review_response:review_responses(*)')
      .eq('product_id', id);

    if (sortBy === 'recent') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'highest') query = query.order('rating', { ascending: false });
    else if (sortBy === 'lowest') query = query.order('rating', { ascending: true });

    const { data, error } = await query;
    if (error) console.error('Failed to load reviews:', error);
    else setReviews(data || []);
  };

  const checkFavourite = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('product_favourites')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('product_id', id)
      .maybeSingle();
    setIsFavourited(!!data);
  };

  const toggleFavourite = async () => {
    if (!user || !profile || profile.role !== 'buyer') {
      toast.error('Sign in as a buyer to save favourites');
      return;
    }
    if (!id) return;
    setTogglingFav(true);
    if (isFavourited) {
      const { error } = await supabase
        .from('product_favourites')
        .delete()
        .eq('buyer_id', user.id)
        .eq('product_id', id);
      if (!error) {
        setIsFavourited(false);
        toast.success('Removed from favourites');
      }
    } else {
      const { error } = await supabase
        .from('product_favourites')
        .insert({ buyer_id: user.id, product_id: id });
      if (!error) {
        setIsFavourited(true);
        toast.success('Saved to favourites');
      }
    }
    setTogglingFav(false);
  };

  const addToCart = async () => {
    if (!user || !profile || profile.role !== 'buyer') {
      toast.error('Please sign in as a buyer to add items to cart');
      return;
    }
    if (!product) return;
    if (quantity > product.available_quantity) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }
    setAddingToCart(true);
    try {
      const { data: existingItem } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('buyer_id', user.id)
        .eq('product_id', product.id)
        .eq('seller_id', product.seller_id)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from('cart')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);
        if (error) { toast.error('Failed to update cart'); console.error(error); }
        else { toast.success('Cart updated!'); await refreshCartCount(); navigate('/cart'); }
      } else {
        const { error } = await supabase
          .from('cart')
          .insert({ buyer_id: user.id, product_id: product.id, seller_id: product.seller_id, quantity });
        if (error) { toast.error('Failed to add to cart'); console.error(error); }
        else { toast.success('Added to cart!'); await refreshCartCount(); navigate('/cart'); }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-8 w-32 mb-6 bg-muted" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square bg-muted" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 bg-muted" />
              <Skeleton className="h-6 w-1/2 bg-muted" />
              <Skeleton className="h-24 w-full bg-muted" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Product not found</p>
        </main>
      </div>
    );
  }

  const storeName = sellerProfile?.store_name || sellerProfile?.full_name || 'Store';
  const showContact = sellerProfile?.allow_buyer_contact && sellerProfile?.store_contact;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="aspect-square overflow-hidden rounded-lg bg-muted relative">
            <img
              src={getProductImageWithFallback(product.image_url, product.category)}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = getProductImageWithFallback(null, product.category); }}
            />
            {/* Favourite button on image */}
            {profile?.role === 'buyer' && (
              <button
                type="button"
                onClick={toggleFavourite}
                disabled={togglingFav}
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md transition-colors"
                aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
              >
                <Heart className={`h-5 w-5 transition-colors ${isFavourited ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
              </button>
            )}
          </div>

          <div className="space-y-5">
            {/* Title + category */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-semibold text-balance">{product.name}</h1>
                <Badge variant="secondary">{product.category}</Badge>
              </div>
              {/* Brand name */}
              {product.brand_name && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  <span>Brand: <span className="font-medium text-foreground">{product.brand_name}</span></span>
                </div>
              )}
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-semibold">
                  ₹{convertPrice(product.price, product.base_currency).toFixed(2)}/{product.unit}
                </span>
              </div>
              {product.review_count > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={product.average_rating} showValue />
                  <span className="text-sm text-muted-foreground">
                    ({product.review_count} {product.review_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground text-pretty">{product.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Product details */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium">{product.available_quantity} {product.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit</span>
                  <span className="font-medium capitalize">{product.unit}</span>
                </div>
              </CardContent>
            </Card>

            {/* Seller info card */}
            {sellerProfile && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Sold by</span>
                    <button
                      className="font-medium text-primary hover:underline"
                      onClick={() => navigate(`/store/${sellerProfile.id}`)}
                    >
                      {storeName}
                    </button>
                  </div>
                  {showContact && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Contact:</span>
                      <a
                        href={`tel:${sellerProfile.store_contact}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {sellerProfile.store_contact}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Add to cart */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity ({product.unit})</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.available_quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={addToCart}
                  disabled={!user || profile?.role !== 'buyer' || quantity < 1 || quantity > product.available_quantity || addingToCart}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {addingToCart ? 'Adding to Cart...' : 'Add to Cart'}
                </Button>
                {profile?.role === 'buyer' && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={toggleFavourite}
                    disabled={togglingFav}
                    aria-label={isFavourited ? 'Remove from favourites' : 'Save to favourites'}
                  >
                    <Heart className={`h-5 w-5 ${isFavourited ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Customer Reviews</h2>
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
                <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewItem key={review.id} review={review} onUpdate={fetchReviews} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

