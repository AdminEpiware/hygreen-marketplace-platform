import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ShoppingCart, ArrowLeft, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getProductImageWithFallback } from '@/utils/productImages';
import type { ProductFavourite } from '@/types/types';

export default function FavouritesPage() {
  const { user, profile, convertPrice, refreshCartCount } = useAuth();
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState<ProductFavourite[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || profile?.role !== 'buyer') {
      navigate('/login');
      return;
    }
    fetchFavourites();
  }, [user, profile]);

  const fetchFavourites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('product_favourites')
      .select(`
        id,
        buyer_id,
        product_id,
        created_at,
        product:products!product_favourites_product_id_fkey (
          id,
          name,
          price,
          unit,
          image_url,
          category,
          brand_name,
          available_quantity,
          base_currency,
          seller_id,
          seller:profiles!products_seller_id_fkey (
            id,
            store_name,
            full_name
          )
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favourites:', error);
      toast.error('Failed to load favourites');
    } else {
      setFavourites((data || []) as unknown as ProductFavourite[]);
    }
    setLoading(false);
  }, [user]);

  const removeFavourite = async (favouriteId: string) => {
    setRemovingId(favouriteId);
    const { error } = await supabase
      .from('product_favourites')
      .delete()
      .eq('id', favouriteId);

    if (error) {
      toast.error('Failed to remove from favourites');
    } else {
      setFavourites((prev) => prev.filter((f) => f.id !== favouriteId));
      toast.success('Removed from favourites');
    }
    setRemovingId(null);
  };

  const addToCart = async (fav: ProductFavourite) => {
    const product = fav.product as any;
    if (!product || !user) return;
    setAddingToCartId(fav.id);
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
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
        if (!error) { toast.success('Cart updated!'); await refreshCartCount(); }
        else toast.error('Failed to update cart');
      } else {
        const { error } = await supabase
          .from('cart')
          .insert({ buyer_id: user.id, product_id: product.id, seller_id: product.seller_id, quantity: 1 });
        if (!error) { toast.success('Added to cart!'); await refreshCartCount(); }
        else toast.error('Failed to add to cart');
      }
    } catch {
      toast.error('Failed to add to cart');
    }
    setAddingToCartId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 bg-muted" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
            <h1 className="text-2xl font-semibold">Favourite Products</h1>
          </div>
          <span className="text-sm text-muted-foreground ml-1">
            ({favourites.length} {favourites.length === 1 ? 'item' : 'items'})
          </span>
        </div>

        {favourites.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Heart className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-medium text-lg">No favourites yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tap the heart icon on any product to save it here
                </p>
              </div>
              <Button onClick={() => navigate('/products')} className="mt-2">
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {favourites.map((fav) => {
              const product = fav.product as any;
              if (!product) return null;
              const sellerName = product.seller?.store_name || product.seller?.full_name || '';
              const convertedPrice = convertPrice(product.price, product.base_currency);

              return (
                <div
                  key={fav.id}
                  className="group flex flex-col border border-border/60 rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div
                    className="relative aspect-square bg-muted cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {product.image_url ? (
                      <img
                        src={getProductImageWithFallback(product.image_url, product.category)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getProductImageWithFallback(null, product.category);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Seller / Brand overlay */}
                    {(sellerName || product.brand_name) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-2 pt-4 pb-1.5 pointer-events-none">
                        {product.brand_name && (
                          <p className="text-[10px] text-white/90 font-semibold truncate leading-tight">{product.brand_name}</p>
                        )}
                        {sellerName && (
                          <p className="text-[9px] text-white/70 truncate leading-tight">by {sellerName}</p>
                        )}
                      </div>
                    )}

                    {/* Remove favourite */}
                    <button
                      type="button"
                      disabled={removingId === fav.id}
                      onClick={(e) => { e.stopPropagation(); removeFavourite(fav.id); }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/85 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                      aria-label="Remove from favourites"
                    >
                      <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-2.5 gap-1.5">
                    <p
                      className="text-[12px] font-normal leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors min-h-[2.2rem]"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      {product.name}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold">₹{convertedPrice.toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">/ {product.unit}</span>
                    </div>
                    <div className="mt-auto pt-1">
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        disabled={addingToCartId === fav.id || product.available_quantity === 0}
                        onClick={() => addToCart(fav)}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {product.available_quantity === 0 ? 'Out of Stock' : addingToCartId === fav.id ? 'Adding…' : 'Add to Cart'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
