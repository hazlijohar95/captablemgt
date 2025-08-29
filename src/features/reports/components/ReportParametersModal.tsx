import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { ReportParametersModalProps, ReportParameter, ExportFormat } from '../types';

export const ReportParametersModal: React.FC<ReportParametersModalProps> = ({
  isOpen,
  onClose,
  template,
  onGenerate,
  isGenerating = false
}) => {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [exportFormat, setExportFormat] = useState<ExportFormat>(template.exportFormats[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize parameters with default values
  useEffect(() => {
    if (template.parameters) {
      const defaultParams: Record<string, any> = {};
      template.parameters.forEach(param => {
        if (param.defaultValue !== undefined) {
          defaultParams[param.id] = param.defaultValue;
        }
      });
      setParameters(defaultParams);
    }
  }, [template]);

  const handleParameterChange = (paramId: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramId]: value }));
    // Clear error when user starts typing
    if (errors[paramId]) {
      setErrors(prev => ({ ...prev, [paramId]: '' }));
    }
  };

  const validateParameters = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (template.parameters) {
      template.parameters.forEach(param => {
        if (param.required && !parameters[param.id]) {
          newErrors[param.id] = `${param.name} is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (validateParameters()) {
      onGenerate(parameters, exportFormat);
    }
  };

  const renderParameterInput = (param: ReportParameter) => {
    const commonClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const errorClasses = errors[param.id] ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "";

    switch (param.type) {
      case 'date':
        return (
          <input
            type="date"
            value={parameters[param.id] || ''}
            onChange={(e) => handleParameterChange(param.id, e.target.value)}
            className={`${commonClasses} ${errorClasses}`}
          />
        );

      case 'select':
        return (
          <select
            value={parameters[param.id] || ''}
            onChange={(e) => handleParameterChange(param.id, e.target.value)}
            className={`${commonClasses} ${errorClasses}`}
          >
            {!param.required && <option value="">-- Select an option --</option>}
            {param.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
            {param.options?.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={parameters[param.id]?.includes(option.value) || false}
                  onChange={(e) => {
                    const currentValues = parameters[param.id] || [];
                    if (e.target.checked) {
                      handleParameterChange(param.id, [...currentValues, option.value]);
                    } else {
                      handleParameterChange(param.id, currentValues.filter((v: string) => v !== option.value));
                    }
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={parameters[param.id] || false}
              onChange={(e) => handleParameterChange(param.id, e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={parameters[param.id] || ''}
            onChange={(e) => handleParameterChange(param.id, e.target.value)}
            className={`${commonClasses} ${errorClasses}`}
          />
        );
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Generate {template.name}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-md">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">{template.description}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {template.parameters?.map(param => (
                    <div key={param.id}>
                      <label htmlFor={param.id} className="block text-sm font-medium text-gray-700">
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderParameterInput(param)}
                      {errors[param.id] && (
                        <p className="mt-1 text-sm text-red-600">{errors[param.id]}</p>
                      )}
                    </div>
                  ))}

                  {/* Export Format */}
                  <div>
                    <label htmlFor="exportFormat" className="block text-sm font-medium text-gray-700">
                      Export Format <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="exportFormat"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      {template.exportFormats.map(format => (
                        <option key={format} value={format}>
                          {format.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={onClose}
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};