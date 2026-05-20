import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Download, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Document {
  type: 'aadhaar' | 'company_id';
  url: string;
  fileName: string;
}

interface PayLaterRequest {
  id: string;
  buyer_id: string;
  buyer_store_name: string;
  payment_plan: 'weekly' | 'monthly';
  documents: Document[];
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  profiles?: {
    owner_name: string;
    email: string;
    phone: string;
  };
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  company_id: 'Company ID / Other Document ID',
};

export default function SellerPayLaterApproval() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PayLaterRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PayLaterRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (user && profile?.role === 'seller') {
      fetchRequests();
    }
  }, [user, profile, filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('buyer_pay_later_requests')
        .select(`
          *,
          profiles!buyer_pay_later_requests_buyer_id_fkey (
            owner_name,
            email,
            phone
          )
        `)
        .eq('seller_id', user!.id)
        .order('requested_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: PayLaterRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('buyer_pay_later_requests')
        .update({
          status: 'approved',
          approved_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request approved successfully!');
      fetchRequests();
      setViewDialogOpen(false);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('buyer_pay_later_requests')
        .update({
          status: 'rejected',
          approved_by: user!.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Request rejected');
      fetchRequests();
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('pay-later-documents')
        .download(document.url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Document downloaded');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleViewDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('pay-later-documents')
        .createSignedUrl(document.url, 60); // 60 seconds expiry

      if (error) throw error;

      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to view document');
    }
  };

  if (profile?.role !== 'seller') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">This feature is only available for sellers.</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Pay Later Requests</h1>
            <p className="text-muted-foreground mt-1">Review and approve buyer requests</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/seller/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filterStatus === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('approved')}
          >
            Approved
          </Button>
          <Button
            variant={filterStatus === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('rejected')}
          >
            Rejected
          </Button>
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Requests List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No {filterStatus !== 'all' ? filterStatus : ''} requests found
              </p>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer Name</TableHead>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Payment Plan</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Requested On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.profiles?.owner_name || 'N/A'}
                        </TableCell>
                        <TableCell>{request.buyer_store_name}</TableCell>
                        <TableCell className="capitalize">{request.payment_plan}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{request.documents.length} files</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.requested_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === 'approved'
                                ? 'default'
                                : request.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Request Dialog */}
        {selectedRequest && (
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Pay Later Request Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Buyer Information */}
                <div className="space-y-4">
                  <h3 className="font-medium">Buyer Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedRequest.profiles?.owner_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Store Name</Label>
                      <p className="font-medium">{selectedRequest.buyer_store_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedRequest.profiles?.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedRequest.profiles?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Request Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Payment Plan</Label>
                      <p className="font-medium capitalize">{selectedRequest.payment_plan}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <Badge
                        variant={
                          selectedRequest.status === 'approved'
                            ? 'default'
                            : selectedRequest.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {selectedRequest.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Requested On</Label>
                      <p className="font-medium">
                        {new Date(selectedRequest.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedRequest.reviewed_at && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Reviewed On</Label>
                        <p className="font-medium">
                          {new Date(selectedRequest.reviewed_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedRequest.rejection_reason && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Rejection Reason</Label>
                      <p className="text-sm mt-1">{selectedRequest.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Uploaded Documents</h3>
                  <div className="space-y-2">
                    {selectedRequest.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">
                              {DOCUMENT_TYPE_LABELS[doc.type]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.fileName}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRejectDialogOpen(true);
                      }}
                      disabled={processing}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={processing}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {processing ? 'Approving...' : 'Approve'}
                    </Button>
                  </>
                )}
                {selectedRequest.status !== 'pending' && (
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejecting this request..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={processing}>
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
