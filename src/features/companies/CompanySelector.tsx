import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { capTableService } from '@/services/capTableService';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Database } from '@/types/database';

interface CompanySelectorProps {
  onCompanySelected: (companyId: string) => void;
}

type Company = Database['public']['Tables']['companies']['Row'];

export function CompanySelector({ onCompanySelected }: CompanySelectorProps) {
  const { user, userProfile, setCurrentCompanyId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  useEffect(() => {
    loadCompanies();
  }, [user]);

  const loadCompanies = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      setError(null);
      const userCompanies = await capTableService.getUserCompanies(user.email);
      setCompanies(userCompanies);
      
      // If user has companies but no current selection, show them
      if (userCompanies.length > 0) {
        setShowCreateForm(false);
      } else {
        // New user with no companies, show create form
        setShowCreateForm(true);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (company: Company) => {
    setCurrentCompanyId(company.id);
    onCompanySelected(company.id);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !userProfile || !newCompanyName.trim()) {
      setError('Please enter a valid company name');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      console.log('Creating company with data:', {
        name: newCompanyName.trim(),
        userId: user.id,
        userEmail: userProfile.email,
        userName: userProfile.name,
      });

      const newCompany = await capTableService.createCompany({
        name: newCompanyName.trim(),
        userId: user.id,
        userEmail: userProfile.email,
        userName: userProfile.name,
      });

      console.log('Company created successfully:', newCompany);

      // Select the new company
      setCurrentCompanyId(newCompany.id);
      onCompanySelected(newCompany.id);
    } catch (err) {
      console.error('Failed to create company:', err);
      
      // Show more specific error messages
      let errorMessage = 'Failed to create company';
      if (err instanceof Error) {
        if (err.message.includes('column') && err.message.includes('does not exist')) {
          errorMessage = 'Database schema needs to be updated. Please run the schema fix SQL provided by the developer.';
        } else if (err.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your database access permissions.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading your companies...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, {userProfile?.name}!
        </h2>
        <p className="text-gray-600">
          {companies.length > 0 
            ? 'Select a company to manage its cap table'
            : 'Create your first company to get started'
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Existing Companies */}
      {companies.length > 0 && !showCreateForm && (
        <div className="space-y-3 mb-6">
          <h3 className="font-medium text-gray-900">Your Companies</h3>
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleSelectCompany(company)}
              className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">{company.name}</h4>
              {company.jurisdiction && (
                <p className="text-sm text-gray-500">
                  Incorporated in {company.jurisdiction}
                </p>
              )}
            </button>
          ))}
          
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="w-full mt-4"
          >
            Create New Company
          </Button>
        </div>
      )}

      {/* Create Company Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <h3 className="font-medium text-gray-900">Create New Company</h3>
          
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter your company name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={creating}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={creating || !newCompanyName.trim()}
              className="flex-1"
            >
              {creating ? 'Creating...' : 'Create Company'}
            </Button>
            
            {companies.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Need help? Contact support or check our documentation.
        </p>
      </div>
    </div>
  );
}