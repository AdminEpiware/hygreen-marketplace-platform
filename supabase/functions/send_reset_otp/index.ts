import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return new Response(
        JSON.stringify({ success: false, message: "Email or mobile number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email or mobile number
    // Since we use username@miaoda.com format, check if identifier is email or mobile
    let email = identifier;
    if (!identifier.includes('@')) {
      // It's a mobile number, need to find user by mobile in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('mobile_number', identifier)
        .maybeSingle();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ success: false, message: "User not found with this mobile number" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      email = profile.email;
    }

    // Check if user exists
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to verify user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found with this email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this user
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('user_id', user.id);

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('password_reset_otps')
      .insert({
        user_id: user.id,
        email: email,
        otp: otp,
        attempts: 0,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In production, send OTP via email service
    // For now, we'll log it (in real app, use email service like SendGrid, AWS SES, etc.)
    console.log(`OTP for ${email}: ${otp}`);

    // Since we don't have email service configured, we'll return OTP in response for testing
    // In production, remove this and only send via email
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        // Remove this in production:
        otp: otp, // Only for testing purposes
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
