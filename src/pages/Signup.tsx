import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ShoppingBag, Store, CreditCard, Mail, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { SUPPORTED_COUNTRIES } from '@/utils/currency';
import type { UserRole } from '@/types/types';
import { HyGreenLogo } from '@/components/common/HyGreenLogo';

export default function Signup() {
  const location = useLocation();
  const locationState = location.state as { email?: string; userId?: string; fromLogin?: boolean } | null;
  
  const [formData, setFormData] = useState({
    email: locationState?.email || '',
    password: '',
    confirmPassword: '',
    full_name: '',
    mobile_number: '',
    address: '',
    country: '',
    role: 'buyer' as UserRole,
    store_name: '',
    store_address: '',
    store_contact: '',
    pay_later_enabled: false,
    weekly_plan_enabled: false,
    monthly_plan_enabled: false,
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOTPStep, setShowOTPStep] = useState(locationState?.fromLogin || false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [userId, setUserId] = useState<string>(locationState?.userId || '');
  const [devOTP, setDevOTP] = useState<string>(''); // For development only
  const { signUp } = useAuth();
  const navigate = useNavigate();


  // Countdown timer for OTP expiry
  useEffect(() => {
    if (showOTPStep && otpExpiry) {
      const timer = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((otpExpiry.getTime() - now.getTime()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
          toast.error('OTP expired. Please request a new one.');
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showOTPStep, otpExpiry]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOTP = async (userIdToSend: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email-otp', {
        body: { email: formData.email, userId: userIdToSend },
      });

      if (error) throw error;

      if (data.expiresAt) {
        setOtpExpiry(new Date(data.expiresAt));
        setTimeRemaining(300); // Reset to 5 minutes
      }

      // For development only - remove in production
      if (data.devOTP) {
        setDevOTP(data.devOTP);
        console.log('Development OTP:', data.devOTP);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      return { success: false, error: err.message };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error('Please agree to the User Agreement and Privacy Policy');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password length validation (Supabase requires minimum 6 characters)
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!formData.country) {
      toast.error('Please select your country');
      return;
    }

    // Password matching validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    // Prevent admin role registration
    if (formData.role === 'admin') {
      toast.error('Admin registration is not allowed');
      return;
    }

    // Seller-specific validation
    if (formData.role === 'seller') {
      if (!formData.store_name.trim()) {
        toast.error('Please enter your store name');
        return;
      }
      if (!formData.store_address.trim()) {
        toast.error('Please enter your store address');
        return;
      }
      if (!formData.store_contact.trim()) {
        toast.error('Please enter your store contact number');
        return;
      }
      if (formData.pay_later_enabled && !formData.weekly_plan_enabled && !formData.monthly_plan_enabled) {
        toast.error('Please select at least one payment plan (Weekly or Monthly)');
        return;
      }
    }

    setLoading(true);

    const { error } = await signUp(formData);

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      // Get the newly created user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // Send OTP
        const otpResult = await sendOTP(user.id);
        
        if (otpResult.success) {
          toast.success('Account created! Please verify your email with the OTP sent to your inbox.');
          setShowOTPStep(true);
        } else {
          toast.error('Failed to send OTP. Please try again.');
        }
      }
      
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }

    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { otp, userId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Email verified successfully! You can now log in.');
        navigate('/login');
      } else if (data.error) {
        if (data.remainingAttempts !== undefined) {
          toast.error(`${data.error}. ${data.remainingAttempts} attempts remaining.`);
        } else {
          toast.error(data.error);
        }
      }
    } catch (err: any) {
      const errorText = await err?.context?.text?.();
      const errorData = errorText ? JSON.parse(errorText) : {};
      toast.error(errorData.error || 'Failed to verify OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setResending(true);

    const result = await sendOTP(userId);

    if (result.success) {
      toast.success('OTP resent successfully! Please check your email.');
      setResendCooldown(30);
      setOtp(''); // Clear previous OTP input
    } else {
      toast.error('Failed to resend OTP. Please try again.');
    }

    setResending(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-6">
          <div className="flex flex-col items-center space-y-6">
            <HyGreenLogo size="sm" imgClassName="w-[195px] md:w-[230px]" />
          </div>
          <CardTitle className="text-2xl text-center">
            {showOTPStep ? 'Verify Your Email' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-center">
            {showOTPStep 
              ? `Enter the 6-digit OTP sent to ${formData.email}`
              : 'Join our marketplace today'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showOTPStep ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required fields indicator */}
              <div className="text-sm text-muted-foreground">
                <span className="text-destructive">*</span> indicates required fields
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters required
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile_number">
                    Mobile Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mobile_number"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">
                  Address <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder="Enter your delivery address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">
                Country <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
                required
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>
                I am a <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="buyer" />
                  <Label htmlFor="buyer" className="font-normal cursor-pointer">
                    Buyer - I want to purchase groceries
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seller" id="seller" />
                  <Label htmlFor="seller" className="font-normal cursor-pointer">
                    Seller - I want to sell groceries
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Seller-specific fields */}
            {formData.role === 'seller' && (
              <>
                <Separator className="my-6" />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Store Information</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provide details about your store to help buyers find and contact you
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="store_name">
                      Store Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="store_name"
                      type="text"
                      placeholder="Enter your store name"
                      value={formData.store_name}
                      onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store_address">
                      Store Address <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="store_address"
                      placeholder="Enter your store's physical address"
                      value={formData.store_address}
                      onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                      required
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store_contact">
                      Store Contact Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="store_contact"
                      type="tel"
                      placeholder="+1234567890"
                      value={formData.store_contact}
                      onChange={(e) => setFormData({ ...formData, store_contact: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">
                      Payment Configuration <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configure payment options for your store
                  </p>

                  <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded">
                    <Checkbox
                      id="pay_later_enabled"
                      checked={formData.pay_later_enabled}
                      onCheckedChange={(checked) => {
                        const enabled = checked === true;
                        setFormData({
                          ...formData,
                          pay_later_enabled: enabled,
                          weekly_plan_enabled: enabled ? formData.weekly_plan_enabled : false,
                          monthly_plan_enabled: enabled ? formData.monthly_plan_enabled : false,
                        });
                      }}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="pay_later_enabled" className="cursor-pointer font-medium">
                        Enable Pay Later for my store
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Allow buyers to purchase now and pay later with flexible payment plans
                      </p>
                    </div>
                  </div>

                  {formData.pay_later_enabled && (
                    <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                      <Label className="text-sm font-medium">
                        Select Payment Plans <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Choose at least one payment plan option for your buyers
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="weekly_plan"
                            checked={formData.weekly_plan_enabled}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, weekly_plan_enabled: checked === true })
                            }
                          />
                          <div className="space-y-1">
                            <Label htmlFor="weekly_plan" className="cursor-pointer font-normal">
                              Weekly Payment Plan
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Buyers can pay weekly for their purchases
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="monthly_plan"
                            checked={formData.monthly_plan_enabled}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, monthly_plan_enabled: checked === true })
                            }
                          />
                          <div className="space-y-1">
                            <Label htmlFor="monthly_plan" className="cursor-pointer font-normal">
                              Monthly Payment Plan
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Buyers can pay monthly for their purchases
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />
              </>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                I agree to the User Agreement and Privacy Policy. By using this service, I consent to the collection and use of my personal information as described.
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              {devOTP && (
                <Alert className="border-yellow-600/20 bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Development Mode:</strong> OTP is {devOTP}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Check your email for the 6-digit OTP</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {timeRemaining > 0 
                      ? `Expires in ${formatTime(timeRemaining)}`
                      : 'OTP expired'
                    }
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={resending || resendCooldown > 0 || timeRemaining === 0}
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    'Resend OTP'
                  )}
                </Button>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={verifying || otp.length !== 6 || timeRemaining === 0}
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Email
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>Didn't receive the OTP?</p>
                <p className="mt-1">Check your spam folder or click Resend OTP</p>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
