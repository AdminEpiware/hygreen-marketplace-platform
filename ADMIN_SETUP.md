# Admin User Setup Instructions

## Admin Email Configuration

The application is configured to recognize **adminsmartgrocery@gmail.com** as the admin user.

## Creating the Admin Account

Since the admin account must be created through Supabase Auth, follow these steps:

### Option 1: Sign Up Through the Application

1. Go to the signup page: `/signup`
2. Fill in the registration form with:
   - **Email**: adminsmartgrocery@gmail.com
   - **Password**: Choose a secure password
   - **Full Name**: Admin User (or your preferred name)
   - **Mobile Number**: Your contact number
   - **Address**: Your address
   - **Country**: Select your country
   - **Role**: Select either "Buyer" or "Seller" (it will be automatically changed to "Admin")

3. Complete the signup process
4. The system will automatically detect the admin email and assign the admin role
5. Log in with the admin credentials
6. You will be redirected to the Admin Dashboard

### Option 2: Create Through Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Go to **Authentication** → **Users**
3. Click **Add User**
4. Enter:
   - **Email**: adminsmartgrocery@gmail.com
   - **Password**: Choose a secure password
   - **Auto Confirm User**: Enable this option
5. Click **Create User**
6. The database trigger will automatically assign the admin role to this user

## Security Features

The application includes the following security measures:

1. **Automatic Admin Role Assignment**: The email `adminsmartgrocery@gmail.com` is automatically assigned the admin role upon account creation

2. **Unauthorized Admin Prevention**: Database triggers prevent any other email from being assigned the admin role unless done by an existing admin

3. **No Public Admin Signup**: The signup page only allows "Buyer" and "Seller" roles - admin role is not available for selection

4. **Role-Based Redirection**: Upon login, users are automatically redirected to their appropriate dashboard:
   - Admin → `/admin/dashboard`
   - Seller → `/seller/dashboard`
   - Buyer → `/buyer/dashboard`

## Admin Capabilities

Once logged in as admin, you can:

- View and manage all sellers (approve, reject, suspend)
- View and manage all buyers
- Monitor platform statistics
- Access support tickets (when implemented)
- Manage store warnings (when implemented)
- View all orders and transactions
- Access admin activity logs

## Changing the Admin Email

If you need to change the admin email from `adminsmartgrocery@gmail.com` to a different email:

1. Update the migration file: `supabase/migrations/00041_setup_admin_user_security.sql`
2. Change all occurrences of `'adminsmartgrocery@gmail.com'` to your new admin email
3. Re-apply the migration
4. Create a new user with the new admin email

## Troubleshooting

### Admin user not redirecting to admin dashboard

1. Verify the user's role in the database:
   ```sql
   SELECT email, role FROM profiles WHERE email = 'adminsmartgrocery@gmail.com';
   ```

2. If the role is not 'admin', update it manually:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'adminsmartgrocery@gmail.com';
   ```

3. Log out and log back in

### Cannot access admin pages

1. Clear browser cache and cookies
2. Log out completely
3. Log back in with admin credentials
4. Verify you're being redirected to `/admin/dashboard`

## Security Best Practices

1. **Use a strong password** for the admin account
2. **Enable two-factor authentication** in Supabase if available
3. **Regularly review admin activity logs** for suspicious activity
4. **Do not share admin credentials** with unauthorized personnel
5. **Change the admin password regularly**
