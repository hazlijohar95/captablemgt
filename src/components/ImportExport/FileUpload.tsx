import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseEngine, IParseResult, IParseOptions } from '../../services/importExport/parseEngine';
import { CheckCircleIcon, ExclamationTriangleIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface IFileUploadProps {
  onParseComplete: (result: IParseResult) => void;
  targetSchema?: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
  acceptedTypes?: string[];
  maxSize?: number;
}

export const FileUpload: React.FC<IFileUploadProps> = ({
  onParseComplete,
  targetSchema,
  acceptedTypes = ['.csv', '.xlsx', '.xls'],
  maxSize = 10 * 1024 * 1024 // 10MB
}) => {
  const [parseResult, setParseResult] = useState<IParseResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parseOptions, setParseOptions] = useState<IParseOptions>({
    fileType: 'csv',
    hasHeaders: true,
    delimiter: ',',
    encoding: 'utf-8',
    skipRows: 0,
    targetSchema
  });

  const parseFileContent = useCallback(async (file: File) => {
    setIsUploading(true);
    
    try {
      // Determine file type
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const fileType = fileExtension === 'csv' ? 'csv' : 'excel';
      
      const options: IParseOptions = {
        ...parseOptions,
        fileType,
        targetSchema
      };

      // Parse the file
      const result = await parseEngine.parseFile(file, options);
      
      setParseResult(result);
      onParseComplete(result);
      
    } catch (error) {
      const errorResult: IParseResult = {
        success: false,
        data: [],
        headers: [],
        rowCount: 0,
        errors: [{
          row: 0,
          column: '',
          value: null,
          message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        fieldMappings: [],
        confidence: 0
      };
      
      setParseResult(errorResult);
      onParseComplete(errorResult);
    } finally {
      setIsUploading(false);
    }
  }, [parseOptions, targetSchema, onParseComplete]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        parseFileContent(acceptedFiles[0]);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize,
    multiple: false
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600">Processing file...</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop file here' : 'Upload your data file'}
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop a CSV or Excel file, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supported formats: {acceptedTypes.join(', ')} (max {Math.round(maxSize / 1024 / 1024)}MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Rejection Errors */}
      {fileRejections.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">File upload errors:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {fileRejections.map((rejection, index) => (
                  <li key={index}>
                    {rejection.file.name}: {rejection.errors.map(e => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Parse Options */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Parse Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Has Headers
            </label>
            <select
              value={parseOptions.hasHeaders ? 'true' : 'false'}
              onChange={(e) => setParseOptions(prev => ({
                ...prev,
                hasHeaders: e.target.value === 'true'
              }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSV Delimiter
            </label>
            <select
              value={parseOptions.delimiter}
              onChange={(e) => setParseOptions(prev => ({
                ...prev,
                delimiter: e.target.value
              }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="\t">Tab</option>
              <option value="|">Pipe (|)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skip Rows
            </label>
            <input
              type="number"
              min="0"
              value={parseOptions.skipRows}
              onChange={(e) => setParseOptions(prev => ({
                ...prev,
                skipRows: parseInt(e.target.value) || 0
              }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Parse Results */}
      {parseResult && (
        <div className="space-y-4">
          {/* Success/Error Summary */}
          <div className={`rounded-lg p-4 ${
            parseResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              {parseResult.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              )}
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  parseResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {parseResult.success ? 'File parsed successfully' : 'Parse errors found'}
                </h3>
                <div className={`mt-1 text-sm ${
                  parseResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  <p>
                    Processed {parseResult.rowCount} rows, {parseResult.headers.length} columns
                  </p>
                  <p>
                    Mapping confidence: 
                    <span className={`font-medium ml-1 ${getConfidenceColor(parseResult.confidence)}`}>
                      {getConfidenceText(parseResult.confidence)} ({Math.round(parseResult.confidence * 100)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Field Mappings */}
          {parseResult.fieldMappings.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Field Mappings</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {parseResult.fieldMappings.map((mapping, index) => (
                  <div key={index} className="px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {mapping.sourceField}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="text-sm text-gray-700">
                        {mapping.targetField}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      mapping.confidence >= 0.8 
                        ? 'bg-green-100 text-green-800'
                        : mapping.confidence >= 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(mapping.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parse Errors */}
          {parseResult.errors.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">
                  Parse Issues ({parseResult.errors.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {parseResult.errors.map((error, index) => (
                  <div key={index} className="px-4 py-3">
                    <div className="flex items-start space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        error.severity === 'error' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {error.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          Row {error.row}, Column "{error.column}": {error.message}
                        </p>
                        {error.value && (
                          <p className="text-xs text-gray-500 mt-1">
                            Value: "{error.value}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Preview */}
          {parseResult.data.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">
                  Data Preview (first 5 rows)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(parseResult.data[0]).slice(0, -1).map((header) => (
                        <th
                          key={header}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parseResult.data.slice(0, 5).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.entries(row).slice(0, -1).map(([key, value]) => (
                          <td key={key} className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {String(value || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};