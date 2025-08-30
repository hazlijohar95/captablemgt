import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Input, Button, Card } from '@/components/ui';
import { 
  BuildingOffice2Icon, 
  ShieldCheckIcon, 
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface LoginFormProps {
  onToggleMode: () => void;
  isSignUp: boolean;
}

export function LoginForm({ onToggleMode, isSignUp }: LoginFormProps) {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password, {
          full_name: email.split('@')[0], // Default name from email
        });
        setSuccess('Please check your email to confirm your account.');
      } else {
        await signIn(email, password);
        // Redirect will be handled by the auth context
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    }
  };

  const features = [
    {
      icon: ChartBarIcon,
      title: 'Cap Table Management',
      description: 'Track ownership, equity distribution, and dilution in real-time'
    },
    {
      icon: UserGroupIcon,
      title: 'Stakeholder Portal',
      description: 'Manage investors, employees, and shareholders in one place'
    },
    {
      icon: DocumentTextIcon,
      title: 'Document Automation',
      description: 'Generate legal documents and compliance reports automatically'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Bank-Grade Security',
      description: 'Enterprise security with SOC 2 compliance and encryption'
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="relative flex min-h-screen">
        {/* Left Panel - Features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
          <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary-500 rounded-xl">
                <BuildingOffice2Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  Cap Table
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Professional equity management
                </p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
              Manage your cap table with
              <span className="text-primary-600"> confidence</span>
            </h2>
            
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-12">
              The modern platform for startups to track equity, manage stakeholders, 
              and stay compliant as they scale.
            </p>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                    <feature.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 fill-primary-500 text-primary-500" />
                ))}
              </div>
              <span>Trusted by 1000+ startups worldwide</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="flex-1 lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-md">
            <Card variant="glass" padding="lg" className="backdrop-blur-xl">
              <div className="text-center mb-8">
                <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
                  <div className="p-2 bg-primary-500 rounded-xl">
                    <BuildingOffice2Icon className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    Cap Table
                  </h1>
                </div>
                
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {isSignUp ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {isSignUp 
                    ? 'Start managing your equity today'
                    : 'Sign in to your cap table dashboard'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  type="email"
                  label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="filled"
                  required
                />

                <Input
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="filled"
                  required
                />

                {isSignUp && (
                  <Input
                    type="password"
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    variant="filled"
                    required
                  />
                )}

                {error && (
                  <div className="p-4 bg-error-50 border border-error-200 text-error-700 rounded-xl text-sm dark:bg-error-400/10 dark:border-error-400/20 dark:text-error-400">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-success-50 border border-success-200 text-success-700 rounded-xl text-sm dark:bg-success-400/10 dark:border-success-400/20 dark:text-success-400">
                    {success}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  size="lg"
                  fullWidth
                  className="mt-8"
                >
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Sign up"
                    }
                  </button>
                </div>

                {!isSignUp && (
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </form>
            </Card>

            <div className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
              <p>
                By signing {isSignUp ? 'up' : 'in'}, you agree to our{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}