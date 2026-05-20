import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ShoppingBag, Mail, Loader2 } from 'lucide-react';
import { HyGreenLogo } from '@/components/common/HyGreenLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [unverifiedUserId, setUnverifiedUserId] = useState<string>('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/products';

  const handleSendVerificationOTP = async () => {
    if (!unverifiedUserId || !email) {
      toast.error('Unable to send verification email. Please try again.');
      return;
    }

    setSendingOTP(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email-otp', {
        body: { email, userId: unverifiedUserId }
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        console.error('Error sending OTP:', errorMsg || error?.message);
        toast.error('Failed to send verification email. Please try again.');
      } else {
        toast.success('Verification email sent! Please check your inbox and enter the OTP.');
        // Redirect to signup page with email pre-filled for OTP verification
        navigate('/signup', { state: { email, userId: unverifiedUserId, fromLogin: true } });
      }
    } catch (err) {
      console.error('Error sending verification OTP:', err);
      toast.error('Failed to send verification email. Please try again.');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setShowVerificationPrompt(false);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      // Fetch user profile to check email verification
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_email_verified')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          // Check if email is verified using our custom field
          if (!profile.is_email_verified) {
            // Sign out the user
            await supabase.auth.signOut();
            
            // Show verification prompt
            setUnverifiedUserId(user.id);
            setShowVerificationPrompt(true);
            setLoading(false);
            return;
          }

          toast.success('Login successful!');
          
          // Role-based redirection
          if (profile.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else if (profile.role === 'seller') {
            navigate('/seller/dashboard', { replace: true });
          } else if (profile.role === 'buyer') {
            // Buyers land on the home page; they can navigate to their dashboard manually
            navigate('/', { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        } else {
          navigate(from, { replace: true });
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-6">
          <div className="flex flex-col items-center space-y-6">
            <HyGreenLogo size="sm" imgClassName="w-[195px] md:w-[230px]" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showVerificationPrompt ? (
            <div className="space-y-4">
              <Alert className="border-primary/50 bg-primary/5">
                <Mail className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  Your email address is not verified. Please verify your email to continue.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  We'll send a 6-digit verification code to:
                </p>
                <p className="font-medium">{email}</p>
                
                <Button
                  onClick={handleSendVerificationOTP}
                  disabled={sendingOTP}
                  className="w-full"
                  size="lg"
                >
                  {sendingOTP ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Verification Email
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVerificationPrompt(false);
                    setUnverifiedUserId('');
                  }}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          )}
          
          {!showVerificationPrompt && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
