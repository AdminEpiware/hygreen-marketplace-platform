# Admin Dashboard Data Visibility Fix

## Issue Summary

The Admin Dashboard was not displaying buyer and seller lists due to missing Row Level Security (RLS) policies that allow admins to view all user profiles.

## Root Cause

The `profiles` table had RLS policies that only allowed:
1. Users to view their own profile
2. Anyone to view approved seller profiles
3. Users to update their own profile

**Missing**: A policy allowing admins to view ALL profiles regardless of role or status.

## Solution Implemented

### 1. Database Changes

**Migration**: `00042_add_admin_profile_access.sql`

Added two new RLS policies:

```sql
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

These policies use the existing `is_admin()` helper function to check if the authenticated user has the admin role.

### 2. Enhanced Error Handling

Updated three admin pages with improved error handling and logging:

#### AdminDashboard.tsx
- Added detailed console logging for each stat query
- Individual error handling for each data fetch
- Better error messages to users
- Logs show which specific query failed

#### AdminSellers.tsx
- Added console logging for seller fetch operations
- Enhanced error messages
- Better user feedback on permission issues

#### AdminBuyers.tsx
- Added console logging for buyer fetch operations
- Enhanced error messages
- Better user feedback on permission issues

### 3. Data Verification

Confirmed database contains:
- **2 Buyers**: 
  - bhavaniponkodi2@gmail.com (Bhavani)
  - softkamalesh@gmail.com (Kamal)
  
- **3 Sellers**:
  - kamaleshcai686@gmail.com (Kamalesh)
  - kamaleshc1995@gmail.com (kamal)
  - kamalkamalesan@gmail.com (DGTEQER)

- **1 Admin**:
  - adminsmartgrocery@gmail.com (Admin)

## Testing the Fix

### 1. Login as Admin

```
Email: adminsmartgrocery@gmail.com
Password: Kamal@1995
```

### 2. Navigate to Admin Dashboard

You should see:
- Total Sellers: 3
- Total Buyers: 2
- Total Stores: 3
- Other statistics

### 3. View Seller List

Navigate to `/admin/sellers` to see:
- List of all 3 sellers
- Their verification status
- Action buttons (approve, reject, suspend)

### 4. View Buyer List

Navigate to `/admin/buyers` to see:
- List of all 2 buyers
- Their contact information
- Registration dates

## Console Logging

The enhanced pages now log detailed information to the browser console:

```javascript
// AdminDashboard
console.log('Fetching admin dashboard stats...');
console.log('Dashboard stats:', statsData);

// AdminSellers
console.log('Fetching sellers...');
console.log('Sellers fetched:', data?.length || 0);

// AdminBuyers
console.log('Fetching buyers...');
console.log('Buyers fetched:', data?.length || 0);
```

Open browser DevTools (F12) → Console tab to see these logs.

## Error Messages

If there are still issues, you'll see specific error messages:

- **Permission Issues**: "Failed to load [data]. Please check your permissions."
- **Network Issues**: Detailed error in console
- **Empty Data**: "No users found" message in the UI

## Verification Checklist

- [x] RLS policies added for admin access
- [x] Admin can view all profiles
- [x] Admin can update all profiles
- [x] Error handling improved
- [x] Console logging added
- [x] Database contains test data
- [x] All files pass lint validation

## Security Notes

The RLS policies ensure:
1. Only users with `role = 'admin'` can view all profiles
2. The `is_admin()` function uses `SECURITY DEFINER` for safe role checking
3. Regular users can still only see their own profile and approved sellers
4. No security vulnerabilities introduced

## Next Steps

If you still don't see data:

1. **Check Browser Console** (F12 → Console)
   - Look for error messages
   - Check if data is being fetched

2. **Verify Admin Role**
   ```sql
   SELECT email, role FROM profiles WHERE email = 'adminsmartgrocery@gmail.com';
   ```
   Should return: `role = 'admin'`

3. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear cookies and cache

4. **Re-login**
   - Log out completely
   - Log back in as admin
   - Navigate to dashboard

## Technical Details

### RLS Policy Evaluation Order

When an admin queries the profiles table:
1. Supabase checks if user is authenticated ✓
2. Evaluates `is_admin(auth.uid())` function
3. If true, allows access to ALL rows
4. If false, falls back to other policies (own profile only)

### Performance Impact

- Minimal: The `is_admin()` function is a simple lookup
- Indexed: The `role` column is indexed for fast queries
- Cached: Supabase caches policy evaluations

## Summary

The issue was a missing RLS policy. Now admins have full visibility into all user profiles while maintaining security for regular users. The enhanced error handling and logging make it easier to diagnose any future issues.
