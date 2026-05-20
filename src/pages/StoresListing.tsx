import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PayLaterCrown } from '@/components/common/PayLaterCrown';
import { Store, Search, Filter, Heart, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreName } from '@/lib/store';
import type { Profile } from '@/types/types';

interface StoreWithPayLater extends Profile {
  has_pay_later_stores?: boolean;
  is_favorite?: boolean;
}

export default function StoresListing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreWithPayLater[]>([]);
  const [filteredStores, setFilteredStores] = useState<StoreWithPayLater[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayLaterOnly, setShowPayLaterOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  /** Map of store_id → most recent pay-later request status for the current buyer */
  const [payLaterStatuses, setPayLaterStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});

  useEffect(() => {
    if (profile?.role === 'seller') {
      navigate('/seller/dashboard');
    } else if (profile?.role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    fetchStores();
    if (user && profile?.role === 'buyer') {
      fetchFavorites();
      fetchPayLaterStatuses();
    }
  }, [user, profile]);

  useEffect(() => {
    filterStores();
  }, [searchQuery, showPayLaterOnly, showFavoritesOnly, stores, favorites]);

  const fetchStores = async () => {
    try {
      setLoading(true);

      console.log('Fetching all stores (sellers)...');

      // Fetch ALL sellers regardless of verification status
      const { data: sellersData, error: sellersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'seller')
        .order('full_name');

      if (sellersError) {
        console.error('Error fetching sellers:', sellersError);
        throw sellersError;
      }

      console.log('Sellers fetched:', sellersData?.length || 0);

      if (!sellersData || sellersData.length === 0) {
        console.log('No sellers found in database');
        setStores([]);
        setFilteredStores([]);
        setLoading(false);
        return;
      }

      // Map sellers to stores with Pay Later status from their profile
      const storesData = sellersData.map((seller) => ({
        ...seller,
        has_pay_later_stores: seller.pay_later_enabled || false,
      }));

      console.log('Stores mapped:', storesData.length);
      setStores(storesData);
      setFilteredStores(storesData);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorite_stores')
        .select('seller_id')
        .eq('buyer_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      const favoriteIds = new Set(data.map(f => f.seller_id));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchPayLaterStatuses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('buyer_pay_later_requests')
        .select('store_id, status, requested_at')
        .eq('buyer_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Keep only the most recent request per store
      const map: Record<string, 'pending' | 'approved' | 'rejected'> = {};
      (data || []).forEach((row) => {
        if (!map[row.store_id]) {
          map[row.store_id] = row.status;
        }
      });
      setPayLaterStatuses(map);
    } catch (err) {
      console.error('Error fetching pay-later statuses:', err);
    }
  };

  const toggleFavorite = async (sellerId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to store

    if (!user || profile?.role !== 'buyer') {
      toast.error('Please sign in as a buyer to add favorites');
      return;
    }

    const isFavorite = favorites.has(sellerId);

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorite_stores')
          .delete()
          .eq('buyer_id', user.id)
          .eq('seller_id', sellerId);

        if (error) throw error;

        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(sellerId);
          return newSet;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorite_stores')
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
          });

        if (error) throw error;

        setFavorites(prev => new Set(prev).add(sellerId));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const filterStores = () => {
    let filtered = [...stores];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (store) =>
          store.full_name?.toLowerCase().includes(query) ||
          store.business_name?.toLowerCase().includes(query) ||
          store.store_name?.toLowerCase().includes(query)
      );
    }

    // Pay Later filter
    if (showPayLaterOnly) {
      filtered = filtered.filter((store) => store.has_pay_later_stores);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((store) => favorites.has(store.id));
    }

    setFilteredStores(filtered);
  };

  const handleStoreClick = (storeId: string) => {
    navigate(`/store/${storeId}`);
  };

  if (!user || profile?.role !== 'buyer') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Browse Stores</h1>
          <p className="text-muted-foreground text-pretty">
            Discover products from verified sellers across our marketplace
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stores by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites
            </Button>
            <Button
              variant={showPayLaterOnly ? 'default' : 'outline'}
              onClick={() => setShowPayLaterOnly(!showPayLaterOnly)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Pay Later
            </Button>
          </div>
        </div>

        {/* Stores Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-full">
                <CardContent className="p-6">
                  <div className="space-y-4 animate-pulse">
                    <div className="w-16 h-16 bg-muted rounded-full" />
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No stores found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'No stores are currently available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Showing {filteredStores.length} {filteredStores.length === 1 ? 'store' : 'stores'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => (
                <Card
                  key={store.id}
                  className="h-full cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handleStoreClick(store.id)}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Store Image/Avatar */}
                      <div className="shrink-0">
                        {store.profile_photo_url ? (
                          <img
                            src={store.profile_photo_url}
                            alt={getStoreName(store)}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <Store className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Store Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-lg leading-tight text-balance">
                            {getStoreName(store)}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={(e) => toggleFavorite(store.id, e)}
                            >
                              <Heart
                                className={`h-5 w-5 ${
                                  favorites.has(store.id)
                                    ? 'fill-red-500 text-red-500'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            </Button>
                          </div>
                        </div>
                        {/* Inline Pay Later availability — always visible on card */}
                        {store.has_pay_later_stores && (
                          <div className="flex items-center gap-1 mb-1">
                            <PayLaterCrown size={14} />
                            <span className="text-xs text-muted-foreground font-medium">
                              Pay Later Available
                            </span>
                          </div>
                        )}
                        {store.business_type && (
                          <Badge variant="outline" className="text-xs">
                            {store.business_type === 'individual' ? 'Individual' : 'Company'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Store Details */}
                    <div className="space-y-2 text-sm text-muted-foreground mt-auto">
                      {store.store_address && (
                        <p className="line-clamp-2 text-pretty">{store.store_address}</p>
                      )}
                      {store.store_contact && (
                        <p className="text-xs">📞 {store.store_contact}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs">Verified Seller</span>
                        <span className="text-xs font-medium text-primary">View Products →</span>
                      </div>

                      {/* Per-store Pay Later request action */}
                      {store.has_pay_later_stores && (
                        <div
                          className="pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {payLaterStatuses[store.id] === 'approved' ? (
                            <Badge variant="secondary" className="gap-1.5 w-full justify-center py-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              Pay Later Active
                            </Badge>
                          ) : payLaterStatuses[store.id] === 'pending' ? (
                            <Badge variant="outline" className="gap-1.5 w-full justify-center py-1.5">
                              <Clock className="h-3.5 w-3.5 text-yellow-600" />
                              Request Pending
                            </Badge>
                          ) : (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 mt-1"
                            >
                              <Link to={`/buyer/pay-later-request/${store.id}`}>
                                <CreditCard className="h-3.5 w-3.5" />
                                Request Pay Later
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
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
