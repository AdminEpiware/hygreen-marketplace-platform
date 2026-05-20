import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;

// Hash OTP using Web Crypto API
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { otp, userId } = await req.json();

    if (!otp || !userId) {
      return new Response(
        JSON.stringify({ error: 'OTP and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: 'Invalid OTP format. Must be 6 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile with OTP data
    const { data: profile, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('email_otp, otp_expiry_time, otp_attempts, is_email_verified')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (profile.is_email_verified) {
      return new Response(
        JSON.stringify({ error: 'Email already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP exists
    if (!profile.email_otp || !profile.otp_expiry_time) {
      return new Response(
        JSON.stringify({ error: 'No OTP found. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if too many attempts
    if (profile.otp_attempts >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP expired
    const now = new Date();
    const expiryTime = new Date(profile.otp_expiry_time);
    if (now > expiryTime) {
      return new Response(
        JSON.stringify({ error: 'OTP expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the provided OTP
    const hashedInputOTP = await hashOTP(otp);

    // Compare hashed OTPs
    if (hashedInputOTP !== profile.email_otp) {
      // Increment failed attempts
      await supabaseClient
        .from('profiles')
        .update({ otp_attempts: profile.otp_attempts + 1 })
        .eq('id', userId);

      const remainingAttempts = MAX_ATTEMPTS - (profile.otp_attempts + 1);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid OTP',
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP is valid - mark email as verified and clear OTP data
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        is_email_verified: true,
        email_otp: null,
        otp_expiry_time: null,
        otp_attempts: 0,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email verified successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-email-otp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
