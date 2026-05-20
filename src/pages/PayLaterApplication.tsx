import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, XCircle, Upload, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { PayLaterAccount } from '@/types/types';

export default function PayLaterApplication() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [existingAccount, setExistingAccount] = useState<PayLaterAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [requestedCreditLimit, setRequestedCreditLimit] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'buyer') {
      navigate('/');
      return;
    }
    fetchExistingAccount();
  }, [profile, navigate]);

  const fetchExistingAccount = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_later_accounts')
        .select('*')
        .eq('buyer_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingAccount(data);
        // Pre-fill form for rejected applications
        if (data.status === 'rejected') {
          setAccountHolderName(data.account_holder_name);
          setAccountType(data.account_type);
          setAadhaarNumber(data.aadhaar_number || '');
          setCompanyId(data.company_id || '');
          setRequestedCreditLimit(data.requested_credit_limit?.toString() || '');
        }
      }
    } catch (error) {
      console.error('Error fetching Pay Later account:', error);
      toast.error('Failed to load account information');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setDocumentFile(file);
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!documentFile || !user) return null;

    try {
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `pay-later-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, documentFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validation
    if (!accountHolderName.trim()) {
      toast.error('Please enter account holder name');
      return;
    }

    if (accountType === 'individual' && !aadhaarNumber.trim()) {
      toast.error('Please enter Aadhaar number');
      return;
    }

    if (accountType === 'company' && !companyId.trim()) {
      toast.error('Please enter Company ID');
      return;
    }

    if (!requestedCreditLimit || parseFloat(requestedCreditLimit) <= 0) {
      toast.error('Please enter a valid credit limit');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    // For new applications, document is required
    if (!existingAccount && !documentFile) {
      toast.error('Please upload a document');
      return;
    }

    setSubmitting(true);

    try {
      // Upload document if new file selected
      let documentUrl = existingAccount?.document_url || null;
      if (documentFile) {
        const uploadedUrl = await uploadDocument();
        if (!uploadedUrl) {
          setSubmitting(false);
          return;
        }
        documentUrl = uploadedUrl;
      }

      const accountData = {
        buyer_id: user.id,
        account_holder_name: accountHolderName.trim(),
        account_type: accountType,
        aadhaar_number: accountType === 'individual' ? aadhaarNumber.trim() : null,
        company_id: accountType === 'company' ? companyId.trim() : null,
        document_url: documentUrl,
        requested_credit_limit: parseFloat(requestedCreditLimit),
        terms_accepted: termsAccepted,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
      };

      if (existingAccount) {
        // Update existing application (resubmission)
        const { error } = await supabase
          .from('pay_later_accounts')
          .update(accountData)
          .eq('id', existingAccount.id);

        if (error) throw error;
      } else {
        // Insert new application
        const { error } = await supabase
          .from('pay_later_accounts')
          .insert(accountData);

        if (error) throw error;
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_role: 'buyer',
        action_type: 'pay_later_application_submitted',
        entity_type: 'pay_later_account',
        entity_id: existingAccount?.id || null,
        action_status: 'success',
        details: {
          account_type: accountType,
          requested_credit_limit: parseFloat(requestedCreditLimit),
        },
      });

      toast.success('Application submitted successfully');
      await fetchExistingAccount();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
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
            Pending Review
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

  if (!user || profile?.role !== 'buyer') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Pay Later Application</h1>
          <p className="text-muted-foreground text-pretty">
            Apply for a Pay Later credit account to shop now and pay later
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Existing Account Status */}
            {existingAccount && (
              <Card className={
                existingAccount.status === 'approved' ? 'border-green-500/20' :
                existingAccount.status === 'pending' ? 'border-yellow-500/20' :
                'border-red-500/20'
              }>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Current Application Status
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {existingAccount.status === 'approved' && 'Your Pay Later account is active'}
                        {existingAccount.status === 'pending' && 'Your application is under review'}
                        {existingAccount.status === 'rejected' && 'Your application was rejected'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(existingAccount.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {existingAccount.status === 'approved' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Credit Limit</p>
                        <p className="text-2xl font-semibold">
                          ₹{existingAccount.assigned_credit_limit?.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Available Credit</p>
                        <p className="text-2xl font-semibold text-green-600">
                          ₹{existingAccount.available_credit?.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Used Credit</p>
                        <p className="text-2xl font-semibold text-orange-600">
                          ₹{existingAccount.used_credit?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {existingAccount.status === 'pending' && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-4">
                      <div className="flex gap-3">
                        <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Application Under Review</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Our team is reviewing your application. You will be notified once a decision is made.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {existingAccount.status === 'rejected' && existingAccount.rejection_reason && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Rejection Reason</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {existingAccount.rejection_reason}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            You can update your information and resubmit your application below.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Application Form */}
            {(!existingAccount || existingAccount.status === 'rejected') && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {existingAccount ? 'Resubmit Application' : 'New Application'}
                  </CardTitle>
                  <CardDescription>
                    Fill in the details below to apply for a Pay Later credit account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Holder Name */}
                    <div className="space-y-2">
                      <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                      <Input
                        id="accountHolderName"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="Enter full name as per documents"
                        required
                      />
                    </div>

                    {/* Account Type */}
                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type *</Label>
                      <Select value={accountType} onValueChange={(value: 'individual' | 'company') => setAccountType(value)}>
                        <SelectTrigger id="accountType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Aadhaar Number (for Individual) */}
                    {accountType === 'individual' && (
                      <div className="space-y-2">
                        <Label htmlFor="aadhaarNumber">Aadhaar Number *</Label>
                        <Input
                          id="aadhaarNumber"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value)}
                          placeholder="Enter 12-digit Aadhaar number"
                          maxLength={12}
                          required
                        />
                      </div>
                    )}

                    {/* Company ID (for Company) */}
                    {accountType === 'company' && (
                      <div className="space-y-2">
                        <Label htmlFor="companyId">Company ID / Registration Number *</Label>
                        <Input
                          id="companyId"
                          value={companyId}
                          onChange={(e) => setCompanyId(e.target.value)}
                          placeholder="Enter company registration number"
                          required
                        />
                      </div>
                    )}

                    {/* Document Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="document">
                        Upload Document {!existingAccount && '*'}
                      </Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="document"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                        {documentFile && (
                          <Badge variant="outline" className="gap-1">
                            <Upload className="h-3 w-3" />
                            {documentFile.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload Aadhaar card or Company registration document (JPG, PNG, or PDF, max 5MB)
                      </p>
                    </div>

                    {/* Requested Credit Limit */}
                    <div className="space-y-2">
                      <Label htmlFor="creditLimit">Requested Credit Limit (₹) *</Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        value={requestedCreditLimit}
                        onChange={(e) => setRequestedCreditLimit(e.target.value)}
                        placeholder="Enter desired credit limit"
                        min="1000"
                        step="1000"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum ₹1,000. Final credit limit will be determined by our team.
                      </p>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="flex items-start gap-3 p-4 bg-muted/50 rounded">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="terms" className="cursor-pointer font-normal">
                          I accept the Pay Later terms and conditions *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By checking this box, you agree to our credit terms, interest rates, and repayment policies.
                        </p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4">
                      <Button type="submit" disabled={submitting} className="gap-2">
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            {existingAccount ? 'Resubmit Application' : 'Submit Application'}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/buyer/dashboard')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
