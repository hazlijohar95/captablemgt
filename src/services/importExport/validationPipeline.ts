import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Validation schemas for different target schemas
const ShareholderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  share_count: z.number().positive('Share count must be positive'),
  share_class: z.string().min(1, 'Share class is required'),
  certificate_number: z.string().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
  vesting_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
  vesting_cliff: z.number().min(0).optional(),
  vesting_period: z.number().min(1).optional()
});

const TransactionSchema = z.object({
  transaction_type: z.enum(['issue', 'transfer', 'option_grant', 'option_exercise', 'repurchase']),
  shareholder_name: z.string().min(1, 'Shareholder name is required'),
  share_count: z.number().positive('Share count must be positive'),
  price_per_share: z.number().min(0).optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().optional()
});

const ShareClassSchema = z.object({
  class_name: z.string().min(1, 'Class name is required'),
  authorized_shares: z.number().positive('Authorized shares must be positive'),
  par_value: z.number().min(0).optional(),
  liquidation_preference: z.number().min(1).optional(),
  dividend_rate: z.number().min(0).max(1).optional()
});

const VestingScheduleSchema = z.object({
  shareholder_name: z.string().min(1, 'Shareholder name is required'),
  total_shares: z.number().positive('Total shares must be positive'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  cliff_months: z.number().min(0).optional(),
  vesting_months: z.number().min(1, 'Vesting period must be at least 1 month')
});

const ValidationSchemas = {
  shareholders: ShareholderSchema,
  transactions: TransactionSchema,
  share_classes: ShareClassSchema,
  vesting_schedules: VestingScheduleSchema
};

export interface IValidationResult {
  isValid: boolean;
  data: any;
  errors: IValidationError[];
  warnings: IValidationWarning[];
}

export interface IValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  code: string;
}

export interface IValidationWarning {
  row: number;
  field: string;
  value: any;
  message: string;
  code: string;
}

export interface ITransformationRule {
  field: string;
  transformer: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'date' | 'boolean' | 'phone' | 'currency';
  options?: Record<string, any>;
}

export interface IPipelineConfig {
  targetSchema: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
  transformationRules: ITransformationRule[];
  customValidations: ICustomValidation[];
  businessRules: IBusinessRule[];
}

export interface ICustomValidation {
  field: string;
  validator: (value: any, row: Record<string, any>) => { valid: boolean; message?: string };
}

export interface IBusinessRule {
  name: string;
  description: string;
  validator: (data: Record<string, any>[], context: any) => IValidationWarning[];
}

