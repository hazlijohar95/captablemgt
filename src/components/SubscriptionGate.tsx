import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService, UserSubscription } from '@/services/subscriptionService';
import { useAuth } from '@/features/auth/AuthContext';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const sub = await SubscriptionService.getUserSubscription(user.id);
      setSubscription(sub);
      
      const access = await SubscriptionService.checkUserAccess(user.id);
      setHasAccess(access);
      
      // If no access, redirect to subscription page
      if (!access && sub?.is_trial_expired) {
        navigate('/subscription/expired');
      }
    } catch (error) {
      console.error('Failed to check subscription', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show trial banner if in trial period
  if (subscription?.subscription_status === 'trial' && subscription.days_remaining !== undefined) {
    return (
      <>
        {subscription.days_remaining <= 3 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your free trial expires in {subscription.days_remaining} day{subscription.days_remaining !== 1 ? 's' : ''}.{' '}
                  <button 
                    onClick={() => navigate('/subscription')}
                    className="font-medium underline text-yellow-700 hover:text-yellow-600"
                  >
                    Upgrade now to continue access
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  // Show content if has access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Block access if trial expired or subscription inactive
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Trial Period Expired
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your 7-day free trial has ended. Please subscribe to continue using the platform.
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={() => navigate('/subscription')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View Subscription Plans
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="mailto:support@captable.app" className="text-sm text-indigo-600 hover:text-indigo-500">
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}