import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import {
  IImportRow,
  IStakeholderImportRow,
  IImportValidationError,
  IImportValidationResult,
  IImportMapping,
  IImportPreview,
  IImportResult,
  IImportOptions,
  IImportProgress,
  ImportFileType,
  IMPORT_TEMPLATES
} from '../types/import.types';
import { capTableService } from '@/services/capTableService';
import { TransactionBuilder } from '@/services/transactionService';
import { AuthorizationService } from '@/services/authorizationService';
import { ulid } from 'ulid';

export class ImportService {
  private static progressCallback?: (progress: IImportProgress) => void;

  /**
   * Set progress callback for real-time updates
   */
  static setProgressCallback(callback: (progress: IImportProgress) => void) {
    this.progressCallback = callback;
  }

  private static emitProgress(progress: IImportProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Parse file and return preview data for mapping configuration
   */
  static async parseFileForPreview(
    file: File,
    options: IImportOptions = {}
  ): Promise<IImportPreview> {
    this.emitProgress({
      step: 'parsing',
      progress: 0,
      message: 'Reading file...'
    });

    const fileType = this.detectFileType(file);
    let data: IImportRow[] = [];

    try {
      switch (fileType) {
        case 'csv':
          data = await this.parseCSV(file, options);
          break;
        case 'xlsx':
          data = await this.parseExcel(file, options);
          break;
        case 'json':
          data = await this.parseJSON(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }

      this.emitProgress({
        step: 'parsing',
        progress: 50,
        message: 'Analyzing data structure...'
      });

      const preview = this.createPreview(data, options);
      
      this.emitProgress({
        step: 'parsing',
        progress: 100,
        message: 'File parsed successfully'
      });

      return preview;
    } catch (error) {
      this.emitProgress({
        step: 'error',
        progress: 0,
        message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  /**
   * Validate imported data against mappings
   */
  static validateData(
    data: IImportRow[],
    mappings: IImportMapping[],
    options: IImportOptions = {}
  ): IImportValidationResult {
    this.emitProgress({
      step: 'validating',
      progress: 0,
      message: 'Starting validation...'
    });

    const errors: IImportValidationError[] = [];
    const warnings: IImportValidationError[] = [];
    const processedRows: IStakeholderImportRow[] = [];

    const requiredFields = mappings
      .filter(m => m.required)
      .map(m => m.targetField);

    const emailsSeen = new Set<string>();
    const uniqueValidation = options.validateUnique ?? true;

    data.forEach((row, index) => {
      const rowNumber = index + (options.skipFirstRow ? 2 : 1);
      const processedRow: IStakeholderImportRow = {};

      this.emitProgress({
        step: 'validating',
        progress: Math.round((index / data.length) * 100),
        message: `Validating row ${rowNumber}...`,
        currentRow: rowNumber,
        totalRows: data.length
      });

      // Apply mappings and transformations
      mappings.forEach(mapping => {
        const sourceValue = row[mapping.sourceColumn];
        
        try {
          let transformedValue = sourceValue;
          if (mapping.transform && sourceValue != null && sourceValue !== '') {
            transformedValue = mapping.transform(sourceValue);
          }
          
          (processedRow as any)[mapping.targetField] = transformedValue;
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: mapping.targetField,
            message: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            value: sourceValue
          });
        }
      });

      // Validate required fields
      requiredFields.forEach(field => {
        const value = processedRow[field];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push({
            row: rowNumber,
            field: field,
            message: `Required field is missing or empty`,
            severity: 'error',
            value: value
          });
        }
      });

      // Validate email format
      if (processedRow.email) {
        const email = String(processedRow.email).trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Invalid email format',
            severity: 'error',
            value: email
          });
        } else if (uniqueValidation && emailsSeen.has(email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Duplicate email address',
            severity: 'error',
            value: email
          });
        } else {
          emailsSeen.add(email);
        }
      }

      // Validate stakeholder type
      if (processedRow.type) {
        const validTypes = ['FOUNDER', 'INVESTOR', 'EMPLOYEE', 'ENTITY'];
        if (!validTypes.includes(String(processedRow.type))) {
          errors.push({
            row: rowNumber,
            field: 'type',
            message: `Invalid stakeholder type. Must be one of: ${validTypes.join(', ')}`,
            severity: 'error',
            value: processedRow.type
          });
        }
      }

      // Validate security type if present
      if (processedRow.security_type) {
        const validSecurityTypes = ['EQUITY', 'OPTION', 'RSU', 'WARRANT', 'SAFE', 'NOTE'];
        if (!validSecurityTypes.includes(String(processedRow.security_type))) {
          warnings.push({
            row: rowNumber,
            field: 'security_type',
            message: `Unknown security type. Will be imported as-is.`,
            severity: 'warning',
            value: processedRow.security_type
          });
        }
      }

      // Validate numeric fields
      ['quantity', 'strike_price', 'vesting_months', 'cliff_months'].forEach(field => {
        const value = processedRow[field as keyof IStakeholderImportRow];
        if (value != null && value !== '' && (isNaN(Number(value)) || Number(value) < 0)) {
          errors.push({
            row: rowNumber,
            field: field,
            message: `Must be a positive number`,
            severity: 'error',
            value: value
          });
        }
      });

      // Validate dates
      ['grant_date', 'vesting_start'].forEach(field => {
        const value = processedRow[field as keyof IStakeholderImportRow];
        if (value && !this.isValidDate(String(value))) {
          warnings.push({
            row: rowNumber,
            field: field,
            message: 'Date format may not be recognized. Please verify.',
            severity: 'warning',
            value: value
          });
        }
      });

      // Business rule validations
      if (processedRow.type === 'ENTITY' && !processedRow.entity_name) {
        errors.push({
          row: rowNumber,
          field: 'entity_name',
          message: 'Entity name is required for entity-type stakeholders',
          severity: 'error',
          value: processedRow.entity_name
        });
      }

      if (processedRow.security_type === 'OPTION' && !processedRow.strike_price) {
        warnings.push({
          row: rowNumber,
          field: 'strike_price',
          message: 'Strike price should be specified for option grants',
          severity: 'warning',
          value: processedRow.strike_price
        });
      }

      processedRows.push(processedRow);
    });

