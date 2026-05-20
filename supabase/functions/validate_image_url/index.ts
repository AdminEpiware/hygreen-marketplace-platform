import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache for validated URLs (in-memory, resets on function restart)
const validationCache = new Map<string, { valid: boolean; timestamp: number; error?: string }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

interface ValidationResult {
  valid: boolean;
  error?: string;
  contentType?: string;
  size?: number;
}

/**
 * Sanitize URL to prevent XSS and injection attacks
 */
function sanitizeUrl(url: string): string {
  // Remove any javascript: or data: protocols
  if (url.match(/^(javascript|data|vbscript|file):/i)) {
    throw new Error("Invalid URL protocol");
  }
  
  // Ensure URL starts with http:// or https://
  if (!url.match(/^https?:\/\//i)) {
    throw new Error("URL must start with http:// or https://");
  }
  
  return url.trim();
}

/**
 * Validate image URL
 */
async function validateImageUrl(url: string): Promise<ValidationResult> {
  try {
    // Sanitize URL
    const sanitizedUrl = sanitizeUrl(url);
    
    // Check cache
    const cached = validationCache.get(sanitizedUrl);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return {
        valid: cached.valid,
        error: cached.error,
      };
    }
    
    // Validate URL format
    try {
      new URL(sanitizedUrl);
    } catch {
      const result = { valid: false, error: "Invalid URL format" };
      validationCache.set(sanitizedUrl, { ...result, timestamp: Date.now() });
      return result;
    }
    
    // Fetch image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(sanitizedUrl, {
        method: "HEAD", // Use HEAD to avoid downloading full image
        signal: controller.signal,
        headers: {
          "User-Agent": "Smart-Grocery-Image-Validator/1.0",
        },
      });
      
      clearTimeout(timeoutId);
      
      // Check HTTP status
      if (!response.ok) {
        const result = { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
        validationCache.set(sanitizedUrl, { ...result, timestamp: Date.now() });
        return result;
      }
      
      // Check content type
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        const result = { valid: false, error: `Invalid content type: ${contentType}` };
        validationCache.set(sanitizedUrl, { ...result, timestamp: Date.now() });
        return result;
      }
      
      // Check content length (optional, max 10MB)
      const contentLength = response.headers.get("content-length");
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      if (size > 10 * 1024 * 1024) {
        const result = { valid: false, error: "Image size exceeds 10MB limit" };
        validationCache.set(sanitizedUrl, { ...result, timestamp: Date.now() });
        return result;
      }
      
      // Valid image
      const result = {
        valid: true,
        contentType,
        size,
      };
      validationCache.set(sanitizedUrl, { valid: true, timestamp: Date.now() });
      return result;
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        const result = { valid: false, error: "Request timeout" };
        validationCache.set(sanitizedUrl, { ...result, timestamp: Date.now() });
        return result;
      }
      throw error;
    }
    
  } catch (error) {
    console.error("Validation error:", error);
    return {
      valid: false,
      error: error.message || "Failed to validate image URL",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await validateImageUrl(imageUrl);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "An error occurred during validation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
