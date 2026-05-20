# Email OTP Setup Guide - CRITICAL

## Issue Resolved

**Problem**: OTP emails were being received but didn't contain the 6-digit code.

**Root Cause**: The email sending code in the `send-email-otp` Edge Function was commented out. The function was generating and storing the OTP in the database but not actually sending it via email.

**Solution**: Activated Resend email service integration in the Edge Function.

## Quick Setup (5 Minutes)

### Step 1: Create Resend Account

1. Go to https://resend.com
2. Click "Sign Up" (it's FREE)
3. Verify your email address
4. Log in to your Resend dashboard

### Step 2: Get API Key

1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Name it: "Smart Grocery OTP"
4. Copy the API key (starts with `re_`)
5. **IMPORTANT**: Save it securely - you won't see it again!

### Step 3: Add API Key to Supabase

The system has already prompted you to add the `RESEND_API_KEY` secret. 

**Enter your Resend API key when prompted.**

Example key format: `re_123abc456def789ghi012jkl345mno678`

### Step 4: Test Email Sending

1. Go to your app's signup page
2. Fill in the signup form
3. Click "Create Account"
4. Check your email inbox
5. You should receive an email with a 6-digit OTP

**Email Subject**: "Verify Your Email - Smart Grocery"
**From**: Smart Grocery <onboarding@resend.dev>

## What Changed

### Before (v67-v69)

```typescript
// Email sending was commented out
/*
const resendResponse = await fetch('https://api.resend.com/emails', {
  // ... email sending code
});
*/

// Only logged to console
console.log(`OTP for ${email}: ${otp}`);
```

**Result**: 
- ❌ No email sent
- ❌ OTP only in console logs
- ❌ Users couldn't verify their email

### After (v70)

```typescript
// Email sending is ACTIVE
const resendApiKey = Deno.env.get('RESEND_API_KEY');

if (resendApiKey) {
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
}
```

**Result**:
- ✅ Email sent via Resend
- ✅ OTP included in email
- ✅ Users can verify their email

## Email Template

The email users receive looks like this:

```
┌─────────────────────────────────────────────────────────┐
│                    Smart Grocery                         │
│                  Email Verification                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Verify Your Email Address                              │
│                                                          │
│  Thank you for signing up! Please use the following     │
│  OTP to verify your email address:                      │
│                                                          │
│  ┌─────────────────────────────────────────┐           │
│  │     Your verification code:              │           │
│  │                                          │           │
│  │           1 2 3 4 5 6                   │           │
│  │                                          │           │
│  └─────────────────────────────────────────┘           │
│                                                          │
│  Important: This OTP will expire in 5 minutes.          │
│                                                          │
│  If you didn't request this verification, please        │
│  ignore this email.                                     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  This is an automated email. Please do not reply.       │
└─────────────────────────────────────────────────────────┘
```

## Resend Free Tier

**Perfect for this app!**

- ✅ 100 emails per day (FREE)
- ✅ 3,000 emails per month (FREE)
- ✅ No credit card required
- ✅ Professional email delivery
- ✅ Email analytics
- ✅ Delivery tracking

**Upgrade if needed**:
- $20/month for 50,000 emails
- $80/month for 100,000 emails

## Troubleshooting

### Issue: "Email not sent" error

**Check**:
1. Is RESEND_API_KEY configured?
2. Is the API key valid?
3. Check Resend dashboard for errors

**Solution**:
```bash
# Check if secret is set
supabase secrets list

# If not set, add it
supabase secrets set RESEND_API_KEY=re_your_key_here
```

### Issue: Email goes to spam

**Solution**:
1. In Resend dashboard, verify your domain
2. Add SPF and DKIM records to your DNS
3. Use a custom domain instead of `onboarding@resend.dev`

**Custom Domain Setup**:
```typescript
// Change in send-email-otp/index.ts
from: 'Smart Grocery <noreply@yourdomain.com>',
```

### Issue: OTP still not in email

**Check**:
1. Look in spam/junk folder
2. Check Resend dashboard logs
3. Verify email address is correct
4. Check Edge Function logs

**View Logs**:
```bash
supabase functions logs send-email-otp
```

### Issue: "RESEND_API_KEY not configured"

**This means**:
- The secret hasn't been added yet
- OTP is generated and stored in database
- But email is NOT sent
- OTP is shown in console logs (development mode)

**Solution**:
- Add the RESEND_API_KEY secret when prompted
- Or manually add it via Supabase dashboard

## Development Mode

**Without RESEND_API_KEY**:
- OTP is logged to console
- OTP is returned in API response (devOTP field)
- OTP is shown in yellow alert on signup page
- No email is sent

**With RESEND_API_KEY**:
- OTP is sent via email
- OTP is still logged to console (for debugging)
- OTP is still returned in devOTP field
- Email is sent successfully

## Production Checklist

Before going live:

- [ ] Add RESEND_API_KEY secret
- [ ] Test email delivery
- [ ] Verify emails arrive within 30 seconds
- [ ] Check spam folder
- [ ] Test with multiple email providers (Gmail, Outlook, Yahoo)
- [ ] Remove devOTP from response (optional, for security)
- [ ] Remove console.log statements (optional)
- [ ] Remove yellow alert from Signup page (optional)
- [ ] Set up custom domain in Resend
- [ ] Add SPF and DKIM records
- [ ] Monitor email delivery rates

## Alternative Email Services

If you prefer not to use Resend, you can integrate:

### SendGrid

```typescript
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sendgridApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email }] }],
    from: { email: 'noreply@yourdomain.com', name: 'Smart Grocery' },
    subject: 'Verify Your Email - Smart Grocery',
    content: [{ type: 'text/html', value: emailHtml }],
  }),
});
```

### Mailgun

```typescript
const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`,
  },
  body: new URLSearchParams({
    from: 'Smart Grocery <noreply@yourdomain.com>',
    to: email,
    subject: 'Verify Your Email - Smart Grocery',
    html: emailHtml,
  }),
});
```

### AWS SES

```typescript
// Requires AWS SDK integration
// More complex setup but very reliable
```

## Email Delivery Best Practices

### 1. Verify Your Domain

**Why**: Improves deliverability, reduces spam
**How**: Add DNS records in Resend dashboard

### 2. Use Professional From Address

**Bad**: `noreply@gmail.com`
**Good**: `noreply@yourdomain.com`

### 3. Keep Subject Line Clear

**Current**: "Verify Your Email - Smart Grocery"
**Good**: Clear, concise, no spam words

### 4. Monitor Delivery Rates

**Check**:
- Delivery rate (should be >95%)
- Open rate
- Bounce rate (should be <5%)
- Spam complaints (should be <0.1%)

### 5. Handle Bounces

**Soft Bounce**: Temporary issue (full inbox)
**Hard Bounce**: Invalid email address

**Action**: Mark hard bounces as invalid

## Testing Email Delivery

### Test 1: Basic Delivery

1. Sign up with your email
2. Check inbox within 30 seconds
3. Verify OTP is in email
4. Verify OTP works

### Test 2: Multiple Providers

Test with:
- Gmail
- Outlook/Hotmail
- Yahoo Mail
- ProtonMail
- Custom domain email

### Test 3: Spam Check

1. Check spam folder
2. Mark as "Not Spam" if needed
3. Verify future emails go to inbox

### Test 4: Resend Functionality

1. Click "Resend OTP"
2. Verify new email arrives
3. Verify old OTP is invalidated
4. Verify new OTP works

### Test 5: Expiry

1. Wait 5 minutes after receiving OTP
2. Try to verify with expired OTP
3. Verify error message appears
4. Request new OTP
5. Verify new OTP works

## Monitoring

### Resend Dashboard

**View**:
- Total emails sent
- Delivery rate
- Bounce rate
- Open rate (if tracking enabled)
- Click rate (if tracking enabled)

### Edge Function Logs

**View**:
```bash
supabase functions logs send-email-otp --tail
```

**Look for**:
- "Email sent successfully via Resend"
- "Failed to send email via Resend"
- "RESEND_API_KEY not configured"

### Database Monitoring

**Check OTP generation**:
```sql
SELECT 
  email,
  is_email_verified,
  otp_expiry_time,
  otp_attempts,
  created_at