    const validRows = processedRows.filter((_, index) => 
      !errors.some(error => error.row === index + (options.skipFirstRow ? 2 : 1))
    );

    this.emitProgress({
      step: 'validating',
      progress: 100,
      message: `Validation complete. ${validRows.length}/${data.length} rows valid.`
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      processedRows,
      summary: {
        totalRows: data.length,
        validRows: validRows.length,
        errorRows: new Set(errors.map(e => e.row)).size,
        warningRows: new Set(warnings.map(w => w.row)).size
      }
    };
  }

  /**
   * Import validated data into the database
   */
  static async importData(
    validationResult: IImportValidationResult,
    companyId: string,
    csrfToken?: string
  ): Promise<IImportResult> {
    // Verify authorization
    await AuthorizationService.validateCompanyAccess(companyId);
    await AuthorizationService.verifyFinancialDataAccess(companyId, 'write');

    const transactionId = ulid();
    const transaction = new TransactionBuilder(companyId, csrfToken);
    
    this.emitProgress({
      step: 'importing',
      progress: 0,
      message: 'Starting import...'
    });

    let importedStakeholders = 0;
    let importedSecurities = 0;
    const importErrors: IImportValidationError[] = [];
    const skippedRows: number[] = [];

    // Filter out rows with validation errors
    const validRows = validationResult.processedRows.filter((_row, index) => {
      const rowNumber = index + 1;
      const hasError = validationResult.errors.some(error => error.row === rowNumber);
      if (hasError) {
        skippedRows.push(rowNumber);
      }
      return !hasError;
    });

    try {
      // Group rows by stakeholder (by email)
      const stakeholderGroups = new Map<string, IStakeholderImportRow[]>();
      validRows.forEach(row => {
        if (row.email) {
          const email = String(row.email).trim().toLowerCase();
          if (!stakeholderGroups.has(email)) {
            stakeholderGroups.set(email, []);
          }
          stakeholderGroups.get(email)!.push(row);
        }
      });

      let processedCount = 0;
      const totalOperations = stakeholderGroups.size;

      // Process each stakeholder group
      for (const [email, rows] of stakeholderGroups) {
        processedCount++;
        this.emitProgress({
          step: 'importing',
          progress: Math.round((processedCount / totalOperations) * 100),
          message: `Importing stakeholder ${processedCount}/${totalOperations}...`
        });

        const firstRow = rows[0];
        
        try {
          // Create person first if it's not an entity
          let personId: string | undefined;
          if (firstRow.type !== 'ENTITY') {
            transaction.addOperation(
              `Create person for ${firstRow.name}`,
              async () => {
                const person = await capTableService.createPerson({
                  name: String(firstRow.name || '').trim(),
                  email: email,
                  phone: firstRow.phone ? String(firstRow.phone).trim() : undefined,
                  csrfToken
                });
                personId = person.id;
                return person;
              }
            );
          }

          // Create stakeholder
          transaction.addOperation(
            `Create stakeholder for ${firstRow.name}`,
            async () => {
              const stakeholder = await capTableService.createStakeholder({
                companyId,
                personId,
                entityName: firstRow.type === 'ENTITY' ? String(firstRow.entity_name || firstRow.name) : undefined,
                type: firstRow.type as any,
                taxId: firstRow.tax_id ? String(firstRow.tax_id) : undefined,
                csrfToken
              });
              
              importedStakeholders++;
              
              // Import securities for this stakeholder
              for (const row of rows) {
                if (row.security_type && row.quantity) {
                  await capTableService.issueSecurity({
                    companyId,
                    stakeholderId: stakeholder.id,
                    type: row.security_type as any,
                    quantity: Number(row.quantity),
                    issuedAt: row.grant_date ? String(row.grant_date) : new Date().toISOString(),
                    terms: row.security_type === 'OPTION' ? {
                      strikePrice: row.strike_price ? Math.round(Number(row.strike_price) * 100) : 0,
                      vestingMonths: row.vesting_months ? Number(row.vesting_months) : 48,
                      cliffMonths: row.cliff_months ? Number(row.cliff_months) : 12,
                      grantDate: row.grant_date || new Date().toISOString()
                    } : undefined,
                    csrfToken
                  });
                  importedSecurities++;
                }
              }
              
              return stakeholder;
            }
          );
        } catch (error) {
          importErrors.push({
            row: 0, // Will be filled with actual row numbers
            field: 'general',
            message: `Failed to import stakeholder ${firstRow.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            value: firstRow.name
          });
        }
      }

      // Execute the transaction
      const result = await transaction.execute();
      
      if (result.success) {
        this.emitProgress({
          step: 'complete',
          progress: 100,
          message: `Import completed successfully. ${importedStakeholders} stakeholders, ${importedSecurities} securities.`
        });

        return {
          success: true,
          importedStakeholders,
          importedSecurities,
          errors: [...validationResult.errors, ...importErrors],
          warnings: validationResult.warnings,
          skippedRows: skippedRows.length,
          transactionId
        };
      } else {
        throw new Error(result.error?.message || 'Transaction failed');
      }
    } catch (error) {
      this.emitProgress({
        step: 'error',
        progress: 0,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return {
        success: false,
        importedStakeholders: 0,
        importedSecurities: 0,
        errors: [...validationResult.errors, {
          row: 0,
          field: 'system',
          message: error instanceof Error ? error.message : 'Import failed',
          severity: 'error'
        }],
        warnings: validationResult.warnings,
        skippedRows: validRows.length
      };
    }
  }

  /**
   * Generate downloadable template files
   */
  static generateTemplate(templateName: keyof typeof IMPORT_TEMPLATES): string {
    const template = IMPORT_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const csv = Papa.unparse({
      fields: template.headers,
      data: template.sampleData
    });

    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }

  // Private helper methods
  private static detectFileType(file: File): ImportFileType {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (extension === 'csv' || mimeType === 'text/csv') {
      return 'csv';
    }
    if (extension === 'xlsx' || extension === 'xls' || mimeType.includes('sheet')) {
      return 'xlsx';
    }
    if (extension === 'json' || mimeType === 'application/json') {
      return 'json';
    }
    
    throw new Error(`Unsupported file type: ${extension || mimeType}`);
  }

  private static async parseCSV(file: File, options: IImportOptions): Promise<IImportRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: options.skipEmptyRows ?? true,
        delimiter: options.delimiter || 'auto',
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${result.errors[0].message}`));
          } else {
            resolve(result.data as IImportRow[]);
          }
        },
        error: reject
      });
    });
  }

  private static async parseExcel(file: File, _options: IImportOptions): Promise<IImportRow[]> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheets found in Excel file');
      }

      const jsonData: IImportRow[] = [];
      const headers: string[] = [];
      
      // Get headers from first row
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || '').trim();
      });
      
      // Process data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData: IImportRow = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            let value = cell.value;
            
            // Handle different cell types
            if (cell.type === ExcelJS.ValueType.Date) {
              value = (cell.value as Date).toISOString().split('T')[0];
            } else if (cell.type === ExcelJS.ValueType.Formula && cell.result) {
              value = cell.result;
            } else if (value && typeof value === 'object' && 'richText' in value) {
              value = (value as any).richText.map((r: any) => r.text).join('');
            }
            
            rowData[header] = value || '';
          }
        });
        
        // Only add rows that have at least one non-empty value
        if (Object.values(rowData).some(val => val !== '')) {
          jsonData.push(rowData);
        }
      });
      
      return jsonData;
    } catch (error) {
      throw new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async parseJSON(file: File): Promise<IImportRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          if (Array.isArray(jsonData)) {
            resolve(jsonData);
          } else {
            reject(new Error('JSON file must contain an array of objects'));
          }
        } catch (error) {
          reject(new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Invalid JSON'}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read JSON file'));
      reader.readAsText(file);
    });
  }

  private static createPreview(data: IImportRow[], _options: IImportOptions): IImportPreview {
    if (data.length === 0) {
      throw new Error('No data found in file');
    }

    const headers = Object.keys(data[0]);
    const sampleRows = data.slice(0, 5); // Show first 5 rows for preview
    
    // Auto-detect mappings based on common column names
    const detectedMappings = this.detectMappings(headers);

    return {
      headers,
      sampleRows,
      detectedMappings,
      rowCount: data.length
    };
  }

  private static detectMappings(headers: string[]): IImportMapping[] {
    const mappings: IImportMapping[] = [];
    
    const fieldMappings = {
      name: ['name', 'full_name', 'stakeholder_name', 'holder_name', 'person_name'],
      email: ['email', 'email_address', 'e_mail', 'mail'],
      phone: ['phone', 'phone_number', 'mobile', 'tel', 'telephone'],
      type: ['type', 'stakeholder_type', 'holder_type', 'category'],
      entity_name: ['entity_name', 'company_name', 'organization', 'entity'],
      tax_id: ['tax_id', 'ssn', 'ein', 'tax_number', 'id_number'],
      security_type: ['security_type', 'instrument_type', 'asset_type'],
      share_class: ['share_class', 'class', 'series', 'security_class'],
      quantity: ['quantity', 'shares', 'amount', 'units', 'count'],
      strike_price: ['strike_price', 'exercise_price', 'price', 'cost'],
      grant_date: ['grant_date', 'issue_date', 'date', 'created_date'],
      vesting_start: ['vesting_start', 'vesting_date', 'start_date'],
      vesting_months: ['vesting_months', 'vesting_period', 'duration'],
      cliff_months: ['cliff_months', 'cliff_period', 'cliff']
    };

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [targetField, patterns] of Object.entries(fieldMappings)) {
        if (patterns.some(pattern => normalizedHeader.includes(pattern))) {
          mappings.push({
            sourceColumn: header,
            targetField: targetField as keyof IStakeholderImportRow,
            required: ['name', 'email', 'type'].includes(targetField)
          });
          break;
        }
      }
    });

    return mappings;
  }

  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.trim() !== '';
  }
}

// Export singleton instance
export const importService = ImportService;