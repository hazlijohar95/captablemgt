import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { FieldMappingEditor } from './FieldMappingEditor';
import { ValidationSummary } from './ValidationSummary';
import { ImportProgress } from './ImportProgress';
import { IParseResult, IFieldMapping } from '../../services/importExport/parseEngine';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';

interface IImportWizardProps {
  companyId: string;
  targetSchema: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
  onComplete: (result: { success: boolean; imported: number; errors: string[] }) => void;
  onCancel: () => void;
}

type WizardStep = 'upload' | 'mapping' | 'validation' | 'import' | 'complete';

export const ImportWizard: React.FC<IImportWizardProps> = ({
  companyId,
  targetSchema,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [parseResult, setParseResult] = useState<IParseResult | null>(null);
  const [fieldMappings, setFieldMappings] = useState<IFieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{
    total: number;
    processed: number;
    errors: string[];
    status: 'idle' | 'processing' | 'complete' | 'error';
  }>({
    total: 0,
    processed: 0,
    errors: [],
    status: 'idle'
  });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const steps = [
    { id: 'upload', name: 'Upload File', description: 'Select and parse your data file' },
    { id: 'mapping', name: 'Field Mapping', description: 'Map fields to database columns' },
    { id: 'validation', name: 'Validate Data', description: 'Review and fix data issues' },
    { id: 'import', name: 'Import Data', description: 'Import data to your cap table' },
    { id: 'complete', name: 'Complete', description: 'Import completed successfully' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleParseComplete = (result: IParseResult) => {
    setParseResult(result);
    setFieldMappings(result.fieldMappings);
    
    if (result.success && result.confidence > 0.7) {
      // Auto-advance if high confidence
      setCurrentStep('validation');
    } else {
      // Go to mapping step for manual review
      setCurrentStep('mapping');
    }
  };

  const handleMappingComplete = (mappings: IFieldMapping[]) => {
    setFieldMappings(mappings);
    setCurrentStep('validation');
  };

  const handleValidationComplete = (errors: string[]) => {
    setValidationErrors(errors);
    if (errors.length === 0) {
      setCurrentStep('import');
      startImport();
    }
  };

  const startImport = async () => {
    if (!parseResult) return;

    setImportProgress({
      total: parseResult.data.length,
      processed: 0,
      errors: [],
      status: 'processing'
    });

    try {
      // Create import job
      const { data: importJob, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          company_id: companyId,
          job_type: 'import',
          target_table: targetSchema,
          total_records: parseResult.data.length,
          status: 'processing',
          metadata: {
            fieldMappings,
            originalHeaders: parseResult.headers,
            parseOptions: {}
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Process data in batches
      const batchSize = 100;
      let processed = 0;
      const errors: string[] = [];

      for (let i = 0; i < parseResult.data.length; i += batchSize) {
        const batch = parseResult.data.slice(i, i + batchSize);
        
        try {
          await processBatch(batch, importJob.id);
          processed += batch.length;
          
          setImportProgress(prev => ({
            ...prev,
            processed: Math.min(processed, prev.total)
          }));

          // Update job progress
          await supabase
            .from('import_jobs')
            .update({
              processed_records: processed,
              progress_percentage: Math.round((processed / parseResult.data.length) * 100)
            })
            .eq('id', importJob.id);

        } catch (batchError) {
          const errorMessage = `Batch ${Math.floor(i / batchSize) + 1}: ${
            batchError instanceof Error ? batchError.message : 'Unknown error'
          }`;
          errors.push(errorMessage);
          
          console.error('Batch processing error:', batchError);
        }
      }

      // Finalize import job
      const finalStatus = errors.length > 0 ? 'completed_with_errors' : 'completed';
      await supabase
        .from('import_jobs')
        .update({
          status: finalStatus,
          processed_records: processed,
          error_count: errors.length,
          completed_at: new Date().toISOString(),
          error_details: errors.length > 0 ? errors : null
        })
        .eq('id', importJob.id);

      setImportProgress(prev => ({
        ...prev,
        errors,
        status: errors.length > 0 ? 'error' : 'complete'
      }));

      setCurrentStep('complete');
      
      // Notify parent component
      onComplete({
        success: errors.length === 0,
        imported: processed,
        errors
      });

    } catch (error) {
      console.error('Import failed:', error);
      setImportProgress(prev => ({
        ...prev,
        status: 'error',
        errors: [...prev.errors, error instanceof Error ? error.message : 'Import failed']
      }));
    }
  };

  const processBatch = async (batch: Record<string, any>[], jobId: string) => {
    // Transform data based on field mappings
    const transformedBatch = batch.map(row => {
      const transformed: Record<string, any> = {
        company_id: companyId,
        import_job_id: jobId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      fieldMappings.forEach(mapping => {
        if (row[mapping.sourceField] !== undefined) {
          transformed[mapping.targetField] = row[mapping.sourceField];
        }
      });

      return transformed;
    });

    // Insert based on target schema
    const { error } = await supabase
      .from(targetSchema)
      .insert(transformedBatch);

    if (error) throw error;
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id as WizardStep);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id as WizardStep);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'upload':
        return parseResult?.success;
      case 'mapping':
        return fieldMappings.length > 0;
      case 'validation':
        return validationErrors.length === 0;
      case 'import':
        return importProgress.status === 'complete';
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium
                ${index < currentStepIndex 
                  ? 'bg-green-100 border-green-500 text-green-600' 
                  : index === currentStepIndex
                  ? 'bg-blue-100 border-blue-500 text-blue-600'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
                }
              `}>
                {index < currentStepIndex ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3 min-w-0">
                <p className={`text-sm font-medium ${
                  index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.name}
                </p>
                <p className={`text-xs ${
                  index <= currentStepIndex ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <ChevronRightIcon className="w-5 h-5 text-gray-400 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {currentStep === 'upload' && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Upload {targetSchema.replace('_', ' ').toUpperCase()} Data
            </h2>
            <FileUpload
              onParseComplete={handleParseComplete}
              targetSchema={targetSchema}
            />
          </div>
        )}

        {currentStep === 'mapping' && parseResult && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Review Field Mappings
            </h2>
            <FieldMappingEditor
              parseResult={parseResult}
              initialMappings={fieldMappings}
              targetSchema={targetSchema}
              onMappingComplete={handleMappingComplete}
            />
          </div>
        )}

        {currentStep === 'validation' && parseResult && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Validate Data
            </h2>
            <ValidationSummary
              parseResult={parseResult}
              fieldMappings={fieldMappings}
              targetSchema={targetSchema}
              onValidationComplete={handleValidationComplete}
            />
          </div>
        )}

        {currentStep === 'import' && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Importing Data
            </h2>
            <ImportProgress
              total={importProgress.total}
              processed={importProgress.processed}
              status={importProgress.status}
              errors={importProgress.errors}
            />
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              Import Completed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Successfully imported {importProgress.processed} of {importProgress.total} records
              {importProgress.errors.length > 0 && (
                <span className="text-yellow-600">
                  {' '}with {importProgress.errors.length} warnings
                </span>
              )}
            </p>
            
            {importProgress.errors.length > 0 && (
              <div className="mt-4 text-left bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Import Warnings:</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {importProgress.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>

        <div className="flex space-x-3">
          {currentStepIndex > 0 && currentStep !== 'complete' && (
            <button
              onClick={handlePrevious}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              Previous
            </button>
          )}

          {currentStep === 'complete' ? (
            <button
              onClick={() => onComplete({
                success: importProgress.status === 'complete',
                imported: importProgress.processed,
                errors: importProgress.errors
              })}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Done
            </button>
          ) : currentStep !== 'import' && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                canProceed()
                  ? 'text-white bg-blue-600 border border-transparent hover:bg-blue-700 focus:ring-blue-500'
                  : 'text-gray-400 bg-gray-100 border border-gray-300 cursor-not-allowed'
              }`}
            >
              {currentStep === 'validation' ? 'Start Import' : 'Next'}
              <ChevronRightIcon className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};