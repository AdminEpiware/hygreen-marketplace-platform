import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrencySymbol } from '@/utils/currency';
import { Settings as SettingsIcon } from 'lucide-react';

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

export default function Settings() {
  const { user, profile, currency, refreshProfile } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [allowBuyerContact, setAllowBuyerContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  useEffect(() => {
    if (profile) {
      setAllowBuyerContact(profile.allow_buyer_contact ?? false);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ currency_preference: selectedCurrency })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update currency preference');
      console.error(error);
    } else {
      toast.success('Currency preference updated successfully');
      await refreshProfile();
    }

    setLoading(false);
  };

  const handleContactToggle = async (checked: boolean) => {
    if (!user) return;
    setContactLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ allow_buyer_contact: checked })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update contact visibility');
      console.error(error);
    } else {
      setAllowBuyerContact(checked);
      toast.success(checked ? 'Contact details are now visible to buyers' : 'Contact details hidden from buyers');
      await refreshProfile();
    }
    setContactLoading(false);
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Currency Preference</CardTitle>
              <CardDescription>
                Choose your preferred currency for displaying prices across the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={setSelectedCurrency}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Current Settings</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Country: {profile.country || 'Not set'}</p>
                  <p>Currency: {getCurrencySymbol(currency)} {currency}</p>
                </div>
              </div>

              <Button onClick={handleSave} disabled={loading || selectedCurrency === currency}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Seller-only: Contact Visibility */}
          {profile.role === 'seller' && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Visibility</CardTitle>
                <CardDescription>
                  Control whether buyers can see your store contact details on product pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label>Allow buyers to see my contact details</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, your store contact number will be displayed to buyers on product pages
                    </p>
                  </div>
                  <Switch
                    checked={allowBuyerContact}
                    onCheckedChange={handleContactToggle}
                    disabled={contactLoading}
                  />
                </div>
                {profile.store_contact && (
                  <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
                    Contact on file: <span className="font-medium text-foreground">{profile.store_contact}</span>
                    {' '}— Update via <button className="text-primary underline-offset-2 hover:underline" onClick={() => navigate('/profile')}>Profile</button>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