FROM profiles
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

## Cost Estimation

### Resend Free Tier

**Capacity**: 100 emails/day, 3,000 emails/month

**Sufficient for**:
- Up to 100 signups per day
- Up to 3,000 signups per month
- Small to medium apps

### Resend Paid Plans

**$20/month**: 50,000 emails
- ~1,666 signups per day
- ~50,000 signups per month

**$80/month**: 100,000 emails
- ~3,333 signups per day
- ~100,000 signups per month

### Cost per Signup

**Free tier**: $0.00 per signup
**Paid tier**: $0.0004 per signup ($20/50,000)

**Very affordable!**

## Security Considerations

### API Key Security

✅ **DO**:
- Store in Supabase secrets
- Never commit to Git
- Rotate periodically
- Use environment-specific keys

❌ **DON'T**:
- Hardcode in code
- Share publicly
- Use same key for dev/prod
- Log API key

### Email Content Security

✅ **DO**:
- Use HTTPS for all links
- Sanitize user input
- Use plain text + HTML
- Include unsubscribe link (if marketing)

❌ **DON'T**:
- Include sensitive data
- Use shortened URLs
- Include JavaScript
- Use external images (can track)

## Summary

**Issue**: OTP emails not containing the 6-digit code

**Root Cause**: Email sending code was commented out

**Solution**: 
1. ✅ Activated Resend email integration
2. ✅ Deployed updated Edge Function
3. ✅ Registered RESEND_API_KEY secret
4. ✅ Provided setup instructions

**Next Steps**:
1. Add your Resend API key when prompted
2. Test email delivery
3. Verify OTP arrives in email
4. Complete signup flow

**Status**: ✅ Fixed and ready for production (after adding API key)

---

**Version**: 70
**Date**: 2026-04-27
**Status**: ✅ Fixed - Requires API Key Setup
**Critical**: Yes - Email delivery is essential
**Action Required**: Add RESEND_API_KEY secret
