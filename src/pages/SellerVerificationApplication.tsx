import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { VerificationStatus } from '@/types/types';

export default function SellerVerificationApplication() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'individual',
    business_address: '',
    aadhaar_number: '',
    company_id: '',
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    if (profile?.role !== 'seller') {
      navigate('/');
    }

    // Pre-fill form if already submitted
    if (profile?.business_name) {
      setFormData({
        business_name: profile.business_name || '',
        business_type: profile.business_type || 'individual',
        business_address: profile.business_address || '',
        aadhaar_number: '',
        company_id: '',
      });
    }
  }, [profile, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only JPG, PNG, and PDF files are allowed');
        return;
      }

      setDocumentFile(file);
    }
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!documentFile || !user) return null;

    setUploading(true);
    try {
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `verification-documents/${fileName}`;

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
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.business_name.trim()) {
      toast.error('Business name is required');
      return;
    }

    if (!formData.business_address.trim()) {
      toast.error('Business address is required');
      return;
    }

    if (formData.business_type === 'individual' && !formData.aadhaar_number.trim()) {
      toast.error('Aadhaar number is required for individual businesses');
      return;
    }

    if (formData.business_type === 'company' && !formData.company_id.trim()) {
      toast.error('Company ID is required for company businesses');
      return;
    }

    if (!documentFile && !profile?.verification_document_url) {
      toast.error('Please upload verification document');
      return;
    }

    setLoading(true);

    try {
      // Upload document if new file selected
      let documentUrl = profile?.verification_document_url || '';
      if (documentFile) {
        const uploadedUrl = await uploadDocument();
        if (!uploadedUrl) {
          setLoading(false);
          return;
        }
        documentUrl = uploadedUrl;
      }

      // Update profile with verification data
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: formData.business_name.trim(),
          business_type: formData.business_type,
          business_address: formData.business_address.trim(),
          verification_document_url: documentUrl,
          verification_status: 'pending',
          verification_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user!.id,
        user_role: 'seller',
        action_type: 'seller_verification_submitted',
        entity_type: 'profile',
        entity_id: user!.id,
        action_status: 'success',
        details: {
          business_name: formData.business_name,
          business_type: formData.business_type,
        },
      });

      toast.success('Verification application submitted successfully');
      await refreshProfile();
      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: VerificationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="outline" className="gap-1 border-gray-500 text-gray-500">
            <AlertCircle className="h-3 w-3" />
            Suspended
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!user || profile?.role !== 'seller') {
    return null;
  }

  const isApproved = profile?.verification_status === 'approved';
  const isPending = profile?.verification_status === 'pending';
  const isRejected = profile?.verification_status === 'rejected';
  const isSuspended = profile?.verification_status === 'suspended';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Seller Verification</h1>
            <p className="text-muted-foreground mt-1">
              Complete verification to access all platform features
            </p>
          </div>
          {profile?.verification_status && getStatusBadge(profile.verification_status)}
        </div>

        {isApproved && (
          <Card className="border-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-semibold">Verification Approved</p>
                  <p className="text-sm text-muted-foreground">
                    You have full access to all platform features
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <Card className="border-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-semibold">Verification Pending</p>
                  <p className="text-sm text-muted-foreground">
                    Your application is under review. You will be notified once approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isRejected && profile?.verification_rejection_reason && (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-8 w-8 text-red-500 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold">Verification Rejected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reason: {profile.verification_rejection_reason}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please update your information and resubmit.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isSuspended && (
          <Card className="border-gray-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-gray-500" />
                <div>
                  <p className="font-semibold">Account Suspended</p>
                  <p className="text-sm text-muted-foreground">
                    Your account has been suspended. Please contact support for assistance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isApproved && !isSuspended && (
          <Card>
            <CardHeader>
              <CardTitle>
                {isRejected ? 'Resubmit Verification Application' : 'Verification Application'}
              </CardTitle>
              <CardDescription>
                Provide your business details and upload verification documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Enter your business name"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type *</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_address">Business Address *</Label>
                  <Textarea
                    id="business_address"
                    value={formData.business_address}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    placeholder="Enter complete business address"
                    rows={3}
                    disabled={isPending}
                  />
                </div>

                {formData.business_type === 'individual' && (
                  <div className="space-y-2">
                    <Label htmlFor="aadhaar_number">Aadhaar Number *</Label>
                    <Input
                      id="aadhaar_number"
                      value={formData.aadhaar_number}
                      onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                      placeholder="Enter 12-digit Aadhaar number"
                      maxLength={12}
                      disabled={isPending}
                    />
                  </div>
                )}

                {formData.business_type === 'company' && (
                  <div className="space-y-2">
                    <Label htmlFor="company_id">Company ID *</Label>
                    <Input
                      id="company_id"
                      value={formData.company_id}
                      onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                      placeholder="Enter company registration ID"
                      disabled={isPending}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="document">
                    Verification Document * (JPG, PNG, PDF - Max 5MB)
                  </Label>
                  <Input
                    id="document"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    disabled={isPending || uploading}
                  />
                  {documentFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {documentFile.name}
                    </p>
                  )}
                  {profile?.verification_document_url && !documentFile && (
                    <p className="text-sm text-muted-foreground">
                      Document already uploaded
                    </p>
                  )}
                </div>

                {!isPending && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={loading || uploading}
                    >
                      {loading || uploading ? 'Submitting...' : isRejected ? 'Resubmit Application' : 'Submit Application'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/seller/dashboard')}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
