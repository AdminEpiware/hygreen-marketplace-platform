import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    const { email, userId } = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'Email and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    console.log(`Generated OTP for ${email}: ${otp}`); // For development/testing

    // Hash OTP
    const hashedOTP = await hashOTP(otp);

    // Set expiry time (5 minutes from now)
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Update profile with hashed OTP and expiry
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        email_otp: hashedOTP,
        otp_expiry_time: expiryTime,
        otp_attempts: 0, // Reset attempts
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to store OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email with OTP
    // Note: In production, use a proper email service like SendGrid, Mailgun, or Resend
    // For now, we'll use Supabase's built-in email (if configured) or log it
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification OTP</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Smart Grocery</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Email Verification</p>
          </div>
          
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #666; font-size: 16px;">Thank you for signing up! Please use the following OTP to verify your email address:</p>
            
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">Your verification code:</p>
              <p style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 0;">${otp}</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0;">
              <strong>Important:</strong> This OTP will expire in <strong>5 minutes</strong>.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this verification, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </body>
      </html>
    `;

    // For development: Log the OTP (remove in production)
    console.log(`\n=================================`);
    console.log(`OTP for ${email}: ${otp}`);
    console.log(`Expires at: ${expiryTime}`);
    console.log(`=================================\n`);

    // Send email with OTP using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Smart Grocery <onboarding@resend.dev>',
            to: [email],
            subject: 'Verify Your Email - Smart Grocery',
            html: emailHtml,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error('Failed to send email via Resend:', errorData);
          
          // Still return success since OTP is stored, but log the email failure
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'OTP generated but email sending failed. Please check logs.',
              expiresAt: expiryTime,
              devOTP: otp,
              emailError: 'Email service unavailable'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Email sent successfully via Resend');
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue anyway - OTP is stored in database
      }
    } else {
      console.warn('RESEND_API_KEY not configured. Email not sent. OTP:', otp);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        expiresAt: expiryTime,
        // For development only - remove in production:
        devOTP: otp
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-email-otp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
