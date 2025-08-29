import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, InformationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { DocumentTemplate, DocumentField } from '../types';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  template: DocumentTemplate;
  onClose: () => void;
}

export function GenerateDocumentModal({ isOpen, template, onClose }: GenerateDocumentModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    // Initialize form with default values
    const initialData: Record<string, any> = {};
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue;
      }
    });
    return initialData;
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'form' | 'generating' | 'complete'>('form');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    template.fields.forEach(field => {
      const value = formData[field.name];
      
      if (field.required && (!value || value.toString().trim() === '')) {
        newErrors[field.name] = `${field.label} is required`;
      }
      
      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[field.name] = 'Invalid email format';
      }
      
      if (field.type === 'number' && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[field.name] = 'Must be a valid number';
        } else if (field.validation?.min !== undefined && numValue < field.validation.min) {
          newErrors[field.name] = `Must be at least ${field.validation.min}`;
        } else if (field.validation?.max !== undefined && numValue > field.validation.max) {
          newErrors[field.name] = `Must be at most ${field.validation.max}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    setCurrentStep('generating');
    
    try {
      // Simulate document generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('Generating document:', {
        templateId: template.id,
        data: formData
      });
      
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error generating document:', error);
      setCurrentStep('form');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderField = (field: DocumentField) => {
    const value = formData[field.name] || '';
    const hasError = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
            }`}
            placeholder={field.label}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value) || '')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
            }`}
            placeholder={field.label}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
            }`}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
            }`}
          >
            <option value="">Select {field.label}...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">{field.label}</span>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'form':
        return (
          <>
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <DocumentTextIcon className="h-8 w-8 text-primary-600" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {template.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                  {errors[field.name] && (
                    <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p><strong>What happens next:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Document will be generated using the information provided</li>
                    <li>You'll receive a PDF ready for download and signing</li>
                    <li>Document will be automatically saved to your library</li>
                    {template.type === 'stock-certificate' && (
                      <li>Certificate number will be automatically assigned</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </>
        );

      case 'generating':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please wait while we create your {template.name.toLowerCase()}...
            </p>
            <div className="max-w-md mx-auto bg-gray-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Document Generated!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your {template.name.toLowerCase()} has been successfully created and is ready for download.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Document:</span>
                <span className="font-medium text-green-900">{template.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Status:</span>
                <span className="font-medium text-green-900">Ready for Download</span>
              </div>
              {template.type === 'option-agreement' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700">Signature:</span>
                  <span className="font-medium text-orange-800">Required</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Download PDF
              </button>
              <button className="px-4 py-2 bg-white text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50">
                Preview Document
              </button>
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {currentStep === 'form' ? 'Generate Document' :
                     currentStep === 'generating' ? 'Generating...' : 'Document Complete'}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                    disabled={isGenerating}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {renderStepContent()}

                {currentStep === 'form' && (
                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Generate Document
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