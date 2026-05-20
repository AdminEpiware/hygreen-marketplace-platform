import type { ProductCategory } from '@/types/types';

/**
 * Default product images for each category
 * Used as fallback when seller doesn't provide an image
 */
export const DEFAULT_PRODUCT_IMAGES: Record<ProductCategory, string> = {
  vegetables: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4ad056d3-bfaf-4281-9b60-ff376887b64f.jpg',
  fruits: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f826d455-53f6-4cfb-a66b-45f9ee82b240.jpg',
  grocery: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4564ddc4-bf70-40d6-abc7-0abd56a2a571.jpg',
  dairy: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_dca201d4-a2b1-4723-98c0-acf0fda0a166.jpg',
  bakery: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_65229494-c829-4eeb-b23c-67a8aff2c832.jpg',
  meat: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5bd9c6eb-6dce-4157-bec5-44dcda46413a.jpg',
  beverages: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f75af92b-0f5b-439e-96f0-f5957f5feb8c.jpg',
  snacks: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b9c1a5df-4b25-4825-a977-e47ac8442ef4.jpg',
};

/**
 * Get default image for a product category
 */
export function getDefaultProductImage(category: ProductCategory): string {
  return DEFAULT_PRODUCT_IMAGES[category] || DEFAULT_PRODUCT_IMAGES.grocery;
}

/**
 * Validate if an image URL is provided and not empty
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  // Check if it's a valid URL format
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get product image with fallback to category default
 */
export function getProductImageWithFallback(
  imageUrl: string | null | undefined,
  category: ProductCategory
): string {
  if (isValidImageUrl(imageUrl)) {
    return imageUrl!;
  }
  return getDefaultProductImage(category);
}
