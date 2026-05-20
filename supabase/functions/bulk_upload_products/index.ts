import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_IMAGES: Record<string, string> = {
  vegetables: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4ad056d3-bfaf-4281-9b60-ff376887b64f.jpg',
  fruits: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f826d455-53f6-4cfb-a66b-45f9ee82b240.jpg',
  grocery: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4564ddc4-bf70-40d6-abc7-0abd56a2a571.jpg',
  dairy: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_dca201d4-a2b1-4723-98c0-acf0fda0a166.jpg',
  bakery: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_65229494-c829-4eeb-b23c-67a8aff2c832.jpg',
  meat: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5bd9c6eb-6dce-4157-bec5-44dcda46413a.jpg',
  beverages: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f75af92b-0f5b-439e-96f0-f5957f5feb8c.jpg',
  snacks: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b9c1a5df-4b25-4825-a977-e47ac8442ef4.jpg',
};

interface ProductRow {
  'Product Name': string;
  'Price': number;
  'Quantity': number;
  'Product Code': string;
  'Category': string;
  'Store Name': string;
  'Brand Name'?: string;
  'Currency'?: string;
  'Product Image Link'?: string;
  'Description'?: string;
  'Barcode'?: string;
  'Unit'?: string;
  'Image URL'?: string;
  validation: {
    valid: boolean;
    errors: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { products, sellerId, storeName } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No products provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sellerId) {
      return new Response(
        JSON.stringify({ success: false, message: "Seller ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!storeName) {
      return new Response(
        JSON.stringify({ success: false, message: "Store name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summary = {
      total: products.length,
      successful: 0,
      failed: 0,
      updated: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
    };

    // Check for duplicate barcodes in the file
    const barcodesInFile = new Map<string, number>();
    const duplicatesInFile: number[] = [];

    products.forEach((product: ProductRow, index: number) => {
      const barcode = product['Barcode']?.trim();

      if (barcode) {
        if (barcodesInFile.has(barcode)) {
          duplicatesInFile.push(index + 2);
        } else {
          barcodesInFile.set(barcode, index + 2);
        }
      }
    });

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const rowNumber = i + 2;

      // Skip if validation failed
      if (!product.validation.valid) {
        summary.failed++;
        summary.errors.push({
          row: rowNumber,
          errors: product.validation.errors,
        });
        continue;
      }

      // Check if duplicate barcode in file
      if (duplicatesInFile.includes(rowNumber)) {
        summary.failed++;
        summary.errors.push({
          row: rowNumber,
          errors: ['Duplicate Barcode in file'],
        });
        continue;
      }

      try {
        // STORE-LEVEL ISOLATION: Check barcode uniqueness within same store
        // This is the ONLY validation that should fail the row
        if (product['Barcode']) {
          const { data: existingBarcode } = await supabase
            .from('products')
            .select('id, name, product_code')
            .eq('seller_id', sellerId)
            .eq('barcode', product['Barcode'].trim())
            .maybeSingle();

          // If barcode exists and it's a DIFFERENT product (different code/name), fail
          if (existingBarcode) {
            const isSameProduct = 
              (product['Product Code'] && existingBarcode.product_code === product['Product Code'].trim()) ||
              (existingBarcode.name === product['Product Name'].trim());

            if (!isSameProduct) {
              summary.failed++;
              summary.errors.push({
                row: rowNumber,
                errors: [`Duplicate barcode found in the same store (existing product: ${existingBarcode.name})`],
              });
              continue;
            }
          }
        }

        // Determine image URL and source
        const category = product['Category'].trim();
        const categoryLower = category.toLowerCase();
        let imageUrl = CATEGORY_IMAGES[categoryLower] || null;
        let imageSource = 'default';

        const brandName = product['Brand Name']?.trim() || null;

        if (product['Product Image Link'] && product['Product Image Link'].trim()) {
          imageUrl = product['Product Image Link'].trim();
          imageSource = 'google';
        } else if (product['Image URL'] && product['Image URL'].trim()) {
          imageUrl = product['Image URL'].trim();
          imageSource = 'google';
        }

        const baseCurrency = product['Currency']?.trim().toUpperCase() || 'INR';

        // UPSERT LOGIC: Insert or update based on (seller_id, product_code)
        // If product_code exists in same store, update quantity
        // Otherwise, insert new product
        
        if (product['Product Code']) {
          // Try to find existing product by product_code
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id, available_quantity')
            .eq('seller_id', sellerId)
            .eq('product_code', product['Product Code'].trim())
            .maybeSingle();

          if (existingProduct) {
            // UPDATE: Add quantities
            const newQuantity = Number(existingProduct.available_quantity) + Number(product['Quantity']);

            const { error: updateError } = await supabase
              .from('products')
              .update({
                available_quantity: newQuantity,
                price: Number(product['Price']),
                unit: product['Unit']?.trim() || 'kg',
                description: product['Description']?.trim() || null,
                brand_name: brandName,
                image_url: imageUrl,
                image_source: imageSource,
                base_currency: baseCurrency,
                barcode: product['Barcode']?.trim() || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingProduct.id);

            if (updateError) {
              console.error(`Update error for row ${rowNumber}:`, updateError);
              summary.failed++;
              summary.errors.push({
                row: rowNumber,
                errors: [updateError.message],
              });
            } else {
              summary.successful++;
              summary.updated++;
            }
            continue;
          }
        }

        // If no product_code or product doesn't exist, try by name
        if (!product['Product Code'] || true) {
          const { data: existingByName } = await supabase
            .from('products')
            .select('id, available_quantity, product_code')
            .eq('seller_id', sellerId)
            .eq('name', product['Product Name'].trim())
            .maybeSingle();

          if (existingByName && !existingByName.product_code) {
            // UPDATE: Product exists without code, add quantities
            const newQuantity = Number(existingByName.available_quantity) + Number(product['Quantity']);

            const { error: updateError } = await supabase
              .from('products')
              .update({
                available_quantity: newQuantity,
                price: Number(product['Price']),
                unit: product['Unit']?.trim() || 'kg',
                description: product['Description']?.trim() || null,
                brand_name: brandName,
                product_code: product['Product Code']?.trim() || null,
                barcode: product['Barcode']?.trim() || null,
                image_url: imageUrl,
                image_source: imageSource,
                base_currency: baseCurrency,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingByName.id);

            if (updateError) {
              console.error(`Update error for row ${rowNumber}:`, updateError);
              summary.failed++;
              summary.errors.push({
                row: rowNumber,
                errors: [updateError.message],
              });
            } else {
              summary.successful++;
              summary.updated++;
            }
            continue;
          }
        }

        // INSERT: New product
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            seller_id: sellerId,
            name: product['Product Name'].trim(),
            category: category,
            brand_name: brandName,
            price: Number(product['Price']),
            unit: product['Unit']?.trim() || 'kg',
            available_quantity: Number(product['Quantity']),
            description: product['Description']?.trim() || null,
            product_code: product['Product Code']?.trim() || null,
            barcode: product['Barcode']?.trim() || null,
            image_url: imageUrl,
            image_source: imageSource,
            base_currency: baseCurrency,
            average_rating: 0,
            review_count: 0,
          });

        if (insertError) {
          console.error(`Insert error for row ${rowNumber}:`, insertError);
          summary.failed++;
          summary.errors.push({
            row: rowNumber,
            errors: [insertError.message],
          });
        } else {
          summary.successful++;
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        summary.failed++;
        summary.errors.push({
          row: rowNumber,
          errors: ['Failed to process product'],
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Upload complete",
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "An error occurred during upload" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
