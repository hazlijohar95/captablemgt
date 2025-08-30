/**
 * Progressive disclosure form component
 * Groups related fields and reveals advanced options progressively
 */

import React, { useState, useCallback, Children, isValidElement, cloneElement } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

export interface FormSectionProps {
  title: string;
  description?: string;
  expanded?: boolean;
  expandable?: boolean;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
  className?: string;
  onToggle?: (expanded: boolean) => void;
}

export const FormSection: React.FC<FormSectionProps> = React.memo(({
  title,
  description,
  expanded: controlledExpanded,
  expandable = false,
  required = false,
  error = false,
  children,
  className = '',
  onToggle
}) => {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = useCallback(() => {
    const newExpanded = !expanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpanded);
    }
    onToggle?.(newExpanded);
  }, [expanded, controlledExpanded, onToggle]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Section header */}
      <div
        className={`px-6 py-4 border-b border-gray-200 ${
          expandable ? 'cursor-pointer hover:bg-gray-50' : ''
        } ${error ? 'border-red-200 bg-red-50' : ''}`}
        onClick={expandable ? handleToggle : undefined}
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        onKeyDown={expandable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        } : undefined}
        aria-expanded={expandable ? expanded : undefined}
        aria-controls={expandable ? `section-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className={`text-lg font-medium ${error ? 'text-red-900' : 'text-gray-900'}`}>
              {title}
              {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
            </h3>
            {description && (
              <p className={`mt-1 text-sm ${error ? 'text-red-700' : 'text-gray-500'}`}>
                {description}
              </p>
            )}
          </div>
          
          {expandable && (
            <div className="ml-4">
              {expanded ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section content */}
      {expanded && (
        <div 
          id={expandable ? `section-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
          className="px-6 py-4 space-y-6"
        >
          {children}
        </div>
      )}
    </div>
  );
});

FormSection.displayName = 'FormSection';

export interface ProgressiveFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  spacing?: 'compact' | 'normal' | 'relaxed';
}

export const ProgressiveForm: React.FC<ProgressiveFormProps> = ({
  children,
  onSubmit,
  className = '',
  spacing = 'normal'
}) => {
  const spacingClasses = {
    compact: 'space-y-4',
    normal: 'space-y-6',
    relaxed: 'space-y-8'
  };

  return (
    <form onSubmit={onSubmit} className={`${spacingClasses[spacing]} ${className}`} noValidate>
      {children}
    </form>
  );
};

export interface FormGridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const FormGrid: React.FC<FormGridProps> = ({
  columns = 2,
  gap = 'md',
  children,
  className = ''
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  };

  return (
    <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

export interface FormActionsProps {
  children: React.ReactNode;
  alignment?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  alignment = 'right',
  className = ''
}) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={`flex items-center space-x-3 ${alignmentClasses[alignment]} ${className}`}>
      {children}
    </div>
  );
};

// Advanced validation hook for forms
export interface UseFormValidationProps<T> {
  initialValues: T;
  validationRules: Record<keyof T, (value: any) => string | undefined>;
  onSubmit?: (values: T) => void | Promise<void>;
}

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules,
  onSubmit
}: UseFormValidationProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [errors]);

  const setTouched = useCallback(<K extends keyof T>(key: K) => {
    setTouched(prev => ({ ...prev, [key]: true }));
  }, []);

  const validateField = useCallback(<K extends keyof T>(key: K) => {
    const rule = validationRules[key];
    if (!rule) return undefined;

    const error = rule(values[key]);
    
    setErrors(prev => {
      if (error) {
        return { ...prev, [key]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      }
    });

    return error;
  }, [values, validationRules]);

  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    Object.keys(validationRules).forEach(key => {
      const fieldKey = key as keyof T;
      const rule = validationRules[fieldKey];
      const error = rule(values[fieldKey]);
      
      if (error) {
        newErrors[fieldKey] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [values, validationRules]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateAll()) {
      // Mark all fields as touched to show errors
      const allTouched = Object.keys(initialValues).reduce((acc, key) => {
        acc[key as keyof T] = true;
        return acc;
      }, {} as Record<keyof T, boolean>);
      setTouched(allTouched);
      return;
    }

    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAll, onSubmit, initialValues]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched,
    validateField,
    validateAll,
    handleSubmit,
    reset,
    // Computed properties
    hasErrors: Object.keys(errors).length > 0,
    isValid: Object.keys(errors).length === 0
  };
}