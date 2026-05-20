import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fixed exchange rates (in production, fetch from API like exchangerate-api.com)
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.000000,
  'INR': 83.120000,
  'GBP': 0.790000,
  'EUR': 0.920000,
  'AUD': 1.520000,
  'CAD': 1.360000,
  'JPY': 149.500000,
  'CNY': 7.240000,
  'KRW': 1320.000000,
  'SGD': 1.340000,
  'HKD': 7.820000,
  'THB': 35.500000,
  'MYR': 4.720000,
  'IDR': 15680.000000,
  'PHP': 56.200000,
  'VND': 24500.000000,
  'AED': 3.670000,
  'SAR': 3.750000,
  'ILS': 3.640000,
  'BRL': 4.970000,
  'MXN': 17.050000,
  'ZAR': 18.750000,
  'NZD': 1.650000,
  'CHF': 0.880000,
  'NGN': 1540.000000,
  'EGP': 48.500000,
  'KES': 129.000000,
  'ARS': 830.000000,
  'CLP': 970.000000,
  'COP': 4100.000000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Update exchange rates in database
    for (const [currency, rate] of Object.entries(EXCHANGE_RATES)) {
      await supabase
        .from('exchange_rates')
        .upsert({
          currency_code: currency,
          rate: rate,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'currency_code',
        });
    }

    // Fetch all rates from database
    const { data: rates, error } = await supabase
      .from('exchange_rates')
      .select('currency_code, rate');

    if (error) {
      console.error("Error fetching rates:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to fetch exchange rates" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to object format
    const ratesObject: Record<string, number> = {};
    rates.forEach((rate: { currency_code: string; rate: number }) => {
      ratesObject[rate.currency_code] = rate.rate;
    });

    return new Response(
      JSON.stringify({
        success: true,
        rates: ratesObject,
        updated_at: new Date().toISOString(),
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