export class ValidationPipeline {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  /**
   * Run complete validation pipeline
   */
  async validateData(
    data: Record<string, any>[],
    config: IPipelineConfig,
    companyId: string
  ): Promise<IValidationResult> {
    const errors: IValidationError[] = [];
    const warnings: IValidationWarning[] = [];
    const transformedData: any[] = [];

    // Get existing data context for business rules
    const context = await this.loadValidationContext(companyId, config.targetSchema);

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      try {
        // Apply transformations
        const transformedRow = this.applyTransformations(row, config.transformationRules);
        
        // Schema validation
        const schemaResult = this.validateSchema(
          transformedRow,
          config.targetSchema,
          rowIndex + 1
        );
        
        errors.push(...schemaResult.errors);
        warnings.push(...schemaResult.warnings);
        
        // Custom validations
        const customResult = this.applyCustomValidations(
          transformedRow,
          config.customValidations,
          rowIndex + 1
        );
        
        errors.push(...customResult.errors);
        warnings.push(...customResult.warnings);
        
        transformedData.push(transformedRow);
        
      } catch (error) {
        errors.push({
          row: rowIndex + 1,
          field: '',
          value: null,
          message: `Row processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'PROCESSING_ERROR'
        });
      }
    }

    // Business rules validation
    const businessWarnings = this.applyBusinessRules(
      transformedData,
      config.businessRules,
      context
    );
    warnings.push(...businessWarnings);

    return {
      isValid: errors.length === 0,
      data: transformedData,
      errors,
      warnings
    };
  }

  /**
   * Apply transformation rules to a single row
   */
  private applyTransformations(
    row: Record<string, any>,
    rules: ITransformationRule[]
  ): Record<string, any> {
    const transformed = { ...row };

    for (const rule of rules) {
      if (transformed[rule.field] != null) {
        transformed[rule.field] = this.applyTransformation(
          transformed[rule.field],
          rule.transformer,
          rule.options || {}
        );
      }
    }

    return transformed;
  }

  /**
   * Apply single transformation
   */
  private applyTransformation(
    value: any,
    transformer: string,
    options: Record<string, any>
  ): any {
    try {
      const stringValue = String(value || '').trim();

      switch (transformer) {
        case 'uppercase':
          return stringValue.toUpperCase();
        
        case 'lowercase':
          return stringValue.toLowerCase();
        
        case 'trim':
          return stringValue;
        
        case 'number':
          // Remove non-numeric characters except decimal point and minus
          const cleaned = stringValue.replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        
        case 'date':
          // Try to parse various date formats
          if (!stringValue) return null;
          
          // Handle common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
          const dateFormats = [
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
            /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/ // YYYY/MM/DD
          ];
          
          for (const format of dateFormats) {
            const match = stringValue.match(format);
            if (match) {
              let year, month, day;
              
              if (format === dateFormats[2] || format === dateFormats[3]) {
                // YYYY-MM-DD or YYYY/MM/DD
                [, year, month, day] = match;
              } else {
                // MM/DD/YYYY or MM-DD-YYYY
                [, month, day, year] = match;
              }
              
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
              }
            }
          }
          
          // Fall back to Date constructor
          const date = new Date(stringValue);
          return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
        
        case 'boolean':
          return ['true', '1', 'yes', 'on', 'checked'].includes(stringValue.toLowerCase());
        
        case 'phone':
          // Extract digits and format as phone number
          const digits = stringValue.replace(/\D/g, '');
          if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
          } else if (digits.length === 11 && digits[0] === '1') {
            return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
          }
          return stringValue;
        
        case 'currency':
          // Remove currency symbols and convert to number
          const currencyValue = stringValue.replace(/[$,\s]/g, '');
          const currencyNum = parseFloat(currencyValue);
          return isNaN(currencyNum) ? 0 : currencyNum;
        
        default:
          return value;
      }
    } catch (error) {
      console.error(`Transformation error for ${transformer}:`, error);
      return value;
    }
  }

  /**
   * Validate row against schema
   */
  private validateSchema(
    row: Record<string, any>,
    targetSchema: string,
    rowNumber: number
  ): { errors: IValidationError[]; warnings: IValidationWarning[] } {
    const errors: IValidationError[] = [];
    const warnings: IValidationWarning[] = [];

    const schema = ValidationSchemas[targetSchema as keyof typeof ValidationSchemas];
    if (!schema) {
      errors.push({
        row: rowNumber,
        field: '',
        value: null,
        message: `Unknown target schema: ${targetSchema}`,
        code: 'INVALID_SCHEMA'
      });
      return { errors, warnings };
    }

    try {
      schema.parse(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          errors.push({
            row: rowNumber,
            field: issue.path.join('.'),
            value: issue.path.reduce((obj, key) => obj?.[key], row),
            message: issue.message,
            code: issue.code
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Apply custom validation rules
   */
  private applyCustomValidations(
    row: Record<string, any>,
    validations: ICustomValidation[],
    rowNumber: number
  ): { errors: IValidationError[]; warnings: IValidationWarning[] } {
    const errors: IValidationError[] = [];
    const warnings: IValidationWarning[] = [];

    for (const validation of validations) {
      try {
        const result = validation.validator(row[validation.field], row);
        if (!result.valid) {
          errors.push({
            row: rowNumber,
            field: validation.field,
            value: row[validation.field],
            message: result.message || 'Custom validation failed',
            code: 'CUSTOM_VALIDATION'
          });
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: validation.field,
          value: row[validation.field],
          message: `Custom validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'CUSTOM_VALIDATION_ERROR'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Apply business rules
   */
  private applyBusinessRules(
    data: Record<string, any>[],
    rules: IBusinessRule[],
    context: any
  ): IValidationWarning[] {
    const warnings: IValidationWarning[] = [];

    for (const rule of rules) {
      try {
        const ruleWarnings = rule.validator(data, context);
        warnings.push(...ruleWarnings);
      } catch (error) {
        console.error(`Business rule error (${rule.name}):`, error);
      }
    }

    return warnings;
  }

  /**
   * Load validation context from existing data
   */
  private async loadValidationContext(
    companyId: string,
    targetSchema: string
  ): Promise<any> {
    const context: any = { companyId };

    try {
      // Load relevant existing data based on target schema
      switch (targetSchema) {
        case 'shareholders':
          const { data: existingShareholders } = await this.supabase
            .from('shareholders')
            .select('name, email, share_count')
            .eq('company_id', companyId);
          
          context.existingShareholders = existingShareholders || [];
          
          // Load share classes for validation
          const { data: shareClasses } = await this.supabase
            .from('share_classes')
            .select('class_name')
            .eq('company_id', companyId);
          
          context.validShareClasses = shareClasses?.map(sc => sc.class_name) || [];
          break;

        case 'transactions':
          const { data: existingTransactions } = await this.supabase
            .from('transactions')
            .select('*')
            .eq('company_id', companyId)
            .order('transaction_date', { ascending: false })
            .limit(1000);
          
          context.recentTransactions = existingTransactions || [];
          break;

        case 'share_classes':
          const { data: existingClasses } = await this.supabase
            .from('share_classes')
            .select('class_name')
            .eq('company_id', companyId);
          
          context.existingClasses = existingClasses?.map(sc => sc.class_name) || [];
          break;
      }
    } catch (error) {
      console.error('Error loading validation context:', error);
    }

    return context;
  }

  /**
   * Get default pipeline configuration for schema
   */
  static getDefaultConfig(targetSchema: string): IPipelineConfig {
    const baseConfig: IPipelineConfig = {
      targetSchema: targetSchema as any,
      transformationRules: [],
      customValidations: [],
      businessRules: []
    };

    switch (targetSchema) {
      case 'shareholders':
        baseConfig.transformationRules = [
          { field: 'name', transformer: 'trim' },
          { field: 'email', transformer: 'lowercase' },
          { field: 'share_count', transformer: 'number' },
          { field: 'share_class', transformer: 'uppercase' },
          { field: 'issue_date', transformer: 'date' },
          { field: 'vesting_start', transformer: 'date' }
        ];

        baseConfig.businessRules = [
          {
            name: 'duplicate_shareholders',
            description: 'Check for duplicate shareholder names',
            validator: (data, context) => {
              const warnings: IValidationWarning[] = [];
              const names = new Map<string, number[]>();
              
              // Check within import data
              data.forEach((row, index) => {
                if (row.name) {
                  const name = row.name.toLowerCase();
                  if (!names.has(name)) names.set(name, []);
                  names.get(name)!.push(index + 1);
                }
              });
              
              names.forEach((rows, name) => {
                if (rows.length > 1) {
                  rows.forEach(row => {
                    warnings.push({
                      row,
                      field: 'name',
                      value: name,
                      message: `Duplicate shareholder name found in rows: ${rows.join(', ')}`,
                      code: 'DUPLICATE_NAME'
                    });
                  });
                }
              });
              
              // Check against existing data
              if (context.existingShareholders) {
                const existingNames = new Set(
                  context.existingShareholders.map((s: any) => s.name.toLowerCase())
                );
                
                data.forEach((row, index) => {
                  if (row.name && existingNames.has(row.name.toLowerCase())) {
                    warnings.push({
                      row: index + 1,
                      field: 'name',
                      value: row.name,
                      message: 'Shareholder with this name already exists',
                      code: 'EXISTING_SHAREHOLDER'
                    });
                  }
                });
              }
              
              return warnings;
            }
          }
        ];
        break;

      case 'transactions':
        baseConfig.transformationRules = [
          { field: 'transaction_type', transformer: 'lowercase' },
          { field: 'shareholder_name', transformer: 'trim' },
          { field: 'share_count', transformer: 'number' },
          { field: 'price_per_share', transformer: 'currency' },
          { field: 'transaction_date', transformer: 'date' }
        ];
        break;

      case 'share_classes':
        baseConfig.transformationRules = [
          { field: 'class_name', transformer: 'uppercase' },
          { field: 'authorized_shares', transformer: 'number' },
          { field: 'par_value', transformer: 'currency' }
        ];
        break;

      case 'vesting_schedules':
        baseConfig.transformationRules = [
          { field: 'shareholder_name', transformer: 'trim' },
          { field: 'total_shares', transformer: 'number' },
          { field: 'start_date', transformer: 'date' },
          { field: 'cliff_months', transformer: 'number' },
          { field: 'vesting_months', transformer: 'number' }
        ];
        break;
    }

    return baseConfig;
  }
}

export const validationPipeline = new ValidationPipeline();