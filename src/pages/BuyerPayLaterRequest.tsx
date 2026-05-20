import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { DocumentUpload, type UploadedDocument } from '@/components/common/DocumentUpload';
import { ArrowLeft, Calendar, CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreName } from '@/lib/store';

interface Store {
  id: string;
  store_name?: string | null;
  business_name?: string | null;
  full_name?: string | null;
  owner_name?: string | null;
}

interface ExistingRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_plan: string;
  requested_at: string;
  rejection_reason?: string;
}

interface PayLaterAccount {
  assigned_credit_limit?: number | null;
  requested_credit_limit?: number | null;
  status?: string;
}

export default function BuyerPayLaterRequest() {
  const { storeId } = useParams<{ storeId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [existingRequest, setExistingRequest] = useState<ExistingRequest | null>(null);
  const [payLaterAccount, setPayLaterAccount] = useState<PayLaterAccount | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<'weekly' | 'monthly'>('weekly');
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  useEffect(() => {
    if (user && profile?.role === 'buyer' && storeId) {
      fetchStoreDetails();
      checkExistingRequest();
      fetchPayLaterAccount();
    }
  }, [user, profile, storeId]);

  const fetchStoreDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, store_name, business_name, full_name, owner_name')
        .eq('id', storeId)
        .maybeSingle();

      if (error) throw error;

      // Use data if found; fall back so the form still works without store info
      setStore(data ?? { id: storeId! });
    } catch (error) {
      console.error('Error fetching store:', error);
      setStore({ id: storeId! });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayLaterAccount = async () => {
    try {
      const { data } = await supabase
        .from('pay_later_accounts')
        .select('assigned_credit_limit, requested_credit_limit, status')
        .eq('buyer_id', user!.id)
        .eq('seller_id', storeId!)
        .maybeSingle();
      if (data) setPayLaterAccount(data);
    } catch (error) {
      console.error('Error fetching pay later account:', error);
    }
  };

  const checkExistingRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('buyer_pay_later_requests')
        .select('id, status, payment_plan, requested_at, rejection_reason')
        .eq('buyer_id', user!.id)
        .eq('store_id', storeId!)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setExistingRequest(data);
      }
    } catch (error) {
      console.error('Error checking existing request:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (documents.length < 2) {
      toast.error('Please upload at least 2 documents');
      return;
    }

    if (!store) {
      toast.error('Store information not available');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('buyer_pay_later_requests')
        .insert({
          buyer_id: user!.id,
          seller_id: store.id,
          store_id: store.id,
          store_name: getStoreName(store),
          buyer_store_name: profile!.full_name || profile!.email || 'N/A',
          payment_plan: paymentPlan,
          documents: documents,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Pay Later request submitted successfully!');
      navigate(`/store/${storeId}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (profile?.role !== 'buyer') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">This feature is only available for buyers.</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!store) {
    // Still loading — store is always set after fetchStoreDetails resolves
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Loading store…</p>
        </main>
      </div>
    );
  }

  // Show existing request status if any
  if (existingRequest && existingRequest.status !== 'rejected') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Pay Later Request Status</h1>
              <p className="text-muted-foreground mt-1">Request for {getStoreName(store)}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate(`/store/${storeId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                {existingRequest.status === 'pending' && (
                  <>
                    <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">Request Pending</p>
                      <p className="text-sm text-muted-foreground">
                        Your request is under review by the seller
                      </p>
                    </div>
                  </>
                )}
                {existingRequest.status === 'approved' && (
                  <>
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Request Approved</p>
                      <p className="text-sm text-muted-foreground">
                        You can now use Pay Later for this store
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm text-muted-foreground">Store</Label>
                  <p className="font-medium">{getStoreName(store)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Payment Plan</Label>
                  <p className="font-medium capitalize">{existingRequest.payment_plan}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Requested On</Label>
                  <p className="font-medium">
                    {new Date(existingRequest.requested_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge variant={existingRequest.status === 'approved' ? 'default' : 'secondary'}>
                    {existingRequest.status}
                  </Badge>
                </div>
              </div>
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
            <h1 className="text-3xl font-semibold">Request Pay Later Access</h1>
            <p className="text-muted-foreground mt-1">Submit documents for verification</p>
          </div>
          <Button variant="ghost" onClick={() => navigate(`/store/${storeId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Button>
        </div>

        {/* Show rejection reason if previous request was rejected */}
        {existingRequest && existingRequest.status === 'rejected' && (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Previous Request Rejected</p>
                  {existingRequest.rejection_reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reason: {existingRequest.rejection_reason}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    You can submit a new request with updated documents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Info */}
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Store Name</Label>
                  <p className="font-medium">{getStoreName(store)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Owner</Label>
                  <p className="font-medium">{store.owner_name || store.full_name || '—'}</p>
                </div>
                {/* Credit limit — shown when a pay_later_account exists */}
                {payLaterAccount && (
                  <div className="md:col-span-2 pt-3 border-t">
                    <Label className="text-sm text-muted-foreground">Credit Limit</Label>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {payLaterAccount.assigned_credit_limit != null ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-lg">
                            ₹{payLaterAccount.assigned_credit_limit.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">(assigned by seller)</span>
                        </div>
                      ) : payLaterAccount.requested_credit_limit != null ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            ₹{payLaterAccount.requested_credit_limit.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">(requested, pending approval)</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Payment Plan</CardTitle>
              <CardDescription>Choose how often you want to settle payments</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentPlan} onValueChange={(value: any) => setPaymentPlan(value)}>
                <div className="grid md:grid-cols-2 gap-4">
                  <label
                    htmlFor="weekly"
                    className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentPlan === 'weekly' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="weekly" id="weekly" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <p className="font-medium">Weekly Payment</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Settle your dues every week
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="monthly"
                    className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentPlan === 'monthly' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <p className="font-medium">Monthly Payment</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Settle your dues every month
                      </p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
              <CardDescription>
                Upload at least 2 documents for identity verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload documents={documents} onDocumentsChange={setDocuments} />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/store/${storeId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || documents.length < 2}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
