import { z } from 'zod';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

// Types for parsing engine
export interface IParseResult {
  success: boolean;
  data: Record<string, any>[];
  headers: string[];
  rowCount: number;
  errors: IParseError[];
  fieldMappings: IFieldMapping[];
  confidence: number;
}

export interface IParseError {
  row: number;
  column: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface IFieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transformation?: string;
  validation?: string;
}

export interface IParseOptions {
  fileType: 'csv' | 'excel';
  worksheet?: string;
  hasHeaders: boolean;
  delimiter?: string;
  encoding?: string;
  skipRows?: number;
  targetSchema?: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
}

// Standard field mappings for cap table data
const STANDARD_FIELD_MAPPINGS = {
  shareholders: {
    patterns: {
      'name': ['name', 'full_name', 'shareholder_name', 'holder', 'investor'],
      'email': ['email', 'email_address', 'contact_email'],
      'share_count': ['shares', 'share_count', 'number_of_shares', 'qty'],
      'share_class': ['class', 'share_class', 'security_type', 'type'],
      'certificate_number': ['cert', 'certificate', 'cert_no', 'certificate_number'],
      'issue_date': ['date', 'issue_date', 'grant_date', 'issued'],
      'vesting_start': ['vesting_start', 'vest_start', 'commence_date'],
      'vesting_cliff': ['cliff', 'vesting_cliff', 'cliff_months'],
      'vesting_period': ['period', 'vesting_period', 'vest_months']
    },
    required: ['name', 'share_count', 'share_class']
  },
  transactions: {
    patterns: {
      'transaction_type': ['type', 'transaction_type', 'action'],
      'shareholder_name': ['name', 'shareholder', 'holder'],
      'share_count': ['shares', 'quantity', 'amount'],
      'price_per_share': ['price', 'price_per_share', 'strike_price'],
      'transaction_date': ['date', 'transaction_date', 'effective_date'],
      'notes': ['notes', 'description', 'memo']
    },
    required: ['transaction_type', 'shareholder_name', 'share_count']
  },
  share_classes: {
    patterns: {
      'class_name': ['name', 'class_name', 'class', 'series'],
      'authorized_shares': ['authorized', 'authorized_shares', 'max_shares'],
      'par_value': ['par', 'par_value', 'nominal_value'],
      'liquidation_preference': ['pref', 'liquidation_preference', 'preference'],
      'dividend_rate': ['dividend', 'dividend_rate', 'rate']
    },
    required: ['class_name', 'authorized_shares']
  }
};

