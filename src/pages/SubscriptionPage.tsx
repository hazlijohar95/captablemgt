import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService, UserSubscription, SubscriptionPlan } from '@/services/subscriptionService';
import { useAuth } from '@/features/auth/AuthContext';
import { CheckIcon } from '@heroicons/react/24/outline';

export function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans] = useState<SubscriptionPlan[]>(SubscriptionService.getSubscriptionPlans());

  useEffect(() => {
    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    if (!user?.id) return;
    
    const sub = await SubscriptionService.getUserSubscription(user.id);
    setSubscription(sub);
  };

  const handleUpgrade = async (planId: 'monthly' | 'annual') => {
    if (!user?.email || !user?.id) return;

    setLoading(true);
    try {
      const sessionUrl = await SubscriptionService.createCheckoutSession(
        user.id,
        planId,
        user.email
      );

      if (sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = sessionUrl;
      } else {
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Unlock the full power of professional cap table management
          </p>
          
          {subscription?.subscription_status === 'trial' && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Trial Status:</strong> {subscription.days_remaining} days remaining
                {subscription.days_remaining === 0 && ' (Expired)'}
              </p>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${
                plan.id === 'annual' ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-200'
              } bg-white p-8 shadow-lg`}
            >
              {plan.id === 'annual' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-4 py-1 text-sm font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold text-gray-900">${plan.price}</span>
                  <span className="text-xl font-medium text-gray-500">/{plan.interval}</span>
                </div>
                {plan.interval === 'year' && (
                  <p className="mt-2 text-sm text-green-600 font-medium">Save 17% annually</p>
                )}
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckIcon className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5" />
                    <span className="ml-3 text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <button
                  onClick={() => handleUpgrade(plan.id as 'monthly' | 'annual')}
                  disabled={loading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors ${
                    plan.id === 'annual'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-100'
                  } disabled:cursor-not-allowed`}
                >
                  {loading ? 'Processing...' : 'Get Started'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-20">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Everything you need for cap table management
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Professional-grade tools trusted by thousands of companies
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: 'Cap Table Tracking',
                description: 'Maintain accurate equity records with real-time updates and automated calculations.'
              },
              {
                name: 'Scenario Modeling',
                description: 'Model different funding rounds and exit scenarios to understand dilution impact.'
              },
              {
                name: 'Waterfall Analysis',
                description: 'Understand payout distributions for different liquidity events and preferences.'
              },
              {
                name: 'Document Management',
                description: 'Store and organize all equity-related documents in one secure location.'
              },
              {
                name: 'Compliance Tools',
                description: '409A valuations, ASC 718 reporting, and other regulatory compliance features.'
              },
              {
                name: 'API Access',
                description: 'Full REST API access for integrations with your existing business systems.'
              }
            ].map((feature) => (
              <div key={feature.name} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{feature.name}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {[
              {
                question: 'What happens during the free trial?',
                answer: 'You get full access to all features for 7 days. No credit card required to start.'
              },
              {
                question: 'Can I change plans later?',
                answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.'
              },
              {
                question: 'Is my data secure?',
                answer: 'Yes, we use enterprise-grade security with SOC 2 compliance, encryption at rest and in transit.'
              },
              {
                question: 'Do you offer refunds?',
                answer: 'We offer a 30-day money-back guarantee if you\'re not satisfied with the service.'
              }
            ].map((faq) => (
              <div key={faq.question} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                <p className="mt-2 text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-20 text-center">
          <p className="text-gray-600">
            Have questions? <a href="mailto:support@captable.app" className="text-indigo-600 hover:text-indigo-500">Contact our team</a>
          </p>
        </div>
      </div>
    </div>
  );
}