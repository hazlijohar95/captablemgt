import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  MoreVertical, 
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { apiKeyService } from '@/services/apiKeyService';
import { 
  ApiKeyListView, 
  CreateApiKeyRequest, 
  CreateApiKeyResponse,
  ApiKeyDetails 
} from '@/types/api';

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: CreateApiKeyResponse) => void;
}

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    scopes: ['companies:read'],
    rate_limit_tier: 'standard' as 'standard' | 'premium' | 'enterprise'
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateApiKeyRequest) => apiKeyService.createApiKey('company-id', data),
    onSuccess: (response) => {
      onSuccess(response);
      onClose();
      setFormData({
        name: '',
        description: '',
        environment: 'sandbox',
        scopes: ['companies:read'],
        rate_limit_tier: 'standard'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create API Key</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Production Integration"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Optional description for this API key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Environment *
            </label>
            <select
              value={formData.environment}
              onChange={(e) => setFormData({...formData, environment: e.target.value as 'sandbox' | 'production'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Limit Tier
            </label>
            <select
              value={formData.rate_limit_tier}
              onChange={(e) => setFormData({...formData, rate_limit_tier: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="standard">Standard (1,000 req/hour)</option>
              <option value="premium">Premium (5,000 req/hour)</option>
              <option value="enterprise">Enterprise (10,000 req/hour)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {[
                'companies:read',
                'companies:write',
                'stakeholders:read',
                'stakeholders:write',
                'securities:read',
                'securities:write',
                'transactions:read',
                'transactions:write',
                'reports:read',
                'webhooks:manage'
              ].map(scope => (
                <label key={scope} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes(scope)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, scopes: [...formData.scopes, scope]});
                      } else {
                        setFormData({...formData, scopes: formData.scopes.filter(s => s !== scope)});
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>

        {createMutation.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">
                {createMutation.error.message}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ApiKeySecretModalProps {
  apiKeyResponse: CreateApiKeyResponse | null;
  onClose: () => void;
}

const ApiKeySecretModal: React.FC<ApiKeySecretModalProps> = ({ apiKeyResponse, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (!apiKeyResponse) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center mb-4">
          <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">API Key Created Successfully</h3>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Important Security Notice</h4>
              <p className="text-sm text-yellow-700">
                Please copy and store this secret key securely. You won't be able to see it again.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key ID (Public)
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono">
                {apiKeyResponse.key_id}
              </code>
              <button
                onClick={() => copyToClipboard(apiKeyResponse.key_id)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret Key (Private)
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-mono text-red-800">
                {apiKeyResponse.secret_key}
              </code>
              <button
                onClick={() => copyToClipboard(apiKeyResponse.secret_key)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const ApiKeyManager: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newApiKeyResponse, setNewApiKeyResponse] = useState<CreateApiKeyResponse | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => getApiKeys()
  });

  const { data: keyDetails } = useQuery({
    queryKey: ['apiKeyDetails', selectedKeyId],
    queryFn: () => getApiKeyDetails(selectedKeyId!),
    enabled: !!selectedKeyId
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => revokeApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    }
  });

  const handleCreateSuccess = (response: CreateApiKeyResponse) => {
    setNewApiKeyResponse(response);
    queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
  };

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEnvironmentColor = (env: string) => {
    return env === 'production' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-blue-100 text-blue-800';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="animate-pulse h-6 bg-gray-200 rounded w-48"></div>
          <div className="animate-pulse h-10 bg-gray-200 rounded w-32"></div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
          <p className="text-gray-600">Manage your API keys for accessing the CapTable API</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </button>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys?.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys</h3>
            <p className="text-gray-600 mb-4">
              Create your first API key to start integrating with the CapTable API.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create API Key
            </button>
          </div>
        ) : (
          apiKeys?.map((apiKey) => (
            <div key={apiKey.id} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Key className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{apiKey.name}</h3>
                    <p className="text-sm text-gray-600">{apiKey.key_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(apiKey.environment)}`}>
                    {apiKey.environment}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apiKey.status)}`}>
                    {apiKey.status}
                  </span>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-500">Rate Limit</span>
                  <p className="font-medium text-gray-900 capitalize">
                    {apiKey.rate_limit_tier}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Last Used</span>
                  <p className="font-medium text-gray-900">
                    {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Never'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Total Requests</span>
                  <p className="font-medium text-gray-900">
                    {apiKey.usage_count.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm font-medium text-gray-700">Scopes:</span>
                <div className="flex flex-wrap gap-1">
                  {apiKey.scopes.slice(0, 3).map(scope => (
                    <span key={scope} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {scope}
                    </span>
                  ))}
                  {apiKey.scopes.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{apiKey.scopes.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSelectedKeyId(apiKey.id)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Manage
                  </button>
                  <button className="flex items-center text-sm text-gray-600 hover:text-gray-700">
                    <MoreVertical className="w-4 h-4 mr-1" />
                    Actions
                  </button>
                </div>
                
                <div className="text-xs text-gray-500">
                  Created {formatDate(apiKey.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <ApiKeySecretModal
        apiKeyResponse={newApiKeyResponse}
        onClose={() => setNewApiKeyResponse(null)}
      />
    </div>
  );
};

// Mock functions - replace with actual service calls
async function getApiKeys(): Promise<ApiKeyListView[]> {
  return [
    {
      id: '1',
      name: 'Production Integration',
      environment: 'production',
      key_id: 'ak_live_abc123def456',
      scopes: ['companies:read', 'stakeholders:read', 'securities:read'],
      rate_limit_tier: 'premium',
      status: 'active',
      last_used_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      usage_count: 15420,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      name: 'Development Testing',
      environment: 'sandbox',
      key_id: 'ak_test_xyz789uvw012',
      scopes: ['companies:read', 'companies:write', 'stakeholders:read', 'stakeholders:write'],
      rate_limit_tier: 'standard',
      status: 'active',
      last_used_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      usage_count: 2847,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

async function getApiKeyDetails(keyId: string): Promise<ApiKeyDetails> {
  // Mock implementation
  return {} as ApiKeyDetails;
}

async function revokeApiKey(keyId: string): Promise<void> {
  // Mock implementation
  console.log('Revoking API key:', keyId);
}