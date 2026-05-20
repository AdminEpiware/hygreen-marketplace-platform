import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BuyerPurchaseHistory } from './BuyerPurchaseHistory';
import { Search, Users, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, BuyerStore } from '@/types/types';

interface BuyerData {
  buyer_id: string;
  buyer_profile: Profile;
  buyer_store: BuyerStore | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  order_count: number;
}

interface BuyerManagementProps {
  sellerId: string;
}

export function BuyerManagement({ sellerId }: BuyerManagementProps) {
  const [buyers, setBuyers] = useState<BuyerData[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<BuyerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'spent' | 'recent'>('recent');
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerData | null>(null);
  const { formatPrice } = useAuth();

  useEffect(() => {
    fetchBuyers();
  }, [sellerId]);

  useEffect(() => {
    filterAndSortBuyers();
  }, [buyers, searchQuery, sortBy]);

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      // Fetch all order items for this seller
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          item_total,
          created_at,
          order:orders!inner(
            buyer_id,
            buyer_store_id,
            order_status,
            created_at
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (orderError) throw orderError;

      // Group by buyer_id
      const buyerMap = new Map<string, {
        buyer_id: string;
        buyer_store_id: string | null;
        orders: Set<string>;
        total_spent: number;
        last_order_date: string;
      }>();

      orderItems?.forEach((item: any) => {
        const buyerId = item.order.buyer_id;
        const orderId = item.order_id;
        const buyerStoreId = item.order.buyer_store_id;

        if (!buyerMap.has(buyerId)) {
          buyerMap.set(buyerId, {
            buyer_id: buyerId,
            buyer_store_id: buyerStoreId,
            orders: new Set(),
            total_spent: 0,
            last_order_date: item.created_at,
          });
        }

        const buyerData = buyerMap.get(buyerId)!;
        buyerData.orders.add(orderId);
        buyerData.total_spent += item.item_total;
        
        // Update last order date if this is more recent
        if (new Date(item.created_at) > new Date(buyerData.last_order_date)) {
          buyerData.last_order_date = item.created_at;
        }
      });

      // Fetch buyer profiles and stores
      const buyerIds = Array.from(buyerMap.keys());
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', buyerIds);

      if (profileError) throw profileError;

      const buyerStoreIds = Array.from(buyerMap.values())
        .map(b => b.buyer_store_id)
        .filter(id => id !== null);

      let stores: BuyerStore[] = [];
      if (buyerStoreIds.length > 0) {
        const { data: storesData, error: storeError } = await supabase
          .from('buyer_stores')
          .select('*')
          .in('id', buyerStoreIds);

        if (storeError) throw storeError;
        stores = storesData || [];
      }

      // Combine data
      const buyersData: BuyerData[] = Array.from(buyerMap.values())
        .map(buyerInfo => {
          const profile = profiles?.find(p => p.id === buyerInfo.buyer_id);
          const store = stores.find(s => s.id === buyerInfo.buyer_store_id);

          return {
            buyer_id: buyerInfo.buyer_id,
            buyer_profile: profile!,
            buyer_store: store || null,
            total_orders: buyerInfo.orders.size,
            total_spent: buyerInfo.total_spent,
            last_order_date: buyerInfo.last_order_date,
            order_count: buyerInfo.orders.size,
          };
        })
        .filter(buyer => buyer.buyer_profile !== undefined);

      setBuyers(buyersData);
    } catch (error) {
      console.error('Failed to fetch buyers:', error);
      toast.error('Failed to load buyer data');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBuyers = () => {
    let filtered = [...buyers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(buyer => 
        buyer.buyer_profile.full_name.toLowerCase().includes(query) ||
        buyer.buyer_profile.mobile_number.includes(query) ||
        buyer.buyer_store?.store_name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.buyer_profile.full_name.localeCompare(b.buyer_profile.full_name);
        case 'orders':
          return b.total_orders - a.total_orders;
        case 'spent':
          return b.total_spent - a.total_spent;
        case 'recent':
          return new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime();
        default:
          return 0;
      }
    });

    setFilteredBuyers(filtered);
  };

  const maskEmail = (email: string): string => {
    const [local, domain] = email.split('@');
    if (local.length <= 3) {
      return `${local[0]}***@${domain}`;
    }
    return `${local.substring(0, 3)}***@${domain}`;
  };

  const maskPhone = (phone: string): string => {
    if (phone.length <= 5) {
      return phone;
    }
    const first3 = phone.substring(0, 3);
    const last2 = phone.substring(phone.length - 2);
    const masked = '*'.repeat(phone.length - 5);
    return `${first3}${masked}${last2}`;
  };

  const isFrequentBuyer = (orderCount: number): boolean => {
    return orderCount >= 5;
  };

  if (selectedBuyer) {
    return (
      <BuyerPurchaseHistory
        buyer={selectedBuyer}
        sellerId={sellerId}
        onBack={() => setSelectedBuyer(null)}
        maskEmail={maskEmail}
        maskPhone={maskPhone}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Buyer Management
            </CardTitle>
            <CardDescription>View and manage customers who purchased from your store</CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {filteredBuyers.length} {filteredBuyers.length === 1 ? 'Buyer' : 'Buyers'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, mobile, or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full md:w-48">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="orders">Most Orders</SelectItem>
              <SelectItem value="spent">Highest Spent</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading buyers...</div>
        ) : filteredBuyers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? 'No buyers found matching your search' : 'No buyers yet'}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer Details</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Last Order</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuyers.map((buyer) => {
                  if (!buyer.buyer_profile) return null;
                  
                  return (
                    <TableRow key={buyer.buyer_id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{buyer.buyer_profile.full_name}</p>
                            <p className="text-sm text-muted-foreground">{maskEmail(buyer.buyer_profile.email)}</p>
                          </div>
                          {isFrequentBuyer(buyer.order_count) && (
                            <Badge variant="default" className="text-xs">Frequent</Badge>
                          )}
                        </div>
                      </TableCell>
                    <TableCell>
                      <p className="text-sm">{maskPhone(buyer.buyer_profile.mobile_number)}</p>
                    </TableCell>
                    <TableCell>
                      {buyer.buyer_store ? (
                        <div>
                          <p className="text-sm font-medium">{buyer.buyer_store.store_name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {buyer.buyer_store.delivery_address}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No store</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{buyer.total_orders}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(buyer.total_spent)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(buyer.last_order_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBuyer(buyer)}
                      >
                        View History
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
