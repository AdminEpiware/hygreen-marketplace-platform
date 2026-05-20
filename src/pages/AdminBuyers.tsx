import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types/types';

export default function AdminBuyers() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Profile[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
    } else {
      fetchBuyers();
    }
  }, [profile, navigate]);

  useEffect(() => {
    filterBuyers();
  }, [searchQuery, buyers]);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching buyers...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'buyer')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching buyers:', error);
        throw error;
      }
      
      console.log('Buyers fetched:', data?.length || 0);
      setBuyers(data || []);
    } catch (error) {
      console.error('Error fetching buyers:', error);
      toast.error('Failed to load buyers. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const filterBuyers = () => {
    let filtered = [...buyers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (buyer) =>
          buyer.full_name?.toLowerCase().includes(query) ||
          buyer.email?.toLowerCase().includes(query)
      );
    }

    setFilteredBuyers(filtered);
  };

  if (!user || profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Buyer Management</h1>
          <p className="text-muted-foreground text-pretty">View and manage buyer accounts</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Mobile</TableHead>
                    <TableHead className="whitespace-nowrap">Country</TableHead>
                    <TableHead className="whitespace-nowrap">Registered</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredBuyers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No buyers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBuyers.map((buyer) => (
                      <TableRow key={buyer.id}>
                        <TableCell className="whitespace-nowrap font-medium">{buyer.full_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{buyer.email}</TableCell>
                        <TableCell className="whitespace-nowrap">{buyer.mobile_number}</TableCell>
                        <TableCell className="whitespace-nowrap">{buyer.country || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(buyer.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/buyers/${buyer.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
