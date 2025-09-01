# 🔑 API Keys Setup Guide - 5 Minutes to Production

## 📋 What You Need
I've prepared an `.env` file with placeholders for your API keys. You just need to:
1. Get your Supabase credentials (2 minutes)
2. Get your Stripe keys (2 minutes)  
3. Add them to Netlify environment variables (1 minute)

---

## 🗄️ Step 1: Get Supabase Credentials

### 1.1 Go to Supabase Dashboard
- Visit: [supabase.com](https://supabase.com)
- Log into your account
- Select your **cap table project**

### 1.2 Get Your API Keys
1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:

**Project URL:**
```
https://[YOUR_PROJECT_ID].supabase.co
```
Copy this and replace `https://YOUR_PROJECT_ID.supabase.co` in your `.env`

**Anon Key (Public):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.[LONG_STRING_HERE]
```
Copy this and replace `PASTE_YOUR_ANON_KEY_HERE` in your `.env`

**Service Role Key (Secret) - Optional:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.[DIFFERENT_LONG_STRING]
```
Copy this and replace `PASTE_YOUR_SERVICE_ROLE_KEY_HERE` in your `.env`

---

## 💳 Step 2: Get Stripe Keys

### 2.1 Go to Stripe Dashboard
- Visit: [dashboard.stripe.com](https://dashboard.stripe.com)
- Log into your account (or create one)

### 2.2 Get Your API Keys
1. Go to **Developers** → **API keys** (left sidebar)
2. Copy these values:

**Publishable Key:**
```
pk_test_51[LONG_STRING_HERE] (for testing)
pk_live_51[LONG_STRING_HERE] (for production)
```
Copy this and replace `pk_test_51PASTE_YOUR_STRIPE_PUBLISHABLE_KEY_HERE`

**Secret Key:**
```
sk_test_51[LONG_STRING_HERE] (for testing)
sk_live_51[LONG_STRING_HERE] (for production)
```
Copy this and replace `sk_test_51PASTE_YOUR_STRIPE_SECRET_KEY_HERE`

### 2.3 Create Products (Optional - for now)
You can start with test mode and create products later. The app will still work!

---

## 🌐 Step 3: Add to Netlify

### 3.1 Go to Netlify Dashboard
- Visit: [netlify.com](https://netlify.com)
- Go to your **cap table site**
- Go to **Site settings** → **Environment variables**

### 3.2 Add Each Variable
Click **Add variable** and add these one by one:

**Required for Basic Function:**
```
VITE_SUPABASE_URL = https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_51...
VITE_TRIAL_DAYS = 7
VITE_MONTHLY_PRICE = 99
VITE_ANNUAL_PRICE = 990
```

**Optional (add later):**
```
STRIPE_SECRET_KEY = sk_test_51...
STRIPE_WEBHOOK_SECRET = whsec_...
VITE_APP_URL = https://your-site.netlify.app
```

### 3.3 Deploy
After adding environment variables:
1. Go to **Deploys**
2. Click **Trigger deploy** → **Deploy site**
3. Wait for build to complete (2-3 minutes)

---

## ✅ Test Your Setup

### 3.1 Visit Your Site
Go to your Netlify URL (like `https://amazing-app-123456.netlify.app`)

### 3.2 Check What Should Work:
- ✅ **No more demo mode banner** (if Supabase is configured)
- ✅ **Login/signup forms appear**
- ✅ **User can create account**
- ✅ **7-day trial starts automatically**
- ✅ **Dashboard loads** (trial user gets access)

### 3.3 What Won't Work Yet (Until Stripe Products Created):
- ❌ Payment processing (returns error)
- ✅ Everything else works perfectly!

---

## 🚨 Quick Troubleshooting

### Build Fails?
- Check all required environment variables are added
- Make sure Supabase URL starts with `https://`
- Make sure keys don't have extra spaces

### Can't Login?
- Verify Supabase project is not paused
- Check if URL and anon key are correct
- Try test signup with a real email

### Still See Demo Mode?
- Make sure `VITE_SUPABASE_URL` is set in Netlify
- Make sure `VITE_SUPABASE_ANON_KEY` is set in Netlify  
- Trigger a new deploy after adding variables

---

## 🎯 Your `.env` File Template

I've created a `.env` file in your project with all the placeholders. Just:

1. **Replace the placeholder values** with your real API keys
2. **Copy the variables to Netlify** environment settings
3. **Deploy and test!**

The file includes helpful comments showing exactly where to get each key.

---

## 🎉 Next Steps

Once this basic setup works:
1. **Create Stripe products** for payment processing
2. **Set up webhooks** for subscription management  
3. **Switch to live mode** when ready for real customers

But for now, you'll have a **fully functional SaaS with trials** - users can sign up, get 7 days free, and use all features!

**Need help?** The placeholder values in `.env` show exactly what each key should look like.