/**
 * Returns the best available display name for a seller/store profile.
 * Priority: store_name → business_name → owner_name → full_name → 'Store'
 * This prevents "Store not found" style errors when store_name is null.
 */
export function getStoreName(
  s: { store_name?: string | null; business_name?: string | null; owner_name?: string | null; full_name?: string | null } | null | undefined
): string {
  if (!s) return 'Store';
  return (
    s.store_name?.trim() ||
    s.business_name?.trim() ||
    s.owner_name?.trim() ||
    s.full_name?.trim() ||
    'Store'
  );
}
