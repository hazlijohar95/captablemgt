import React from 'react';
import { TrendingUp, DollarSign, Calendar, Award } from 'lucide-react';
import { EmployeeEquitySummary, EmployeeEquityValue } from '@/types/employeePortal';

interface EquityOverviewProps {
  equitySummary: EmployeeEquitySummary;
  equityValue: EmployeeEquityValue;
  isLoading?: boolean;
}

export const EquityOverview: React.FC<EquityOverviewProps> = ({
  equitySummary,
  equityValue,
  isLoading = false
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatShares = (shares: number): string => {
    return new Intl.NumberFormat('en-US').format(shares);
  };

  const formatPercentage = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalShares = equitySummary.common_shares_owned + 
                     equitySummary.total_vested_shares + 
                     equitySummary.total_unvested_shares;

  return (
    <div className="space-y-4">
      {/* Current Equity Value */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Total Equity Value</h3>
          <DollarSign className="w-6 h-6 opacity-80" />
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-bold">
            {formatCurrency(equityValue.total_current_value)}
          </p>
          <p className="text-blue-100 text-sm">
            Current value • {formatCurrency(equityValue.fmv_per_share)}/share
          </p>
          {equityValue.total_potential_value > equityValue.total_current_value && (
            <p className="text-blue-100 text-sm">
              Potential: {formatCurrency(equityValue.total_potential_value)}
            </p>
          )}
        </div>
      </div>

      {/* Equity Holdings Breakdown */}
      <div className="grid grid-cols-1 gap-4">
        {/* Common Shares */}
        {equitySummary.common_shares_owned > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Award className="w-5 h-5 text-green-600 mr-2" />
                Common Shares
              </h4>
              <span className="text-green-600 font-medium">Owned</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Shares</span>
                <span className="font-medium">{formatShares(equitySummary.common_shares_owned)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Value</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(equityValue.common_shares_value)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">% of Total</span>
                <span className="font-medium">
                  {formatPercentage(equitySummary.common_shares_owned, totalShares)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Vested Options */}
        {equitySummary.total_vested_shares > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                Vested Options
              </h4>
              <span className="text-blue-600 font-medium">Available</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Shares</span>
                <span className="font-medium">{formatShares(equitySummary.total_vested_shares)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Value</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(equityValue.vested_options_value)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Exercise Cost</span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(equityValue.exercise_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">% of Total</span>
                <span className="font-medium">
                  {formatPercentage(equitySummary.total_vested_shares, totalShares)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Unvested Options */}
        {equitySummary.total_unvested_shares > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 text-gray-500 mr-2" />
                Unvested Options
              </h4>
              <span className="text-gray-500 font-medium">Pending</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Shares</span>
                <span className="font-medium">{formatShares(equitySummary.total_unvested_shares)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Potential Value</span>
                <span className="font-medium text-gray-500">
                  {formatCurrency(equityValue.unvested_options_potential_value)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">% of Total</span>
                <span className="font-medium">
                  {formatPercentage(equitySummary.total_unvested_shares, totalShares)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Important Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-xs text-yellow-800">
          <strong>Disclaimer:</strong> These values are estimates based on the most recent 409A valuation 
          dated {new Date(equitySummary.summary_updated_at).toLocaleDateString()}. 
          Actual values may vary and should not be considered as investment advice. 
          Please consult with financial and tax professionals.
        </p>
      </div>
    </div>
  );
};