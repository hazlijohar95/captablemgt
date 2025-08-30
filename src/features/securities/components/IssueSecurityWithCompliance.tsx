import React, { useState, useEffect } from 'react';
import { XMarkIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { capTableService } from '@/services/capTableService';
import { ComplianceService409A, IStrikePriceValidation } from '@/features/compliance/services/409aComplianceService.demo';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useCSRFForm } from '@/hooks/useCSRFProtection';
import Decimal from 'decimal.js';

interface IIssueSecurityWithComplianceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stakeholderId?: string;
  stakeholderName?: string;
}

export const IssueSecurityWithCompliance: React.FC<IIssueSecurityWithComplianceProps> = ({
  isOpen,
  onClose,
  onSuccess,
  stakeholderId,
  stakeholderName
}) => {
  const { companyId } = useCompanyContext();
  const csrf = useCSRFForm();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareClasses, setShareClasses] = useState<any[]>([]);
  const [validation, setValidation] = useState<IStrikePriceValidation | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'OPTION' as 'EQUITY' | 'OPTION' | 'RSU' | 'WARRANT' | 'SAFE' | 'NOTE',
    classId: '',
    quantity: '',
    strikePrice: '',
    grantDate: new Date().toISOString().split('T')[0],
    vestingMonths: '48',
    cliffMonths: '12'
  });

  useEffect(() => {
    if (isOpen && companyId) {
      loadShareClasses();
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    // Validate strike price when it changes (for options)
    if (formData.type === 'OPTION' && formData.strikePrice) {
      validateStrikePrice();
    }
  }, [formData.strikePrice, formData.type]);

  const loadShareClasses = async () => {
    try {
      const classes = await capTableService.getShareClasses(companyId);
      setShareClasses(classes);
      if (classes.length > 0) {
        setFormData(prev => ({ ...prev, classId: classes[0].id }));
      }
    } catch (error) {
      console.error('Failed to load share classes:', error);
    }
  };

  const validateStrikePrice = async () => {
    if (!formData.strikePrice || formData.type !== 'OPTION') {
      setValidation(null);
      return;
    }

    try {
      const strikePriceCents = new Decimal(formData.strikePrice).mul(100).toFixed(0);
      const result = await ComplianceService409A.validateStrikePrice(
        companyId,
        strikePriceCents,
        new Date(formData.grantDate)
      );
      setValidation(result);
    } catch (error) {
      console.error('Failed to validate strike price:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stakeholderId) return;
    
    // Check 409A compliance for options
    if (formData.type === 'OPTION' && validation && !validation.isValid) {
      setError('Strike price does not meet 409A compliance requirements. Please adjust the strike price.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const secureFormData = await csrf.prepareSubmission(formData, companyId);
      
      // Issue the security
      const security = await capTableService.issueSecurity({
        companyId,
        stakeholderId,
        classId: formData.classId || undefined,
        type: formData.type,
        quantity: parseInt(formData.quantity),
        issuedAt: formData.grantDate,
        terms: formData.type === 'OPTION' ? {
          strikePrice: new Decimal(formData.strikePrice).mul(100).toFixed(0),
          vestingMonths: parseInt(formData.vestingMonths),
          cliffMonths: parseInt(formData.cliffMonths),
          grantDate: formData.grantDate
        } : undefined,
        csrfToken: secureFormData.csrfToken
      });

      // If it's an option or RSU, create vesting schedule
      if (formData.type === 'OPTION' || formData.type === 'RSU') {
        await capTableService.createVestingSchedule({
          startDate: formData.grantDate,
          cliffMonths: parseInt(formData.cliffMonths),
          durationMonths: parseInt(formData.vestingMonths),
          frequency: 'MONTHLY'
        });
      }

      // Create transaction record for audit
      await capTableService.createTransaction({
        companyId,
        kind: 'ISSUE',
        effectiveAt: formData.grantDate,
        payload: {
          securityId: security.id,
          stakeholderId,
          type: formData.type,
          quantity: formData.quantity,
          strikePrice: formData.strikePrice
        },
        csrfToken: secureFormData.csrfToken
      });

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to issue security:', err);
      setError(err instanceof Error ? err.message : 'Failed to issue security');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'OPTION',
      classId: '',
      quantity: '',
      strikePrice: '',
      grantDate: new Date().toISOString().split('T')[0],
      vestingMonths: '48',
      cliffMonths: '12'
    });
    setError(null);
    setValidation(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Issue Security</h2>
            {stakeholderName && (
              <p className="text-sm text-gray-600 mt-1">To: {stakeholderName}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* CSRF Protection Status */}
          {!csrf.isReady && (
            <div className="rounded-md bg-yellow-50 p-3">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                <p className="text-sm text-yellow-800">Initializing security protection...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Security Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Security Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="EQUITY">Equity (Stock)</option>
              <option value="OPTION">Stock Option</option>
              <option value="RSU">Restricted Stock Unit (RSU)</option>
              <option value="WARRANT">Warrant</option>
              <option value="SAFE">SAFE Note</option>
              <option value="NOTE">Convertible Note</option>
            </select>
          </div>

          {/* Share Class */}
          {(formData.type === 'EQUITY' || formData.type === 'OPTION') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Class <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                {shareClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Number of shares/units"
              min="1"
              required
            />
          </div>

          {/* Strike Price (for Options) */}
          {formData.type === 'OPTION' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strike Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.strikePrice}
                  onChange={(e) => setFormData({ ...formData, strikePrice: e.target.value })}
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    validation && !validation.isValid ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  required
                />
              </div>
              
              {/* 409A Compliance Status */}
              {validation && (
                <div className={`mt-2 p-3 rounded-md ${
                  validation.isValid ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-start gap-2">
                    {validation.isValid ? (
                      <ShieldCheckIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        validation.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        409A Compliance: {validation.isValid ? 'Valid' : 'Invalid'}
                      </p>
                      {validation.currentFMV && (
                        <p className="text-xs text-gray-600 mt-1">
                          Current FMV: ${new Decimal(validation.currentFMV).div(100).toFixed(2)}
                        </p>
                      )}
                      {validation.errors.map((error, i) => (
                        <p key={i} className="text-xs text-red-600 mt-1">{error}</p>
                      ))}
                      {validation.warnings.map((warning, i) => (
                        <p key={i} className="text-xs text-yellow-700 mt-1">{warning}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grant Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grant/Issue Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.grantDate}
              onChange={(e) => setFormData({ ...formData, grantDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Vesting (for Options and RSUs) */}
          {(formData.type === 'OPTION' || formData.type === 'RSU') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vesting Period (months)
                  </label>
                  <input
                    type="number"
                    value={formData.vestingMonths}
                    onChange={(e) => setFormData({ ...formData, vestingMonths: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="48"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliff Period (months)
                  </label>
                  <input
                    type="number"
                    value={formData.cliffMonths}
                    onChange={(e) => setFormData({ ...formData, cliffMonths: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="12"
                    min="0"
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              disabled={loading || !csrf.isReady || (formData.type === 'OPTION' && validation !== null && !validation.isValid)}
            >
              {loading ? 'Issuing...' : 'Issue Security'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};