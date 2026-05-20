import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
// @ts-ignore
import type { Profile, SignupData, BuyerStore } from '@/types/types';
import { toast } from 'sonner';
import { getCurrencyFromCountry, convertPrice, formatPrice, formatPriceWithUnit } from '@/utils/currency';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignupData) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  currency: string;
  exchangeRates: Record<string, number>;
  convertPrice: (basePrice: number, baseCurrency: string) => number;
  formatPrice: (amount: number) => string;
  formatPriceWithUnit: (amount: number, unit: string) => string;
  buyerStores: BuyerStore[];
  activeStore: BuyerStore | null;
  setActiveStore: (store: BuyerStore) => void;
  fetchBuyerStores: () => Promise<void>;
  createStore: (storeName: string, deliveryAddress: string) => Promise<BuyerStore | null>;
  updateStore: (storeId: string, storeName: string, deliveryAddress: string) => Promise<boolean>;
  deleteStore: (storeId: string) => Promise<boolean>;
  cartItemCount: number;
  refreshCartCount: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  isEmailVerified: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('INR');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [buyerStores, setBuyerStores] = useState<BuyerStore[]>([]);
  const [activeStore, setActiveStoreState] = useState<BuyerStore | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  const fetchBuyerStores = async () => {
    if (!user || profile?.role !== 'buyer') {
      setBuyerStores([]);
      setActiveStoreState(null);
      return;
    }

    const { data, error } = await supabase
      .from('buyer_stores')
      .select('*')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch buyer stores:', error);
      return;
    }

    if (data && data.length > 0) {
      setBuyerStores(data);
      
      // Set active store to the one marked as active, or the first one
      const active = data.find(s => s.is_active) || data[0];
      setActiveStoreState(active);
    } else {
      // Create default store if none exists
      await createDefaultStore();
    }
  };

  const createDefaultStore = async () => {
    if (!user || !profile || profile.role !== 'buyer') return;

    const { data, error } = await supabase
      .from('buyer_stores')
      .insert({
        buyer_id: user.id,
        store_name: 'My Store',
        delivery_address: profile.address || '',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create default store:', error);
      return;
    }

    if (data) {
      setBuyerStores([data]);
      setActiveStoreState(data);
    }
  };

  const setActiveStore = async (store: BuyerStore) => {
    if (!user) return;

    // Update is_active flag in database
    await supabase
      .from('buyer_stores')
      .update({ is_active: false })
      .eq('buyer_id', user.id);

    await supabase
      .from('buyer_stores')
      .update({ is_active: true })
      .eq('id', store.id);

    setActiveStoreState(store);
    
    // Refresh stores to get updated is_active flags
    await fetchBuyerStores();
    
    // Refresh cart count for new active store
    await refreshCartCount();
  };

  const createStore = async (storeName: string, deliveryAddress: string): Promise<BuyerStore | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('buyer_stores')
      .insert({
        buyer_id: user.id,
        store_name: storeName,
        delivery_address: deliveryAddress,
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create store:', error);
      toast.error('Failed to create store');
      return null;
    }

    await fetchBuyerStores();
    toast.success('Store created successfully');
    return data;
  };

  const updateStore = async (storeId: string, storeName: string, deliveryAddress: string): Promise<boolean> => {
    const { error } = await supabase
      .from('buyer_stores')
      .update({
        store_name: storeName,
        delivery_address: deliveryAddress,
      })
      .eq('id', storeId);

    if (error) {
      console.error('Failed to update store:', error);
      toast.error('Failed to update store');
      return false;
    }

    await fetchBuyerStores();
    toast.success('Store updated successfully');
    return true;
  };

  const deleteStore = async (storeId: string): Promise<boolean> => {
    // Check for pending payments
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('buyer_store_id', storeId)
      .eq('payment_status', 'pending');

    if (orders && orders.length > 0) {
      toast.error('Cannot delete store with pending payments');
      return false;
    }

    const { error } = await supabase
      .from('buyer_stores')
      .delete()
      .eq('id', storeId);

    if (error) {
      console.error('Failed to delete store:', error);
      toast.error('Failed to delete store');
      return false;
    }

    await fetchBuyerStores();
    toast.success('Store deleted successfully');
    return true;
  };

  const refreshCartCount = async () => {
    if (!user || !profile) {
      setCartItemCount(0);
      return;
    }

    // Only buyers have carts
    if (profile.role !== 'buyer') {
      setCartItemCount(0);
      return;
    }

    // Build query - filter by buyer_id
    let query = supabase
      .from('cart')
      .select('quantity')
      .eq('buyer_id', user.id);

    // If activeStore exists, filter by buyer_store_id
    // Otherwise, get all cart items for the buyer
    if (activeStore) {
      query = query.eq('buyer_store_id', activeStore.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch cart count:', error);
      setCartItemCount(0);
      return;
    }

    const totalCount = data?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
    setCartItemCount(totalCount);
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
    
    // Update currency based on profile
    // For HyGreen app, always use INR regardless of user's country
    // This ensures consistent pricing across all users
    if (profileData) {
      if (profileData.currency_preference) {
        setCurrency(profileData.currency_preference);
      } else {
        // Always default to INR for this Indian grocery app
        setCurrency('INR');
      }
    }
  };

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get_exchange_rates');
        
        if (error) {
          console.error('Failed to fetch exchange rates:', error);
          // Use fallback rates
          setExchangeRates({ 'USD': 1, 'INR': 83.12, 'GBP': 0.79, 'EUR': 0.92 });
        } else if (data?.rates) {
          setExchangeRates(data.rates);
        }
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
        setExchangeRates({ 'USD': 1, 'INR': 83.12, 'GBP': 0.79, 'EUR': 0.92 });
      }
    };

    fetchExchangeRates();
  }, []);

  useEffect(() => {
    supabase
      .auth
      .getSession()
      // @ts-ignore
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then((profileData) => {
            setProfile(profileData);
            // Fetch stores after profile is loaded
            if (profileData?.role === 'buyer') {
              fetchBuyerStores();
            }
          });
        }
      })
      // @ts-ignore
      .catch(error => {
        toast.error(`Failed to fetch user info: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });

    // @ts-ignore
    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          if (profileData?.role === 'buyer') {
            fetchBuyerStores();
          }
        });
      } else {
        setProfile(null);
        setBuyerStores([]);
        setActiveStoreState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: new Error('Invalid email format') };
      }

      // Validate password length
      if (password.length < 6) {
        return { error: new Error('Password must be at least 6 characters long') };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signIn error:', error);
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: new Error('Invalid email or password. Please check your credentials and try again.') };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: new Error('Please verify your email before logging in.') };
        }
        throw error;
      }
      return { error: null };
    } catch (error: any) {
      console.error('SignIn error:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (data: SignupData) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return { error: new Error('Invalid email format') };
      }

      // Validate password length
      if (data.password.length < 6) {
        return { error: new Error('Password must be at least 6 characters long') };
      }

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            mobile_number: data.mobile_number,
            address: data.address,
            country: data.country,
            role: data.role,
            store_name: data.store_name || null,
            store_address: data.store_address || null,
            store_contact: data.store_contact || null,
            pay_later_enabled: data.pay_later_enabled || false,
            weekly_plan_enabled: data.weekly_plan_enabled || false,
            monthly_plan_enabled: data.monthly_plan_enabled || false,
          },
        },
      });

      if (error) {
        console.error('Supabase signUp error:', error);
        // Provide more user-friendly error messages
        if (error.message.includes('already registered')) {
          return { error: new Error('This email is already registered. Please login instead.') };
        }
        if (error.message.includes('invalid')) {
          return { error: new Error('Invalid email or password format. Please check your input.') };
        }
        throw error;
      }
      return { error: null };
    } catch (error: any) {
      console.error('SignUp error:', error);
      return { error: error as Error };
    }
  };

  // Refresh cart count when active store changes
  useEffect(() => {
    if (activeStore) {
      refreshCartCount();
    }
  }, [activeStore]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setBuyerStores([]);
    setActiveStoreState(null);
    setCartItemCount(0);
  };

  const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
    // This function is deprecated - OTP system doesn't use email parameter alone
    // Kept for backward compatibility
    return { error: new Error('Please use the signup page to resend OTP') };
  };

  const isEmailVerified = (): boolean => {
    // Check custom is_email_verified field instead of email_confirmed_at
    return profile?.is_email_verified === true;
  };

  // Currency conversion helpers
  const convertPriceHelper = (basePrice: number, baseCurrency: string): number => {
    return convertPrice(basePrice, baseCurrency, currency, exchangeRates);
  };

  const formatPriceHelper = (amount: number): string => {
    return formatPrice(amount, currency);
  };

  const formatPriceWithUnitHelper = (amount: number, unit: string): string => {
    return formatPriceWithUnit(amount, currency, unit);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      refreshProfile,
      currency,
      exchangeRates,
      convertPrice: convertPriceHelper,
      formatPrice: formatPriceHelper,
      formatPriceWithUnit: formatPriceWithUnitHelper,
      buyerStores,
      activeStore,
      setActiveStore,
      fetchBuyerStores,
      createStore,
      updateStore,
      deleteStore,
      cartItemCount,
      refreshCartCount,
      resendVerificationEmail,
      isEmailVerified,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
