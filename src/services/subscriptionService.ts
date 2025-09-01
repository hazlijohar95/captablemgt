import { supabase } from './supabase';
import { logger } from '@/utils/simpleLogger';

export interface UserSubscription {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  trial_start_date: string;
  trial_end_date: string;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  subscription_id?: string;
  stripe_customer_id?: string;
  days_remaining?: number;
  is_trial_expired?: boolean;
  has_access?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
}

export class SubscriptionService {
  static readonly TRIAL_DAYS = parseInt(import.meta.env.VITE_TRIAL_DAYS || '7');
  static readonly MONTHLY_PRICE = parseInt(import.meta.env.VITE_MONTHLY_PRICE || '99');
  static readonly ANNUAL_PRICE = parseInt(import.meta.env.VITE_ANNUAL_PRICE || '990');

  /**
   * Check if user has access (trial or paid)
   */
  static async checkUserAccess(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_user_access', { user_id: userId });

      if (error) {
        logger.error('Error checking user access', error);
        return false;
      }

      return data || false;
    } catch (error) {
      logger.error('Failed to check user access', error);
      return false;
    }
  }

  /**
   * Get user subscription details
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        logger.error('Error fetching user subscription', error);
        return null;
      }

      // Calculate days remaining in trial
      const trialEndDate = new Date(data.trial_end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...data,
        days_remaining: Math.max(0, daysRemaining),
        is_trial_expired: daysRemaining <= 0 && data.subscription_status === 'trial',
        has_access: await this.checkUserAccess(userId)
      };
    } catch (error) {
      logger.error('Failed to get user subscription', error);
      return null;
    }
  }

  /**
   * Get available subscription plans
   */
  static getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'monthly',
        name: 'Monthly Plan',
        price: this.MONTHLY_PRICE,
        interval: 'month',
        features: [
          'Unlimited cap table entries',
          'Unlimited stakeholders',
          'Advanced scenario modeling',
          'Waterfall analysis',
          'Document management',
          'API access',
          'Priority support'
        ]
      },
      {
        id: 'annual',
        name: 'Annual Plan',
        price: this.ANNUAL_PRICE,
        interval: 'year',
        features: [
          'All Monthly Plan features',
          '2 months free (17% discount)',
          'Custom onboarding',
          'Dedicated account manager',
          'SLA guarantee',
          'Advanced integrations'
        ]
      }
    ];
  }

  /**
   * Create Stripe checkout session
   */
  static async createCheckoutSession(
    userId: string,
    planId: 'monthly' | 'annual',
    userEmail: string
  ): Promise<string | null> {
    try {
      // Call your backend API to create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planId,
          userEmail,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription/cancelled`
        })
      });

      const { sessionUrl } = await response.json();
      return sessionUrl;
    } catch (error) {
      logger.error('Failed to create checkout session', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          cancel_at_period_end: true,
          status: 'cancelled' 
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Error cancelling subscription', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to cancel subscription', error);
      return false;
    }
  }

  /**
   * Resume cancelled subscription
   */
  static async resumeSubscription(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          cancel_at_period_end: false,
          status: 'active' 
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Error resuming subscription', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to resume subscription', error);
      return false;
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching payment history', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get payment history', error);
      return [];
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserSubscription>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        logger.error('Error updating user profile', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to update user profile', error);
      return false;
    }
  }
}