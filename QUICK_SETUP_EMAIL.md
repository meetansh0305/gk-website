# Quick Setup: Contact Form Email Notifications

## Your Details:
- **From Email**: noreply@auth.gurukrupajewellers.com
- **To Emails**: gkjewels2000@gmail.com, meetansh0305@gmail.com
- **Resend API Key**: re_CGSv3Q2m_3asMyoTEJaanMTCUhHz3iUBX

## Setup Steps (Using Supabase Dashboard - No CLI Required):

### Step 1: Set Environment Variables in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** (gear icon in left sidebar)
4. Click on **Edge Functions** in the settings menu
5. Scroll down to **Secrets** section
6. Click **Add new secret** and add these two secrets:

   **Secret 1:**
   - Name: `RESEND_API_KEY`
   - Value: `re_CGSv3Q2m_3asMyoTEJaanMTCUhHz3iUBX`
   - Click **Save**

   **Secret 2:**
   - Name: `RESEND_FROM_EMAIL`
   - Value: `noreply@auth.gurukrupajewellers.com`
   - Click **Save**

### Step 2: Deploy the Edge Function

You have two options:

#### Option A: Using Supabase Dashboard (Easier)
1. Go to **Edge Functions** in the left sidebar
2. Click **Create a new function**
3. Name it: `send-contact-email`
4. Copy the contents from `supabase/functions/send-contact-email/index.ts`
5. Paste it into the editor
6. Click **Deploy**

#### Option B: Using Supabase CLI (If you install it)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project (you'll need your project ref from Supabase dashboard)
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set RESEND_API_KEY=re_CGSv3Q2m_3asMyoTEJaanMTCUhHz3iUBX
supabase secrets set RESEND_FROM_EMAIL=noreply@auth.gurukrupajewellers.com

# Deploy function
supabase functions deploy send-contact-email
```

### Step 3: Test It!

1. Go to your website's Contact page
2. Fill out the contact form
3. Submit it
4. Check both email inboxes:
   - gkjewels2000@gmail.com
   - meetansh0305@gmail.com

You should receive an email with all the contact form details!

## Troubleshooting

### If emails don't send:
1. Check Edge Functions logs in Supabase Dashboard
2. Verify secrets are set correctly (case-sensitive!)
3. Make sure your Resend domain is verified
4. Check browser console for any errors

### If Edge Function shows errors:
- Make sure both secrets are set
- Verify the function name is exactly: `send-contact-email`
- Check that the function code matches the file in `supabase/functions/send-contact-email/index.ts`

## Security Note
⚠️ Your Resend API key is sensitive. Make sure:
- Never commit it to version control
- Only set it as a secret in Supabase (not in code)
- If you need to rotate it, update the secret in Supabase
