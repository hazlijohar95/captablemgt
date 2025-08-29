import { useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'select' | 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

const importSources = [
  {
    id: 'csv',
    name: 'CSV File',
    description: 'Upload a CSV file with stakeholder and equity data',
    icon: '📄',
    formats: ['.csv']
  },
  {
    id: 'excel',
    name: 'Excel File',
    description: 'Upload an Excel spreadsheet with your cap table',
    icon: '📊',
    formats: ['.xlsx', '.xls']
  },
  {
    id: 'carta',
    name: 'Carta Export',
    description: 'Import data from Carta platform export',
    icon: '📋',
    formats: ['.csv', '.xlsx']
  },
  {
    id: 'capshare',
    name: 'CapShare Export',
    description: 'Import data from CapShare platform',
    icon: '📈',
    formats: ['.csv']
  },
  {
    id: 'eqvista',
    name: 'Eqvista Export',
    description: 'Import data from Eqvista platform',
    icon: '📑',
    formats: ['.xlsx']
  }
];

export function DataImportModal({ isOpen, onClose }: DataImportModalProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('select');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setCurrentStep('select');
    setSelectedSource('');
    setUploadedFile(null);
    setImportProgress(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSourceSelect = (sourceId: string) => {
    setSelectedSource(sourceId);
    setCurrentStep('upload');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setCurrentStep('mapping');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const startImport = async () => {
    setCurrentStep('importing');
    
    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setCurrentStep('complete');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Import Source</h3>
            <p className="text-sm text-gray-600 mb-6">
              Select the platform or format you want to import your cap table data from.
            </p>
            
            <div className="grid gap-3">
              {importSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceSelect(source.id)}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                >
                  <div className="text-2xl mr-4">{source.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{source.name}</h4>
                    <p className="text-sm text-gray-600">{source.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {source.formats.map(format => (
                        <span key={format} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'upload':
        const selectedSourceInfo = importSources.find(s => s.id === selectedSource);
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload {selectedSourceInfo?.name}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Upload your {selectedSourceInfo?.name.toLowerCase()} containing cap table data.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Drop your file here or click to browse
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Supported formats: {selectedSourceInfo?.formats.join(', ')}
              </p>
              <button
                onClick={triggerFileUpload}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={selectedSourceInfo?.formats.join(',')}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Field Mapping</h3>
            <p className="text-sm text-gray-600 mb-6">
              Map the columns in your file to the corresponding fields in your cap table.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium">{uploadedFile?.name}</span>
                <span className="text-xs text-gray-500">
                  ({(uploadedFile?.size || 0 / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { field: 'Name', required: true },
                { field: 'Email', required: true },
                { field: 'Shares', required: true },
                { field: 'Share Class', required: false },
                { field: 'Grant Date', required: false },
                { field: 'Vesting Start', required: false }
              ].map((field) => (
                <div key={field.field} className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    {field.field}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select column...</option>
                    <option value="col1">Column A</option>
                    <option value="col2">Column B</option>
                    <option value="col3">Column C</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        );

      case 'preview':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preview Import</h3>
            <p className="text-sm text-gray-600 mb-6">
              Review the data that will be imported. Make sure everything looks correct.
            </p>
            
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shares</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    { name: 'John Doe', email: 'john@company.com', shares: '500,000', class: 'Common' },
                    { name: 'Jane Smith', email: 'jane@company.com', shares: '250,000', class: 'Common' },
                    { name: 'Series A Fund', email: 'fund@vc.com', shares: '2,000,000', class: 'Preferred A' }
                  ].map((row, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.shares}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.class}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>3 stakeholders</strong> will be imported with <strong>2,750,000 total shares</strong>
              </p>
            </div>
          </div>
        );

      case 'importing':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Data</h3>
            <p className="text-sm text-gray-600 mb-6">
              Please wait while we import your cap table data...
            </p>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">{importProgress}% complete</p>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your cap table data has been successfully imported.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Stakeholders imported:</span>
                <span className="font-medium text-green-900">3</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Total shares:</span>
                <span className="font-medium text-green-900">2,750,000</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select': return 'Import Data';
      case 'upload': return 'Upload File';
      case 'mapping': return 'Field Mapping';
      case 'preview': return 'Preview Import';
      case 'importing': return 'Importing...';
      case 'complete': return 'Import Complete';
      default: return 'Import Data';
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {getStepTitle()}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={handleClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {renderStepContent()}

                {currentStep !== 'importing' && currentStep !== 'complete' && (
                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStep === 'upload') setCurrentStep('select');
                        else if (currentStep === 'mapping') setCurrentStep('upload');
                        else if (currentStep === 'preview') setCurrentStep('mapping');
                      }}
                      className={`px-4 py-2 text-sm text-gray-600 hover:text-gray-800 ${
                        currentStep === 'select' ? 'invisible' : ''
                      }`}
                    >
                      Back
                    </button>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      
                      {currentStep === 'mapping' && (
                        <button
                          onClick={() => setCurrentStep('preview')}
                          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                          Preview Import
                        </button>
                      )}
                      
                      {currentStep === 'preview' && (
                        <button
                          onClick={startImport}
                          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                          Import Data
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 'complete' && (
                  <div className="mt-6 flex justify-center space-x-3">
                    <button
                      onClick={() => {
                        handleClose();
                        // Navigate to cap table or stakeholders page
                        window.location.href = '/cap-table';
                      }}
                      className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      View Cap Table
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}