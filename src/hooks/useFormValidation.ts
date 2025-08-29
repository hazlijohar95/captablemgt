import { useState, useCallback, useEffect } from 'react';

type ValidationRule = (value: any, formData?: any) => string | null;
type ValidationRules = Record<string, ValidationRule[]>;

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules = {}
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValid, setIsValid] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (field: string, value: any): string | null => {
      const rules = validationRules[field];
      if (!rules) return null;

      for (const rule of rules) {
        const error = rule(value, values);
        if (error) return error;
      }
      return null;
    },
    [validationRules, values]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    Object.keys(validationRules).forEach((field) => {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        valid = false;
      }
    });

    setErrors(newErrors);
    setIsValid(valid);
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(validationRules).forEach((field) => {
      allTouched[field] = true;
    });
    setTouched(allTouched);

    return valid;
  }, [validateField, validationRules, values]);

  // Handle field change
  const handleChange = useCallback(
    (field: string, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    },
    [errors]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      
      const error = validateField(field, values[field]);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [validateField, values]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsValid(false);
  }, [initialValues]);

  // Set field error manually
  const setFieldError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Check validity when values or errors change
  useEffect(() => {
    const hasErrors = Object.values(errors).some((error) => error !== '');
    const hasAllRequiredValues = Object.keys(validationRules).every(
      (field) => {
        const rules = validationRules[field];
        // Check if field is required
        const isRequired = rules.some(
          (rule) => rule.toString().includes('required') || rule.toString().includes('Required')
        );
        return !isRequired || (values[field] !== '' && values[field] !== undefined && values[field] !== null);
      }
    );
    
    setIsValid(!hasErrors && hasAllRequiredValues);
  }, [values, errors, validationRules]);

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validateForm,
    validateField,
    resetForm,
    setFieldError,
    setValues,
  };
}