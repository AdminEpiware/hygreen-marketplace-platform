import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Search, ExternalLink, CreditCard, User } from 'lucide-react';
import { toast } from 'sonner';
import type { PayLaterAccount, Profile } from '@/types/types';

interface PayLaterAccountWithBuyer extends PayLaterAccount {
  buyer?: Profile;
}

export default function AdminPayLaterApproval() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<PayLaterAccountWithBuyer[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<PayLaterAccountWithBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<PayLaterAccountWithBuyer | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [assignedCreditLimit, setAssignedCreditLimit] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchApplications();
  }, [profile, navigate]);

  useEffect(() => {
    filterApplications();
  }, [searchQuery, statusFilter, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);

      // Fetch all Pay Later applications with buyer information
      const { data, error } = await supabase
        .from('pay_later_accounts')
        .select(`
          *,
          buyer:profiles!pay_later_accounts_buyer_id_fkey(*)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
      setFilteredApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.account_holder_name.toLowerCase().includes(query) ||
          app.buyer?.full_name?.toLowerCase().includes(query) ||
          app.buyer?.email?.toLowerCase().includes(query)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleApprove = async () => {
    if (!selectedApplication || !user) return;

    const creditLimit = parseFloat(assignedCreditLimit);
    if (!creditLimit || creditLimit <= 0) {
      toast.error('Please enter a valid credit limit');
      return;
    }

    setProcessing(true);

    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('pay_later_accounts')
        .update({
          status: 'approved',
          assigned_credit_limit: creditLimit,
          available_credit: creditLimit,
          used_credit: 0,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: null,
        })
        .eq('id', selectedApplication.id);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_role: 'admin',
        action_type: 'pay_later_application_approved',
        entity_type: 'pay_later_account',
        entity_id: selectedApplication.id,
        action_status: 'success',
        details: {
          buyer_id: selectedApplication.buyer_id,
          assigned_credit_limit: creditLimit,
        },
      });

      toast.success('Application approved successfully');
      setShowApproveDialog(false);
      setSelectedApplication(null);
      setAssignedCreditLimit('');
      await fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication || !user) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);

    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('pay_later_accounts')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', selectedApplication.id);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_role: 'admin',
        action_type: 'pay_later_application_rejected',
        entity_type: 'pay_later_account',
        entity_id: selectedApplication.id,
        action_status: 'success',
        details: {
          buyer_id: selectedApplication.buyer_id,
          rejection_reason: rejectionReason.trim(),
        },
      });

      toast.success('Application rejected');
      setShowRejectDialog(false);
      setSelectedApplication(null);
      setRejectionReason('');
      await fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const openApproveDialog = (application: PayLaterAccountWithBuyer) => {
    setSelectedApplication(application);
    setAssignedCreditLimit(application.requested_credit_limit?.toString() || '');
    setShowApproveDialog(true);
  };

  const openRejectDialog = (application: PayLaterAccountWithBuyer) => {
    setSelectedApplication(application);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500/10 text-green-700 border-green-500/20">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="gap-1 bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="gap-1 bg-red-500/10 text-red-700 border-red-500/20">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user || profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Pay Later Approvals</h1>
          <p className="text-muted-foreground text-pretty">
            Review and approve Pay Later credit applications from buyers
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by buyer name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Applications ({filteredApplications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="py-16 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No applications found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No Pay Later applications have been submitted yet'}
                </p>
              </div>
            ) : (
              <div className="w-full max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Buyer</TableHead>
                      <TableHead className="whitespace-nowrap">Account Holder</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Requested Limit</TableHead>
                      <TableHead className="whitespace-nowrap">Submitted</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{application.buyer?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{application.buyer?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{application.account_holder_name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline">
                            {application.account_type === 'individual' ? 'Individual' : 'Company'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          ₹{application.requested_credit_limit?.toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(application.submitted_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getStatusBadge(application.status)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {application.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openApproveDialog(application)}
                                  className="h-8 gap-1"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRejectDialog(application)}
                                  className="h-8 gap-1"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {application.document_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="h-8 gap-1"
                              >
                                <a href={application.document_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                  View Doc
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>Approve Pay Later Application</DialogTitle>
              <DialogDescription>
                Assign a credit limit for {selectedApplication?.account_holder_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Buyer Information</Label>
                <div className="p-4 bg-muted/50 rounded space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{selectedApplication?.buyer?.full_name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span className="font-medium">{selectedApplication?.buyer?.email}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Account Type:</span>{' '}
                    <span className="font-medium">
                      {selectedApplication?.account_type === 'individual' ? 'Individual' : 'Company'}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Requested Limit:</span>{' '}
                    <span className="font-medium">
                      ₹{selectedApplication?.requested_credit_limit?.toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedLimit">Assigned Credit Limit (₹) *</Label>
                <Input
                  id="assignedLimit"
                  type="number"
                  value={assignedCreditLimit}
                  onChange={(e) => setAssignedCreditLimit(e.target.value)}
                  placeholder="Enter credit limit to assign"
                  min="1000"
                  step="1000"
                />
                <p className="text-xs text-muted-foreground">
                  You can approve a different amount than requested based on your assessment
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={processing} className="gap-2">
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approve Application
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reject Pay Later Application</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting {selectedApplication?.account_holder_name}'s application
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this application is being rejected..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be visible to the buyer and help them understand the decision
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={processing} variant="destructive" className="gap-2">
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Reject Application
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
