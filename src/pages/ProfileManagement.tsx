import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Camera, MapPin, Plus, Edit2, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { COUNTRIES, getCurrencyForCountry } from '@/utils/countries';
import type { DeliveryAddress } from '@/types/types';

export default function ProfileManagement() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    country: '',
  });

  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
  const [addressForm, setAddressForm] = useState({
    label: '',
    address: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        mobile_number: profile.mobile_number,
        country: profile.country || 'India',
      });

      // Parse delivery addresses from JSONB
      const addresses = profile.delivery_addresses || [];
      setDeliveryAddresses(Array.isArray(addresses) ? addresses : []);
    }
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Invalid file format. Please upload JPG or PNG image.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }

    setUploadingPhoto(true);

    try {
      // Delete old photo if exists
      if (profile?.profile_photo_url) {
        const oldPath = profile.profile_photo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-photos')
            .remove([`${user!.id}/${oldPath}`]);
        }
      }

      // Upload new photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: urlData.publicUrl })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile?.profile_photo_url) return;

    setUploadingPhoto(true);

    try {
      // Delete photo from storage
      const oldPath = profile.profile_photo_url.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('profile-photos')
          .remove([`${user!.id}/${oldPath}`]);
      }

      // Update profile to remove photo URL
      const { error } = await supabase
        .from('profiles')
        .update({ profile_photo_url: null })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profile photo removed successfully');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Full Name is required');
      return;
    }

    if (!formData.mobile_number.trim()) {
      toast.error('Mobile Number is required');
      return;
    }

    // Basic mobile number validation (10-15 digits)
    const mobileRegex = /^[0-9]{10,15}$/;
    if (!mobileRegex.test(formData.mobile_number.replace(/[\s\-\(\)]/g, ''))) {
      toast.error('Invalid mobile number format');
      return;
    }

    if (!formData.country) {
      toast.error('Country is required');
      return;
    }

    setLoading(true);

    try {
      // Get currency for selected country
      const currency = getCurrencyForCountry(formData.country);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          mobile_number: formData.mobile_number.trim(),
          country: formData.country,
          currency_preference: currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshProfile();
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        mobile_number: profile.mobile_number,
        country: profile.country || 'India',
      });
    }
    setEditMode(false);
  };

  const handleAddAddress = () => {
    setEditingAddressIndex(null);
    setAddressForm({ label: '', address: '' });
    setAddressDialogOpen(true);
  };

  const handleEditAddress = (index: number) => {
    setEditingAddressIndex(index);
    const addr = deliveryAddresses[index];
    setAddressForm({ label: addr.label || '', address: addr.address });
    setAddressDialogOpen(true);
  };

  const handleSaveAddress = async () => {
    if (!addressForm.address.trim()) {
      toast.error('Delivery address is required');
      return;
    }

    setLoading(true);

    try {
      let updatedAddresses: DeliveryAddress[];

      if (editingAddressIndex !== null) {
        // Edit existing address
        updatedAddresses = [...deliveryAddresses];
        updatedAddresses[editingAddressIndex] = {
          label: addressForm.label.trim() || undefined,
          address: addressForm.address.trim(),
        };
      } else {
        // Add new address
        updatedAddresses = [
          ...deliveryAddresses,
          {
            label: addressForm.label.trim() || undefined,
            address: addressForm.address.trim(),
          },
        ];
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          delivery_addresses: updatedAddresses,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      setDeliveryAddresses(updatedAddresses);
      setAddressDialogOpen(false);
      setAddressForm({ label: '', address: '' });
      toast.success(editingAddressIndex !== null ? 'Address updated successfully' : 'Address added successfully');
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (index: number) => {
    // Prevent deletion of last address for buyers
    if (profile?.role === 'buyer' && deliveryAddresses.length === 1) {
      toast.error('At least one delivery address is required');
      return;
    }

    setLoading(true);

    try {
      const updatedAddresses = deliveryAddresses.filter((_, i) => i !== index);

      const { error } = await supabase
        .from('profiles')
        .update({
          delivery_addresses: updatedAddresses,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      setDeliveryAddresses(updatedAddresses);
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Profile Management</h1>
            <p className="text-muted-foreground mt-1">Manage your personal information and preferences</p>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Profile Photo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Profile Photo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={uploadingPhoto}
                  />
                  <label htmlFor="photo-upload">
                    <Button variant="outline" asChild disabled={uploadingPhoto}>
                      <span>
                        {uploadingPhoto ? 'Uploading...' : profile.profile_photo_url ? 'Replace Photo' : 'Upload Photo'}
                      </span>
                    </Button>
                  </label>

                  {profile.profile_photo_url && (
                    <Button
                      variant="outline"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                    >
                      Remove Photo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG • Maximum size: 2MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              {!editMode && (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={!editMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  disabled={!editMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                  disabled={!editMode}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency Preference</Label>
                <Input
                  value={`${getCurrencyForCountry(formData.country)} (Auto-updated based on country)`}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {editMode && (
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={handleCancelEdit} disabled={loading}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Addresses Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Addresses
              </CardTitle>
              <Button variant="outline" onClick={handleAddAddress}>
                <Plus className="mr-2 h-4 w-4" />
                Add Address
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {deliveryAddresses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No delivery addresses added yet. Click "Add Address" to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {deliveryAddresses.map((addr, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      {addr.label && (
                        <p className="font-medium text-sm mb-1">{addr.label}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{addr.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAddress(index)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAddress(index)}
                        disabled={profile.role === 'buyer' && deliveryAddresses.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Dialog */}
        <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAddressIndex !== null ? 'Edit Address' : 'Add New Address'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_label">Address Label (Optional)</Label>
                <Input
                  id="address_label"
                  placeholder="e.g., Home, Office, Store"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_text">Full Address</Label>
                <Textarea
                  id="address_text"
                  placeholder="Enter complete delivery address"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddressDialogOpen(false);
                    setAddressForm({ label: '', address: '' });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveAddress} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Address'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
