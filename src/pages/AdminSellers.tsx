import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle, Ban, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, VerificationStatus } from '@/types/types';

export default function AdminSellers() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>(
    (searchParams.get('filter') as VerificationStatus) || 'all'
  );
  const [selectedSeller, setSelectedSeller] = useState<Profile | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'suspend' | null;
  }>({ open: false, action: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
    } else {
      fetchSellers();
    }
  }, [profile, navigate]);

  useEffect(() => {
    filterSellers();
  }, [searchQuery, statusFilter, sellers]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching sellers...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'seller')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sellers:', error);
        throw error;
      }
      
      console.log('Sellers fetched:', data?.length || 0);
      setSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      toast.error('Failed to load sellers. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const filterSellers = () => {
    let filtered = [...sellers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (seller) =>
          seller.full_name?.toLowerCase().includes(query) ||
          seller.email?.toLowerCase().includes(query) ||
          seller.store_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((seller) => seller.verification_status === statusFilter);
    }

    setFilteredSellers(filtered);
  };

  const handleAction = async () => {
    if (!selectedSeller || !actionDialog.action) return;

    setProcessing(true);
    try {
      const updates: Partial<Profile> = {
        verification_reviewed_at: new Date().toISOString(),
        verification_reviewed_by: user!.id,
      };

      if (actionDialog.action === 'approve') {
        updates.verification_status = 'approved';
      } else if (actionDialog.action === 'reject') {
        updates.verification_status = 'rejected';
        updates.verification_rejection_reason = rejectionReason;
      } else if (actionDialog.action === 'suspend') {
        updates.verification_status = 'rejected';
        updates.verification_rejection_reason = 'Account suspended by admin';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', selectedSeller.id);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_activity_logs').insert({
        admin_id: user!.id,
        action: `seller_${actionDialog.action}`,
        target_type: 'seller',
        target_id: selectedSeller.id,
        details: { reason: rejectionReason || null },
      });

      toast.success(`Seller ${actionDialog.action}d successfully`);
      fetchSellers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating seller:', error);
      toast.error('Failed to update seller status');
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseDialog = () => {
    setActionDialog({ open: false, action: null });
    setSelectedSeller(null);
    setRejectionReason('');
  };

  const getStatusBadge = (status?: VerificationStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!user || profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Seller Management</h1>
          <p className="text-muted-foreground text-pretty">
            Approve, reject, or manage seller accounts
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected
            </Button>
          </div>
        </div>

        {/* Sellers Table */}
        <Card>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Store Name</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Pay Later</TableHead>
                    <TableHead className="whitespace-nowrap">Registered</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredSellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No sellers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell className="whitespace-nowrap font-medium">{seller.full_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{seller.email}</TableCell>
                        <TableCell className="whitespace-nowrap">{seller.store_name || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">{getStatusBadge(seller.verification_status)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {seller.pay_later_enabled ? (
                            <Badge variant="outline" className="bg-primary/10">Enabled</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(seller.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/admin/sellers/${seller.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {seller.verification_status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setSelectedSeller(seller);
                                    setActionDialog({ open: true, action: 'approve' });
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedSeller(seller);
                                    setActionDialog({ open: true, action: 'reject' });
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {seller.verification_status === 'approved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => {
                                  setSelectedSeller(seller);
                                  setActionDialog({ open: true, action: 'suspend' });
                                }}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {actionDialog.action === 'approve' && 'Approve Seller'}
                {actionDialog.action === 'reject' && 'Reject Seller'}
                {actionDialog.action === 'suspend' && 'Suspend Seller'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.action === 'approve' &&
                  'This will approve the seller and allow them to list products.'}
                {actionDialog.action === 'reject' &&
                  'This will reject the seller application. Please provide a reason.'}
                {actionDialog.action === 'suspend' &&
                  'This will suspend the seller account and prevent them from accessing the platform.'}
              </DialogDescription>
            </DialogHeader>

            {(actionDialog.action === 'reject' || actionDialog.action === 'suspend') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Enter reason for rejection/suspension..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog} disabled={processing}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={
                  processing ||
                  ((actionDialog.action === 'reject' || actionDialog.action === 'suspend') &&
                    !rejectionReason.trim())
                }
              >
                {processing ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
