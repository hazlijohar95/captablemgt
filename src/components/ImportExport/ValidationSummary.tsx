import React, { useState, useEffect } from 'react';
import { IParseResult, IFieldMapping } from '../../services/importExport/parseEngine';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface IValidationSummaryProps {
  parseResult: IParseResult;
  fieldMappings: IFieldMapping[];
  targetSchema: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
  onValidationComplete: (errors: string[]) => void;
}

interface IValidationResult {
  field: string;
  row: number;
  value: any;
  error: string;
  severity: 'error' | 'warning';
}

const VALIDATION_RULES = {
  shareholders: {
    name: { required: true, type: 'string', minLength: 1 },
    email: { required: false, type: 'email' },
    share_count: { required: true, type: 'number', min: 0 },
    share_class: { required: true, type: 'string' }
  },
  transactions: {
    transaction_type: { required: true, type: 'string' },
    shareholder_name: { required: true, type: 'string' },
    share_count: { required: true, type: 'number', min: 0 },
    transaction_date: { required: true, type: 'date' }
  },
  share_classes: {
    class_name: { required: true, type: 'string' },
    authorized_shares: { required: true, type: 'number', min: 1 }
  },
  vesting_schedules: {
    shareholder_name: { required: true, type: 'string' },
    total_shares: { required: true, type: 'number', min: 1 },
    start_date: { required: true, type: 'date' },
    vesting_months: { required: true, type: 'number', min: 1 }
  }
};

