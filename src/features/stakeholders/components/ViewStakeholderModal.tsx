import { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { capTableService } from '@/services/capTableService';
import { Button } from '@/components/ui/Button';

interface ViewStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeholderId: string | null;
  onEdit?: (stakeholderId: string) => void;
}

interface StakeholderDetails {
  id: string;
  type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ENTITY';
  entity_name: string | null;
  tax_id: string | null;
  created_at: string;
  people?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  securities: {
    id: string;
    type: string;
    quantity: number;
    issued_at: string;
    cancelled_at: string | null;
    share_classes?: {
      name: string;
      type: string;
    };
  }[];
}

export function ViewStakeholderModal({ 
  isOpen, 
  onClose, 
  stakeholderId,
  onEdit 
}: ViewStakeholderModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stakeholder, setStakeholder] = useState<StakeholderDetails | null>(null);

  useEffect(() => {
    if (isOpen && stakeholderId) {
      loadStakeholderData();
    }
  }, [isOpen, stakeholderId]);

  const loadStakeholderData = async () => {
    if (!stakeholderId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await capTableService.getStakeholderById(stakeholderId);
      setStakeholder(data);
    } catch (err) {
      console.error('Failed to load stakeholder:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stakeholder data');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStakeholder(null);
    setError(null);
    setLoading(true);
    onClose();
  };

  const handleEdit = () => {
    if (stakeholder && onEdit) {
      onEdit(stakeholder.id);
      handleClose();
    }
  };

  const getStakeholderName = () => {
    if (!stakeholder) return '';
    return stakeholder.people?.name || stakeholder.entity_name || 'Unknown';
  };

  const getStakeholderIcon = () => {
    if (!stakeholder) return null;
    return stakeholder.type === 'ENTITY' ? (
      <BuildingOfficeIcon className="h-8 w-8" />
    ) : (
      <UserIcon className="h-8 w-8" />
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FOUNDER':
        return 'bg-blue-100 text-blue-800';
      case 'INVESTOR':
        return 'bg-green-100 text-green-800';
      case 'EMPLOYEE':
        return 'bg-purple-100 text-purple-800';
      case 'ENTITY':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalShares = () => {
    if (!stakeholder) return 0;
    return stakeholder.securities
      .filter(s => !s.cancelled_at)
      .reduce((sum, security) => sum + security.quantity, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Stakeholder Details</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading stakeholder details...</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        ) : stakeholder ? (
          <div className="p-6 space-y-6">
            {/* Stakeholder Header */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  {getStakeholderIcon()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {getStakeholderName()}
                </h3>
                <div className="mt-1 flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(stakeholder.type)}`}>
                    {stakeholder.type.toLowerCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Added {formatDate(stakeholder.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Contact Information</h4>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {stakeholder.people && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{stakeholder.people.email}</dd>
                    </div>
                    {stakeholder.people.phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{stakeholder.people.phone}</dd>
                      </div>
                    )}
                  </>
                )}
                {stakeholder.entity_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Entity Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{stakeholder.entity_name}</dd>
                  </div>
                )}
                {stakeholder.tax_id && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tax ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{stakeholder.tax_id}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Securities Holdings */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Securities Holdings</h4>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {stakeholder.securities.filter(s => !s.cancelled_at).length}
                    </div>
                    <div className="text-sm text-gray-500">Active Securities</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {getTotalShares().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Total Shares</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {stakeholder.securities.length}
                    </div>
                    <div className="text-sm text-gray-500">All Securities</div>
                  </div>
                </div>
              </div>

              {stakeholder.securities.length > 0 ? (
                <div className="space-y-3">
                  {stakeholder.securities.map((security) => (
                    <div 
                      key={security.id} 
                      className={`border rounded-lg p-4 ${security.cancelled_at ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{security.type}</span>
                            {security.cancelled_at && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Cancelled
                              </span>
                            )}
                          </div>
                          {security.share_classes && (
                            <p className="text-sm text-gray-500 mt-1">
                              {security.share_classes.name} ({security.share_classes.type})
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Issued: {formatDate(security.issued_at)}
                            {security.cancelled_at && ` • Cancelled: ${formatDate(security.cancelled_at)}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {security.quantity.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">shares</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No securities issued yet</p>
              )}
            </div>

            {/* Actions */}
            <div className="border-t pt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Close
              </Button>
              {onEdit && (
                <Button
                  onClick={handleEdit}
                >
                  Edit Stakeholder
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No stakeholder data found
          </div>
        )}
      </div>
    </div>
  );
}