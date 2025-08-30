import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, Button, Badge } from '@/components/ui';
import { ComplianceService409A, I409AComplianceCheck } from '../services/409aComplianceService.demo';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import Decimal from 'decimal.js';

export const Valuation409AManager: React.FC = () => {
  const { companyId } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [complianceCheck, setComplianceCheck] = useState<I409AComplianceCheck | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    valuationDate: '',
    fairMarketValue: '',
    preferredPrice: '',
    method: '409A' as const,
    validThrough: '',
    provider: '',
    reportUrl: '',
    notes: ''
  });

  useEffect(() => {
    if (companyId) {
      loadComplianceStatus();
    }
  }, [companyId]);

  const loadComplianceStatus = async () => {
    try {
      setLoading(true);
      const check = await ComplianceService409A.performComplianceCheck(companyId);
      setComplianceCheck(check);
    } catch (error) {
      console.error('Failed to load compliance status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const fmvCents = new Decimal(formData.fairMarketValue).mul(100).toFixed(0);
      const preferredCents = formData.preferredPrice 
        ? new Decimal(formData.preferredPrice).mul(100).toFixed(0)
        : undefined;

      await ComplianceService409A.createValuation({
        companyId,
        valuationDate: new Date(formData.valuationDate),
        fairMarketValue: fmvCents,
        preferredPrice: preferredCents,
        method: formData.method,
        validThrough: new Date(formData.validThrough),
        provider: formData.provider,
        reportUrl: formData.reportUrl,
        notes: formData.notes,
        status: 'ACTIVE'
      });

      setShowAddModal(false);
      await loadComplianceStatus();
    } catch (error) {
      console.error('Failed to create valuation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'NON_COMPLIANT':
      case 'NO_VALUATION':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'WARNING':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'NON_COMPLIANT':
      case 'NO_VALUATION':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Status Card */}
      <Card>
        <CardHeader
          title="409A Compliance Status"
          description="Monitor your company's 409A valuation compliance for option grants"
          icon={<ShieldCheckIcon className="h-5 w-5 text-gray-400" />}
          badge={
            complianceCheck && (
              <Badge variant={getStatusColor(complianceCheck.complianceStatus)}>
                {complianceCheck.complianceStatus.replace('_', ' ')}
              </Badge>
            )
          }
          actions={
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Valuation
            </Button>
          }
        />
        
        <div className="p-6">
          {complianceCheck && (
            <div className="space-y-4">
              {/* Status Summary */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                {getStatusIcon(complianceCheck.complianceStatus)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {complianceCheck.hasValid409A ? 'Active 409A Valuation' : 'No Valid 409A Valuation'}
                  </p>
                  {complianceCheck.currentValuation && (
                    <p className="text-sm text-gray-600 mt-1">
                      FMV: ${new Decimal(complianceCheck.currentValuation.fairMarketValue).div(100).toFixed(2)} per share
                      {complianceCheck.daysUntilExpiration && complianceCheck.daysUntilExpiration > 0 && (
                        <span className="ml-2">
                          • Expires in {complianceCheck.daysUntilExpiration} days
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Required Actions */}
              {complianceCheck.requiredActions.length > 0 && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Required Actions</h4>
                  <ul className="space-y-1">
                    {complianceCheck.requiredActions.map((action, index) => (
                      <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                        <span className="text-yellow-600 mt-0.5">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Current Valuation Details */}
              {complianceCheck.currentValuation && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Current Valuation Details</h4>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">Valuation Date</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(complianceCheck.currentValuation.valuationDate).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Valid Through</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(complianceCheck.currentValuation.validThrough).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Method</dt>
                      <dd className="font-medium text-gray-900">
                        {complianceCheck.currentValuation.method}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Provider</dt>
                      <dd className="font-medium text-gray-900">
                        {complianceCheck.currentValuation.provider || 'Not specified'}
                      </dd>
                    </div>
                    {complianceCheck.currentValuation.preferredPrice && (
                      <div>
                        <dt className="text-gray-500">Last Preferred Price</dt>
                        <dd className="font-medium text-gray-900">
                          ${new Decimal(complianceCheck.currentValuation.preferredPrice).div(100).toFixed(2)}
                        </dd>
                      </div>
                    )}
                    {complianceCheck.currentValuation.reportUrl && (
                      <div className="col-span-2">
                        <dt className="text-gray-500">Report</dt>
                        <dd>
                          <a 
                            href={complianceCheck.currentValuation.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                            View Report
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Add Valuation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add 409A Valuation</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valuation Date
                  </label>
                  <input
                    type="date"
                    value={formData.valuationDate}
                    onChange={(e) => setFormData({ ...formData, valuationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fair Market Value (per share)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fairMarketValue}
                      onChange={(e) => setFormData({ ...formData, fairMarketValue: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latest Preferred Price (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.preferredPrice}
                      onChange={(e) => setFormData({ ...formData, preferredPrice: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valuation Method
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="409A">409A Standard</option>
                    <option value="MARKET_APPROACH">Market Approach</option>
                    <option value="INCOME_APPROACH">Income Approach</option>
                    <option value="ASSET_APPROACH">Asset Approach</option>
                    <option value="SAFE_HARBOR">Safe Harbor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Through
                  </label>
                  <input
                    type="date"
                    value={formData.validThrough}
                    onChange={(e) => setFormData({ ...formData, validThrough: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Carta, Armanino, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report URL
                  </label>
                  <input
                    type="url"
                    value={formData.reportUrl}
                    onChange={(e) => setFormData({ ...formData, reportUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Valuation
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};