export const ValidationSummary: React.FC<IValidationSummaryProps> = ({
  parseResult,
  fieldMappings,
  targetSchema,
  onValidationComplete
}) => {
  const [validationResults, setValidationResults] = useState<IValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const validationRules = VALIDATION_RULES[targetSchema] || {};

  useEffect(() => {
    validateData();
  }, [parseResult, fieldMappings, targetSchema]);

  const validateData = async () => {
    setIsValidating(true);
    const results: IValidationResult[] = [];

    // Create field mapping lookup
    const fieldMap = new Map<string, string>();
    fieldMappings.forEach(mapping => {
      fieldMap.set(mapping.sourceField, mapping.targetField);
    });

    // Validate each row
    for (let rowIndex = 0; rowIndex < parseResult.data.length; rowIndex++) {
      const row = parseResult.data[rowIndex];
      const mappedRow: Record<string, any> = {};

      // Map source fields to target fields
      for (const [sourceField, value] of Object.entries(row)) {
        if (sourceField === '_rowIndex') continue;
        const targetField = fieldMap.get(sourceField);
        if (targetField) {
          mappedRow[targetField] = value;
        }
      }

      // Validate against rules
      for (const [field, rules] of Object.entries(validationRules)) {
        const value = mappedRow[field];
        const fieldResults = validateField(field, value, rules, rowIndex + 1);
        results.push(...fieldResults);
      }

      // Additional business logic validation
      const businessResults = validateBusinessLogic(mappedRow, rowIndex + 1, targetSchema);
      results.push(...businessResults);
    }

    setValidationResults(results);
    setIsValidating(false);

    // Notify parent with error messages
    const errorMessages = results
      .filter(result => result.severity === 'error')
      .map(result => `Row ${result.row}, ${result.field}: ${result.error}`);
    
    onValidationComplete(errorMessages);
  };

  const validateField = (
    field: string,
    value: any,
    rules: any,
    rowNumber: number
  ): IValidationResult[] => {
    const results: IValidationResult[] = [];

    // Required field validation
    if (rules.required && (value == null || value === '')) {
      results.push({
        field,
        row: rowNumber,
        value,
        error: `${field} is required but empty`,
        severity: 'error'
      });
      return results;
    }

    // Skip further validation if field is empty and not required
    if (!rules.required && (value == null || value === '')) {
      return results;
    }

    // Type validation
    if (rules.type && value != null) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            results.push({
              field,
              row: rowNumber,
              value,
              error: `Expected string, got ${typeof value}`,
              severity: 'error'
            });
          } else if (rules.minLength && value.length < rules.minLength) {
            results.push({
              field,
              row: rowNumber,
              value,
              error: `Minimum length is ${rules.minLength} characters`,
              severity: 'error'
            });
          }
          break;

        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            results.push({
              field,
              row: rowNumber,
              value,
              error: `Expected number, got "${value}"`,
              severity: 'error'
            });
          } else {
            if (rules.min !== undefined && numValue < rules.min) {
              results.push({
                field,
                row: rowNumber,
                value,
                error: `Value must be at least ${rules.min}`,
                severity: 'error'
              });
            }
            if (rules.max !== undefined && numValue > rules.max) {
              results.push({
                field,
                row: rowNumber,
                value,
                error: `Value must not exceed ${rules.max}`,
                severity: 'error'
              });
            }
          }
          break;

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            results.push({
              field,
              row: rowNumber,
              value,
              error: 'Invalid email format',
              severity: 'error'
            });
          }
          break;

        case 'date':
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            results.push({
              field,
              row: rowNumber,
              value,
              error: 'Invalid date format',
              severity: 'error'
            });
          }
          break;
      }
    }

    return results;
  };

  const validateBusinessLogic = (
    row: Record<string, any>,
    rowNumber: number,
    schema: string
  ): IValidationResult[] => {
    const results: IValidationResult[] = [];

    switch (schema) {
      case 'shareholders':
        // Check for duplicate names within the import
        const nameCount = parseResult.data.filter(
          r => fieldMappings.find(m => m.targetField === 'name') &&
               r[fieldMappings.find(m => m.targetField === 'name')!.sourceField] === 
               row.name
        ).length;
        
        if (nameCount > 1) {
          results.push({
            field: 'name',
            row: rowNumber,
            value: row.name,
            error: 'Duplicate shareholder name in import data',
            severity: 'warning'
          });
        }

        // Validate share count is reasonable
        if (row.share_count && row.share_count > 1000000000) {
          results.push({
            field: 'share_count',
            row: rowNumber,
            value: row.share_count,
            error: 'Share count seems unusually high',
            severity: 'warning'
          });
        }
        break;

      case 'transactions':
        // Validate transaction date is not in the future
        if (row.transaction_date) {
          const transactionDate = new Date(row.transaction_date);
          if (transactionDate > new Date()) {
            results.push({
              field: 'transaction_date',
              row: rowNumber,
              value: row.transaction_date,
              error: 'Transaction date is in the future',
              severity: 'warning'
            });
          }
        }
        break;

      case 'vesting_schedules':
        // Validate vesting start date is reasonable
        if (row.start_date) {
          const startDate = new Date(row.start_date);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 10);
          
          if (startDate < oneYearAgo) {
            results.push({
              field: 'start_date',
              row: rowNumber,
              value: row.start_date,
              error: 'Vesting start date is more than 10 years ago',
              severity: 'warning'
            });
          }
        }
        break;
    }

    return results;
  };

  const getValidationSummary = () => {
    const errors = validationResults.filter(r => r.severity === 'error');
    const warnings = validationResults.filter(r => r.severity === 'warning');
    
    return { errors, warnings };
  };

  const { errors, warnings } = getValidationSummary();
  const canProceed = errors.length === 0;

  if (isValidating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Validating data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <div className={`rounded-lg p-4 ${
        canProceed
          ? warnings.length > 0
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex">
          {canProceed ? (
            warnings.length > 0 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            )
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-400" />
          )}
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              canProceed
                ? warnings.length > 0
                  ? 'text-yellow-800'
                  : 'text-green-800'
                : 'text-red-800'
            }`}>
              {canProceed
                ? warnings.length > 0
                  ? 'Validation passed with warnings'
                  : 'Validation passed'
                : 'Validation failed'
              }
            </h3>
            <div className={`mt-1 text-sm ${
              canProceed
                ? warnings.length > 0
                  ? 'text-yellow-700'
                  : 'text-green-700'
                : 'text-red-700'
            }`}>
              <p>
                {errors.length > 0 && `${errors.length} errors found`}
                {errors.length > 0 && warnings.length > 0 && ', '}
                {warnings.length > 0 && `${warnings.length} warnings`}
              </p>
              <p className="mt-1">
                Ready to import {parseResult.rowCount} records
                {canProceed ? '' : ' (fix errors first)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Details */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">
              Validation Issues ({errors.length + warnings.length})
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          {showDetails && (
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {[...errors, ...warnings]
                .sort((a, b) => a.row - b.row)
                .map((result, index) => (
                  <div key={index} className="px-4 py-3">
                    <div className="flex items-start space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        result.severity === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          Row {result.row}, Field "{result.field}": {result.error}
                        </p>
                        {result.value && (
                          <p className="text-xs text-gray-500 mt-1">
                            Value: "{String(result.value)}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Sample Data Preview */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">
            Data Preview (first 3 rows after mapping)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {fieldMappings.map(mapping => (
                  <th
                    key={mapping.targetField}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {mapping.targetField}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parseResult.data.slice(0, 3).map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {fieldMappings.map(mapping => (
                    <td
                      key={mapping.targetField}
                      className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate"
                    >
                      {String(row[mapping.sourceField] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};