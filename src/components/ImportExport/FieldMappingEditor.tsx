import React, { useState, useEffect } from 'react';
import { IParseResult, IFieldMapping } from '../../services/importExport/parseEngine';
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface IFieldMappingEditorProps {
  parseResult: IParseResult;
  initialMappings: IFieldMapping[];
  targetSchema: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
  onMappingComplete: (mappings: IFieldMapping[]) => void;
}

// Available target fields for each schema
const TARGET_FIELDS = {
  shareholders: [
    { field: 'name', label: 'Name', required: true, type: 'string' },
    { field: 'email', label: 'Email', required: false, type: 'email' },
    { field: 'share_count', label: 'Share Count', required: true, type: 'number' },
    { field: 'share_class', label: 'Share Class', required: true, type: 'string' },
    { field: 'certificate_number', label: 'Certificate Number', required: false, type: 'string' },
    { field: 'issue_date', label: 'Issue Date', required: false, type: 'date' },
    { field: 'vesting_start', label: 'Vesting Start Date', required: false, type: 'date' },
    { field: 'vesting_cliff', label: 'Vesting Cliff (months)', required: false, type: 'number' },
    { field: 'vesting_period', label: 'Vesting Period (months)', required: false, type: 'number' }
  ],
  transactions: [
    { field: 'transaction_type', label: 'Transaction Type', required: true, type: 'string' },
    { field: 'shareholder_name', label: 'Shareholder Name', required: true, type: 'string' },
    { field: 'share_count', label: 'Share Count', required: true, type: 'number' },
    { field: 'price_per_share', label: 'Price Per Share', required: false, type: 'number' },
    { field: 'transaction_date', label: 'Transaction Date', required: true, type: 'date' },
    { field: 'notes', label: 'Notes', required: false, type: 'string' }
  ],
  share_classes: [
    { field: 'class_name', label: 'Class Name', required: true, type: 'string' },
    { field: 'authorized_shares', label: 'Authorized Shares', required: true, type: 'number' },
    { field: 'par_value', label: 'Par Value', required: false, type: 'number' },
    { field: 'liquidation_preference', label: 'Liquidation Preference', required: false, type: 'number' },
    { field: 'dividend_rate', label: 'Dividend Rate', required: false, type: 'number' }
  ],
  vesting_schedules: [
    { field: 'shareholder_name', label: 'Shareholder Name', required: true, type: 'string' },
    { field: 'total_shares', label: 'Total Shares', required: true, type: 'number' },
    { field: 'start_date', label: 'Start Date', required: true, type: 'date' },
    { field: 'cliff_months', label: 'Cliff Period (months)', required: false, type: 'number' },
    { field: 'vesting_months', label: 'Vesting Period (months)', required: true, type: 'number' }
  ]
};

const TRANSFORMATIONS = [
  { value: '', label: 'No transformation' },
  { value: 'uppercase', label: 'Convert to uppercase' },
  { value: 'lowercase', label: 'Convert to lowercase' },
  { value: 'trim', label: 'Remove whitespace' },
  { value: 'number', label: 'Convert to number' },
  { value: 'date', label: 'Convert to date' },
  { value: 'boolean', label: 'Convert to boolean' }
];

