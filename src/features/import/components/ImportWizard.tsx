import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, Button } from '@/components/ui';
import {
  IImportPreview,
  IImportValidationResult,
  IImportResult,
  IImportMapping,
  IImportOptions,
  IImportProgress,
  IMPORT_TEMPLATES
} from '../types/import.types';
import { importService } from '../services/importService';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useCSRFForm } from '@/hooks/useCSRFProtection';

interface IImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: IImportResult) => void;
}

type WizardStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'importing' | 'complete';

export const ImportWizard: React.FC<IImportWizardProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { companyId } = useCompanyContext();
  const csrf = useCSRFForm();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<IImportPreview | null>(null);
  const [mappings, setMappings] = useState<IImportMapping[]>([]);
  const [validationResult, setValidationResult] = useState<IImportValidationResult | null>(null);
  const [importResult, setImportResult] = useState<IImportResult | null>(null);
  const [progress, setProgress] = useState<IImportProgress | null>(null);
  const [options, setOptions] = useState<IImportOptions>({
    skipFirstRow: true,
    skipEmptyRows: true,
    validateUnique: true
  });

  // Error handling
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // File upload handling
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setLoading(true);

    try {
      importService.setProgressCallback(setProgress);
      const filePreview = await importService.parseFileForPreview(file, options);
      setPreview(filePreview);
      setMappings(filePreview.detectedMappings);
      setCurrentStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, [options]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB limit
  });

  // Navigation handlers
  const handleNext = async () => {
    setError(null);
    setLoading(true);

    try {
      switch (currentStep) {
        case 'preview':
          setCurrentStep('mapping');
          break;
          
        case 'mapping':
          if (!preview) throw new Error('No preview data available');
          
          // Validate the data with current mappings
          const validation = importService.validateData(
            preview.sampleRows.concat(Array(preview.rowCount - preview.sampleRows.length).fill({})), // Mock full data
            mappings,
            options
          );
          setValidationResult(validation);
          setCurrentStep('validation');
          break;
          
        case 'validation':
          if (!validationResult) throw new Error('No validation result available');
          
          setCurrentStep('importing');
          
          // Perform the actual import
          const secureFormData = await csrf.prepareSubmission({}, companyId);
          const result = await importService.importData(
            validationResult,
            companyId,
            secureFormData.csrfToken
          );
          
          setImportResult(result);
          setCurrentStep('complete');
          
          if (result.success) {
            onSuccess(result);
          }
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    switch (currentStep) {
      case 'preview':
        setCurrentStep('upload');
        break;
      case 'mapping':
        setCurrentStep('preview');
        break;
      case 'validation':
        setCurrentStep('mapping');
        break;
      case 'complete':
        handleClose();
        break;
    }
  };

  const handleClose = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setPreview(null);
    setMappings([]);
    setValidationResult(null);
    setImportResult(null);
    setProgress(null);
    setError(null);
    onClose();
  };

  // Download template handler
  const downloadTemplate = (templateName: keyof typeof IMPORT_TEMPLATES) => {
    try {
      const dataUri = importService.generateTemplate(templateName);
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = `${templateName}_template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setError('Failed to generate template');
    }
  };

  // Placeholder for future mapping updates
  // const updateMapping = (_index: number, _field: keyof IImportMapping, _value: any) => {
  //   const newMappings = [...mappings];
  //   newMappings[index] = { ...newMappings[index], [field]: value };
  //   setMappings(newMappings);
  // };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Import Cap Table Data</h2>
            <p className="text-sm text-gray-600 mt-1">
              Import stakeholders and securities from Excel, CSV, or JSON files
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[
              { step: 'upload', label: 'Upload File', icon: CloudArrowUpIcon },
              { step: 'preview', label: 'Preview Data', icon: DocumentTextIcon },
              { step: 'mapping', label: 'Map Fields', icon: ArrowRightIcon },
              { step: 'validation', label: 'Validate', icon: CheckCircleIcon },
              { step: 'importing', label: 'Import', icon: CloudArrowUpIcon },
            ].map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === step ? 'bg-primary-500 border-primary-500 text-white' :
                  ['preview', 'mapping', 'validation', 'importing', 'complete'].indexOf(currentStep) > index 
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep === step ? 'text-primary-600 font-medium' : 'text-gray-500'
                }`}>
                  {label}
                </span>
                {index < 4 && (
                  <ArrowRightIcon className="h-4 w-4 text-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {progress && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">{progress.message}</span>
                <span className="text-sm text-blue-700">{progress.progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.currentRow && progress.totalRows && (
                <p className="text-xs text-blue-600 mt-1">
                  Row {progress.currentRow} of {progress.totalRows}
                </p>
              )}
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* Templates Section */}
              <Card>
                <CardHeader 
                  title="Download Templates"
                  description="Use our pre-made templates for easy import"
                />
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(IMPORT_TEMPLATES).map(([key, template]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate(key as keyof typeof IMPORT_TEMPLATES)}
                        leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader 
                  title="Upload Your File"
                  description="Drag and drop or click to select your cap table data file"
                />
                <div className="p-6">
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                      isDragActive
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    {isDragActive ? (
                      <p className="text-lg text-primary-600">Drop your file here...</p>
                    ) : (
                      <>
                        <p className="text-lg text-gray-600 mb-2">
                          Drag and drop your file here, or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports CSV, Excel (.xlsx), and JSON files up to 50MB
                        </p>
                      </>
                    )}
                    {selectedFile && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">
                          📄 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-gray-900">Import Options</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={options.skipFirstRow}
                          onChange={(e) => setOptions(prev => ({ ...prev, skipFirstRow: e.target.checked }))}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Skip first row (header row)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={options.skipEmptyRows}
                          onChange={(e) => setOptions(prev => ({ ...prev, skipEmptyRows: e.target.checked }))}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Skip empty rows</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={options.validateUnique}
                          onChange={(e) => setOptions(prev => ({ ...prev, validateUnique: e.target.checked }))}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Validate unique email addresses</span>
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {currentStep === 'preview' && preview && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-800">
                    Successfully parsed {preview.rowCount} rows with {preview.headers.length} columns
                  </p>
                </div>
              </div>

              {/* Data Preview */}
              <Card>
                <CardHeader 
                  title="Data Preview"
                  description="Review the first few rows of your data"
                />
                <div className="p-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.headers.map(header => (
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
                      {preview.sampleRows.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {preview.headers.map(header => (
                            <td key={header} className="px-4 py-2 text-sm text-gray-900">
                              {String(row[header] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Additional steps (mapping, validation, importing, complete) would be implemented here */}
          {currentStep === 'mapping' && (
            <div className="text-center py-12">
              <p className="text-gray-600">Field mapping interface will be implemented next...</p>
            </div>
          )}

          {currentStep === 'validation' && (
            <div className="text-center py-12">
              <p className="text-gray-600">Validation results will be shown here...</p>
            </div>
          )}

          {currentStep === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Importing your data...</p>
            </div>
          )}

          {currentStep === 'complete' && importResult && (
            <div className="text-center py-12">
              {importResult.success ? (
                <div>
                  <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Import Successful!</h3>
                  <p className="text-gray-600 mb-4">
                    Imported {importResult.importedStakeholders} stakeholders and {importResult.importedSecurities} securities
                  </p>
                </div>
              ) : (
                <div>
                  <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Import Failed</h3>
                  <p className="text-gray-600 mb-4">
                    Please review the errors and try again
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={loading || currentStep === 'upload'}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            Back
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            
            {currentStep !== 'complete' && (
              <Button
                onClick={handleNext}
                disabled={loading || !selectedFile || (currentStep === 'upload' && !preview)}
                rightIcon={<ArrowRightIcon className="h-4 w-4" />}
              >
                {loading ? 'Processing...' : 
                 currentStep === 'validation' ? 'Import Data' : 'Next'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};