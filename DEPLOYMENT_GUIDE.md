# 🚀 Production Deployment Guide - Cap Table SaaS

## Quick Start

This is a **production-ready SaaS platform** with:
- ✅ User authentication & registration
- ✅ 7-day free trial system
- ✅ Stripe payment integration
- ✅ Automatic access control
- ✅ Subscription management
- ✅ Trial expiration blocking

## 📋 Prerequisites

1. **Supabase Account** - [supabase.com](https://supabase.com)
2. **Stripe Account** - [stripe.com](https://stripe.com)
3. **Netlify Account** - [netlify.com](https://netlify.com)
4. **Domain Name** (recommended)

## 🛠️ Step 1: Supabase Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose organization, name: "CapTable Production"
3. Generate strong password
4. Select region closest to your users

### 1.2 Database Setup
1. Go to SQL Editor in Supabase
2. Copy and paste this entire SQL script:

```sql
-- Users extended profile table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription records table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan_type TEXT CHECK (plan_type IN ('monthly', 'annual')),
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment history table
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- Function to check trial/subscription access
CREATE OR REPLACE FUNCTION check_user_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  profile user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile FROM user_profiles WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if in trial period
  IF profile.subscription_status = 'trial' AND NOW() <= profile.trial_end_date THEN
    RETURN TRUE;
  END IF;
  
  -- Check if has active subscription
  IF profile.subscription_status = 'active' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, trial_start_date, trial_end_date)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW() + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

3. Click "Run" to execute
4. Verify tables created in Table Editor

### 1.3 Get Credentials
1. Go to Settings → API
2. Copy:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (keep secure!)

## 💳 Step 2: Stripe Setup

### 2.1 Create Products
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Products → Add Product:
   - **Monthly Plan**: $99.00 recurring monthly
   - **Annual Plan**: $990.00 recurring yearly
3. Save Product IDs

### 2.2 Get API Keys
1. Developers → API Keys
2. Copy:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

### 2.3 Setup Webhook
1. Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://your-domain.com/api/stripe-webhook`
3. Events to send:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret

## 🌐 Step 3: Netlify Deployment

### 3.1 Connect Repository
1. Go to [netlify.com](https://netlify.com)
2. New site from Git → Connect to GitHub
3. Select your cap table repository

### 3.2 Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Branch to deploy**: `main` or `master`

### 3.3 Environment Variables
Go to Site Settings → Environment Variables, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51...
VITE_TRIAL_DAYS=7
VITE_MONTHLY_PRICE=99
VITE_ANNUAL_PRICE=990
VITE_APP_URL=https://your-domain.netlify.app
```

### 3.4 Deploy
1. Click "Deploy site"
2. Wait for build to complete
3. Test the deployment

## 🎯 Step 4: User Flow Testing

### Test Complete User Journey:
1. **Signup**: User creates account → Gets 7-day trial
2. **Trial Usage**: Full access to all features
3. **Trial Warning**: Banner appears 3 days before expiry
4. **Trial Expiry**: Access blocked, subscription page shown
5. **Payment**: User selects plan, pays via Stripe
6. **Full Access**: User gets unlimited access

### Key URLs to Test:
- `/` - Dashboard (requires auth + active trial/subscription)
- `/subscription` - Pricing plans
- `/subscription/success` - Payment success page
- `/subscription/cancelled` - Payment cancelled page

## 🔧 Step 5: Custom Domain (Optional)

### 5.1 In Netlify:
1. Domain settings → Add custom domain
2. Follow DNS configuration instructions

### 5.2 Update Environment Variables:
```
VITE_APP_URL=https://your-domain.com
```

## 🛡️ Security Checklist

- ✅ Row Level Security enabled in Supabase
- ✅ API keys stored as environment variables only
- ✅ HTTPS enforced (automatic with Netlify)
- ✅ No sensitive data in client-side code
- ✅ Subscription access properly gated

## 📊 Production Monitoring

### Recommended Tools:
1. **Supabase Dashboard** - Database & Auth monitoring
2. **Stripe Dashboard** - Payment & revenue tracking
3. **Netlify Analytics** - Traffic & performance
4. **Sentry** (optional) - Error tracking

### Key Metrics to Watch:
- Trial signup rate
- Trial-to-paid conversion (target: 10-20%)
- Monthly churn rate (target: <5%)
- Revenue growth

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check all environment variables are set
   - Verify Supabase credentials are correct

2. **Auth Not Working**
   - Verify Supabase URL and anon key
   - Check if Supabase project is paused

3. **Payments Fail**
   - Verify Stripe publishable key
   - Check webhook is receiving events

4. **Users Can't Access After Payment**
   - Check subscription status in Supabase
   - Verify webhook processed payment correctly

## 🎉 Go Live!

Once everything is tested and working:

1. Switch Stripe from test to live mode
2. Update Stripe keys in Netlify environment
3. Test full payment flow one more time
4. Announce your launch! 🚀

## 📞 Support

For production issues:
- Email: support@your-domain.com  
- Documentation: Link to this guide
- Status Page: Track uptime

---

**Your SaaS cap table management platform is now LIVE!** 🎯

Users can:
- Sign up and get 7 days free
- Use all features during trial  
- Pay $99/month or $990/year after trial
- Manage their subscriptions
- Access professional cap table tools

**Revenue Model**: Recurring subscriptions with free trial conversion