export class IntelligentParseEngine {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  /**
   * Parse file with intelligent field mapping
   */
  async parseFile(
    file: File | Buffer,
    options: IParseOptions
  ): Promise<IParseResult> {
    try {
      let rawData: any[][];
      let headers: string[] = [];

      // Parse based on file type
      if (options.fileType === 'csv') {
        const result = await this.parseCSV(file as File, options);
        rawData = result.data;
        headers = result.headers;
      } else {
        const result = await this.parseExcel(file as File, options);
        rawData = result.data;
        headers = result.headers;
      }

      // Skip rows if specified
      if (options.skipRows) {
        rawData = rawData.slice(options.skipRows);
      }

      // Extract headers if present
      if (options.hasHeaders && rawData.length > 0) {
        headers = rawData[0].map((cell: any) => String(cell || '').trim());
        rawData = rawData.slice(1);
      }

      // Convert to objects
      const data = rawData.map((row, index) => {
        const obj: Record<string, any> = {};
        headers.forEach((header, colIndex) => {
          obj[header] = row[colIndex];
        });
        obj._rowIndex = index + 1;
        return obj;
      });

      // Intelligent field mapping
      const fieldMappings = await this.generateFieldMappings(
        headers,
        options.targetSchema
      );

      // Apply mappings and validate
      const { transformedData, errors } = await this.validateAndTransform(
        data,
        fieldMappings,
        options.targetSchema
      );

      // Calculate confidence score
      const confidence = this.calculateConfidence(fieldMappings, errors);

      return {
        success: errors.filter(e => e.severity === 'error').length === 0,
        data: transformedData,
        headers,
        rowCount: data.length,
        errors,
        fieldMappings,
        confidence
      };

    } catch (error) {
      return {
        success: false,
        data: [],
        headers: [],
        rowCount: 0,
        errors: [{
          row: 0,
          column: '',
          value: null,
          message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        fieldMappings: [],
        confidence: 0
      };
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(
    file: File,
    options: IParseOptions
  ): Promise<{ data: any[][], headers: string[] }> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          resolve({
            data: results.data as any[][],
            headers: []
          });
        },
        error: (error) => reject(error),
        delimiter: options.delimiter || ',',
        skipEmptyLines: true,
        transform: (value) => {
          // Clean and normalize values
          const cleaned = String(value || '').trim();
          // Try to parse numbers
          if (/^\d+\.?\d*$/.test(cleaned)) {
            return parseFloat(cleaned);
          }
          // Try to parse dates
          if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(cleaned)) {
            const date = new Date(cleaned);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          return cleaned;
        }
      });
    });
  }

  /**
   * Parse Excel file using ExcelJS (secure alternative to xlsx)
   */
  private async parseExcel(
    file: File,
    options: IParseOptions
  ): Promise<{ data: any[][], headers: string[] }> {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheetName = options.worksheet || workbook.worksheets[0]?.name;
    const worksheet = workbook.getWorksheet(worksheetName || 1);
    
    if (!worksheet) {
      throw new Error(`Worksheet "${worksheetName}" not found`);
    }

    // Convert to array of arrays
    const data: any[][] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      const rowData: any[] = [];
      row.eachCell((cell, colNumber) => {
        let value = cell.value;
        
        // Handle date cells
        if (cell.type === ExcelJS.ValueType.Date) {
          value = (cell.value as Date).toISOString().split('T')[0];
        }
        // Handle formula cells
        else if (cell.type === ExcelJS.ValueType.Formula && cell.result) {
          value = cell.result;
        }
        // Handle other cell types
        else if (value && typeof value === 'object' && 'richText' in value) {
          value = (value as any).richText.map((r: any) => r.text).join('');
        }
        
        rowData[colNumber - 1] = value;
      });
      data.push(rowData);
    });

    return { data, headers: [] };
  }

  /**
   * Generate intelligent field mappings
   */
  private async generateFieldMappings(
    sourceHeaders: string[],
    targetSchema?: string
  ): Promise<IFieldMapping[]> {
    const mappings: IFieldMapping[] = [];
    
    if (!targetSchema || !STANDARD_FIELD_MAPPINGS[targetSchema as keyof typeof STANDARD_FIELD_MAPPINGS]) {
      // Return identity mappings
      return sourceHeaders.map(header => ({
        sourceField: header,
        targetField: header,
        confidence: 0.5
      }));
    }

    const schemaConfig = STANDARD_FIELD_MAPPINGS[targetSchema as keyof typeof STANDARD_FIELD_MAPPINGS];
    
    for (const sourceHeader of sourceHeaders) {
      const normalizedSource = sourceHeader.toLowerCase().replace(/[_\s-]/g, '');
      let bestMatch: IFieldMapping | null = null;
      let bestScore = 0;

      for (const [targetField, patterns] of Object.entries(schemaConfig.patterns)) {
        for (const pattern of patterns) {
          const normalizedPattern = pattern.toLowerCase().replace(/[_\s-]/g, '');
          const score = this.calculateSimilarity(normalizedSource, normalizedPattern);
          
          if (score > bestScore && score > 0.6) {
            bestScore = score;
            bestMatch = {
              sourceField: sourceHeader,
              targetField,
              confidence: score
            };
          }
        }
      }

      if (bestMatch) {
        mappings.push(bestMatch);
      } else {
        // Keep unmapped fields with low confidence
        mappings.push({
          sourceField: sourceHeader,
          targetField: sourceHeader,
          confidence: 0.3
        });
      }
    }

    return mappings;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
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
  }

  /**
   * Validate and transform data based on mappings
   */
  private async validateAndTransform(
    data: Record<string, any>[],
    mappings: IFieldMapping[],
    targetSchema?: string
  ): Promise<{ transformedData: Record<string, any>[], errors: IParseError[] }> {
    const transformedData: Record<string, any>[] = [];
    const errors: IParseError[] = [];

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      const transformedRow: Record<string, any> = {};

      for (const mapping of mappings) {
        const sourceValue = row[mapping.sourceField];
        
        try {
          // Apply transformations
          let transformedValue = sourceValue;
          
          if (mapping.transformation) {
            transformedValue = this.applyTransformation(
              sourceValue,
              mapping.transformation
            );
          }

          // Apply validation
          if (mapping.validation) {
            const validationResult = this.validateField(
              transformedValue,
              mapping.validation,
              mapping.targetField
            );
            
            if (!validationResult.valid) {
              errors.push({
                row: rowIndex + 1,
                column: mapping.sourceField,
                value: sourceValue,
                message: validationResult.error!,
                severity: 'error'
              });
              continue;
            }
          }

          transformedRow[mapping.targetField] = transformedValue;

        } catch (error) {
          errors.push({
            row: rowIndex + 1,
            column: mapping.sourceField,
            value: sourceValue,
            message: `Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error'
          });
        }
      }

      // Validate required fields
      if (targetSchema) {
        const schemaConfig = STANDARD_FIELD_MAPPINGS[targetSchema as keyof typeof STANDARD_FIELD_MAPPINGS];
        for (const requiredField of schemaConfig.required) {
          if (!transformedRow[requiredField] || transformedRow[requiredField] === '') {
            errors.push({
              row: rowIndex + 1,
              column: requiredField,
              value: null,
              message: `Required field "${requiredField}" is missing or empty`,
              severity: 'error'
            });
          }
        }
      }

      transformedData.push(transformedRow);
    }

    return { transformedData, errors };
  }

  /**
   * Apply field transformations
   */
  private applyTransformation(value: any, transformation: string): any {
    switch (transformation) {
      case 'uppercase':
        return String(value || '').toUpperCase();
      case 'lowercase':
        return String(value || '').toLowerCase();
      case 'trim':
        return String(value || '').trim();
      case 'number':
        const num = parseFloat(String(value || '0').replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : num;
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
      case 'boolean':
        const str = String(value || '').toLowerCase();
        return ['true', '1', 'yes', 'on'].includes(str);
      default:
        return value;
    }
  }

  /**
   * Validate field values
   */
  private validateField(
    value: any,
    validation: string,
    fieldName: string
  ): { valid: boolean; error?: string } {
    try {
      switch (validation) {
        case 'email':
          const emailSchema = z.string().email();
          emailSchema.parse(value);
          break;
        case 'number':
          const numberSchema = z.number().min(0);
          numberSchema.parse(Number(value));
          break;
        case 'date':
          const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
          dateSchema.parse(value);
          break;
        case 'required':
          if (!value || String(value).trim() === '') {
            return { valid: false, error: `${fieldName} is required` };
          }
          break;
        default:
          break;
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid ${fieldName}: ${error instanceof Error ? error.message : 'Validation failed'}`
      };
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    mappings: IFieldMapping[],
    errors: IParseError[]
  ): number {
    if (mappings.length === 0) return 0;
    
    const mappingScore = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
    const errorPenalty = Math.min(errors.filter(e => e.severity === 'error').length * 0.1, 0.5);
    
    return Math.max(0, mappingScore - errorPenalty);
  }

  /**
   * Save parsing template for reuse
   */
  async saveParsingTemplate(
    companyId: string,
    name: string,
    mappings: IFieldMapping[],
    options: IParseOptions
  ): Promise<void> {
    await this.supabase
      .from('import_templates')
      .insert({
        company_id: companyId,
        name,
        template_type: 'import',
        target_schema: options.targetSchema,
        field_mappings: mappings,
        parse_options: options,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Load existing parsing template
   */
  async loadParsingTemplate(templateId: string): Promise<{
    mappings: IFieldMapping[];
    options: IParseOptions;
  } | null> {
    const { data, error } = await this.supabase
      .from('import_templates')
      .select('field_mappings, parse_options')
      .eq('id', templateId)
      .single();

    if (error || !data) return null;

    return {
      mappings: data.field_mappings,
      options: data.parse_options
    };
  }
}

export const parseEngine = new IntelligentParseEngine();