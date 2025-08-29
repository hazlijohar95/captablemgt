import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { capTableService } from '@/services/capTableService';
import { Button } from '@/components/ui/Button';

interface EditStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stakeholderId: string | null;
}

type StakeholderType = 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';

export function EditStakeholderModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  stakeholderId 
}: EditStakeholderModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [type, setType] = useState<StakeholderType>('EMPLOYEE');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [entityName, setEntityName] = useState('');

  // Load stakeholder data when modal opens
  useEffect(() => {
    if (isOpen && stakeholderId) {
      loadStakeholderData();
    }
  }, [isOpen, stakeholderId]);

  const loadStakeholderData = async () => {
    if (!stakeholderId) return;
    
    try {
      setLoadingData(true);
      setError(null);
      
      const stakeholder = await capTableService.getStakeholderById(stakeholderId);
      
      if (stakeholder) {
        setType(stakeholder.type);
        setEntityName(stakeholder.entity_name || '');
        setTaxId(stakeholder.tax_id || '');
        
        if (stakeholder.people) {
          setFullName(stakeholder.people.name || '');
          setEmail(stakeholder.people.email || '');
          setPhone(stakeholder.people.phone || '');
        }
      }
    } catch (err) {
      console.error('Failed to load stakeholder:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stakeholder data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stakeholderId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Update stakeholder data
      await capTableService.updateStakeholder(stakeholderId, {
        type,
        entity_name: type === 'ENTITY' ? entityName : null,
        tax_id: taxId || null,
        person: type !== 'ENTITY' ? {
          name: fullName,
          email,
          phone: phone || null,
        } : null,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to update stakeholder:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stakeholder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setType('EMPLOYEE');
    setFullName('');
    setEmail('');
    setPhone('');
    setTaxId('');
    setEntityName('');
    setError(null);
    setLoadingData(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Stakeholder</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loadingData ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading stakeholder data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Stakeholder Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as StakeholderType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="FOUNDER">Founder</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="INVESTOR">Investor</option>
                <option value="ENTITY">Entity</option>
              </select>
            </div>

            {/* Entity Name (for ENTITY type) */}
            {type === 'ENTITY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Enter entity name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {/* Individual Fields (for non-ENTITY types) */}
            {type !== 'ENTITY' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Tax ID (for all types) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="SSN, EIN, etc. (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Stakeholder'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}