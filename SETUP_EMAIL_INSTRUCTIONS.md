# Email Setup Instructions for Contact Form

## Prerequisites
- You already have a Resend account with a verified domain
- You have your Resend API key

## Steps to Set Up Email Notifications

### 1. Get Your Resend API Key
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Copy your API key

### 2. Set Up Supabase Edge Function Environment Variables

You need to set environment variables in your Supabase project:

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Add the following secrets:
   - `RESEND_API_KEY`: Your Resend API key
   - `RESEND_FROM_EMAIL`: Your verified email address (e.g., `contact@yourdomain.com` or `noreply@yourdomain.com`)

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set RESEND_FROM_EMAIL=contact@yourdomain.com
```

### 3. Deploy the Edge Function

```bash
# Make sure you're in the project root directory
supabase functions deploy send-contact-email
```

### 4. Test the Setup

1. Fill out the contact form on your website
2. Submit the form
3. Check both email addresses:
   - gkjewels2000@gmail.com
   - meetansh0305@gmail.com

You should receive an email with the contact form details.

## Troubleshooting

### Email not sending?
1. Check Supabase Edge Functions logs:
   ```bash
   supabase functions logs send-contact-email
   ```

2. Verify environment variables are set:
   - Go to Supabase Dashboard → Settings → Edge Functions
   - Check that `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set

3. Verify your Resend API key is valid:
   - Check Resend dashboard for API key status
   - Make sure the domain is verified in Resend

4. Check browser console for errors when submitting the form

### Edge Function not found?
Make sure you've deployed the function:
```bash
supabase functions deploy send-contact-email
```

## Files Created
- `supabase/functions/send-contact-email/index.ts` - Edge Function that sends emails via Resend
- `supabase/functions/_shared/cors.ts` - CORS headers helper
- Updated `src/pages/Contact.tsx` - Now calls the Edge Function to send emails

## Email Format
The email will include:
- Name
- Email
- Phone
- Firm Name
- State
- City
- Message
- Submission timestamp

Both email addresses (gkjewels2000@gmail.com and meetansh0305@gmail.com) will receive the notification.