export const FieldMappingEditor: React.FC<IFieldMappingEditorProps> = ({
  parseResult,
  initialMappings,
  targetSchema,
  onMappingComplete
}) => {
  const [mappings, setMappings] = useState<IFieldMapping[]>(initialMappings);
  const [unmappedSources, setUnmappedSources] = useState<string[]>([]);
  const [unmappedTargets, setUnmappedTargets] = useState<string[]>([]);

  const targetFields = TARGET_FIELDS[targetSchema] || [];

  useEffect(() => {
    // Find unmapped source fields
    const mappedSources = mappings.map(m => m.sourceField);
    const unmappedSrc = parseResult.headers.filter(header => 
      !mappedSources.includes(header)
    );
    setUnmappedSources(unmappedSrc);

    // Find unmapped target fields
    const mappedTargets = mappings.map(m => m.targetField);
    const unmappedTgt = targetFields
      .filter(field => !mappedTargets.includes(field.field))
      .map(field => field.field);
    setUnmappedTargets(unmappedTgt);
  }, [mappings, parseResult.headers, targetFields]);

  const handleMappingChange = (index: number, field: keyof IFieldMapping, value: any) => {
    setMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalculate confidence when target field changes
      if (field === 'targetField') {
        updated[index].confidence = calculateMappingConfidence(
          updated[index].sourceField,
          value
        );
      }
      
      return updated;
    });
  };

  const calculateMappingConfidence = (sourceField: string, targetField: string): number => {
    const sourceLower = sourceField.toLowerCase().replace(/[_\s-]/g, '');
    const targetLower = targetField.toLowerCase().replace(/[_\s-]/g, '');
    
    // Exact match
    if (sourceLower === targetLower) return 1.0;
    
    // Contains match
    if (sourceLower.includes(targetLower) || targetLower.includes(sourceLower)) {
      return 0.8;
    }
    
    // Partial similarity
    const similarity = calculateSimilarity(sourceLower, targetLower);
    return Math.max(0.1, similarity);
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  };

  const addMapping = () => {
    if (unmappedSources.length > 0 && unmappedTargets.length > 0) {
      const newMapping: IFieldMapping = {
        sourceField: unmappedSources[0],
        targetField: unmappedTargets[0],
        confidence: calculateMappingConfidence(unmappedSources[0], unmappedTargets[0])
      };
      setMappings(prev => [...prev, newMapping]);
    }
  };

  const removeMapping = (index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    onMappingComplete(mappings);
  };

  const getRequiredTargets = () => {
    return targetFields.filter(field => field.required).map(field => field.field);
  };

  const getMissingRequiredFields = () => {
    const mappedTargets = mappings.map(m => m.targetField);
    return getRequiredTargets().filter(field => !mappedTargets.includes(field));
  };

  const canComplete = () => {
    return getMissingRequiredFields().length === 0;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFieldSample = (sourceField: string) => {
    const sampleValues = parseResult.data
      .slice(0, 3)
      .map(row => row[sourceField])
      .filter(val => val != null && val !== '');
    
    return sampleValues.length > 0 ? sampleValues.join(', ') : 'No data';
  };

  return (
    <div className="space-y-6">
      {/* Mapping Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Field Mapping Status</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>{mappings.length} fields mapped</p>
              {getMissingRequiredFields().length > 0 && (
                <p className="text-red-600">
                  Missing required fields: {getMissingRequiredFields().join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Field Mappings Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">Field Mappings</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sample Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transform
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mappings.map((mapping, index) => {
                const targetField = targetFields.find(f => f.field === mapping.targetField);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {mapping.sourceField}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {getFieldSample(mapping.sourceField)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping.targetField}
                        onChange={(e) => handleMappingChange(index, 'targetField', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select target field</option>
                        {targetFields.map(field => (
                          <option key={field.field} value={field.field}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping.transformation || ''}
                        onChange={(e) => handleMappingChange(index, 'transformation', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        {TRANSFORMATIONS.map(transform => (
                          <option key={transform.value} value={transform.value}>
                            {transform.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className={`text-xs font-medium ${getConfidenceColor(mapping.confidence)}`}>
                          {Math.round(mapping.confidence * 100)}%
                        </span>
                        {targetField?.required && (
                          <span className="ml-2 text-xs text-red-500">Required</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeMapping(index)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {mappings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No field mappings defined. Click "Add Mapping" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unmapped Fields */}
      {(unmappedSources.length > 0 || unmappedTargets.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {unmappedSources.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Unmapped Source Fields ({unmappedSources.length})
              </h4>
              <div className="space-y-1">
                {unmappedSources.map(field => (
                  <div key={field} className="text-sm text-yellow-700">
                    {field}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {unmappedTargets.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Available Target Fields ({unmappedTargets.length})
              </h4>
              <div className="space-y-1">
                {targetFields
                  .filter(field => unmappedTargets.includes(field.field))
                  .map(field => (
                    <div key={field.field} className="text-sm text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={addMapping}
          disabled={unmappedSources.length === 0 || unmappedTargets.length === 0}
          className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            unmappedSources.length > 0 && unmappedTargets.length > 0
              ? 'text-blue-700 bg-blue-100 border border-blue-300 hover:bg-blue-200 focus:ring-blue-500'
              : 'text-gray-400 bg-gray-100 border border-gray-300 cursor-not-allowed'
          }`}
        >
          Add Mapping
        </button>

        <button
          onClick={handleComplete}
          disabled={!canComplete()}
          className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            canComplete()
              ? 'text-white bg-blue-600 border border-transparent hover:bg-blue-700 focus:ring-blue-500'
              : 'text-gray-400 bg-gray-100 border border-gray-300 cursor-not-allowed'
          }`}
        >
          Continue to Validation
        </button>
      </div>
    </div>
  );
};