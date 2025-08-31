import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

export interface IExportTemplate {
  id: string;
  name: string;
  description: string;
  targetSchema: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
  fields: ITemplateField[];
  formatting: ITemplateFormatting;
  filters: ITemplateFilter[];
  grouping?: ITemplateGrouping;
  calculations?: ITemplateCalculation[];
}

export interface ITemplateField {
  sourceField: string;
  displayName: string;
  dataType: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  format?: string;
  width?: number;
  required: boolean;
  defaultValue?: any;
  transformation?: string;
}

export interface ITemplateFormatting {
  fileFormat: 'csv' | 'xlsx';
  includeHeaders: boolean;
  dateFormat: string;
  numberFormat: string;
  currencySymbol: string;
  styling?: IExcelStyling;
}

export interface IExcelStyling {
  headerStyle: {
    backgroundColor: string;
    fontColor: string;
    fontSize: number;
    bold: boolean;
  };
  dataStyle: {
    alternateRows: boolean;
    borderStyle: 'thin' | 'medium' | 'thick' | 'none';
  };
}

export interface ITemplateFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_null';
  value: any;
  values?: any[];
}

export interface ITemplateGrouping {
  field: string;
  sortOrder: 'asc' | 'desc';
  showSubtotals: boolean;
  subtotalFields: string[];
}

export interface ITemplateCalculation {
  name: string;
  formula: string;
  fields: string[];
  displayName: string;
}

export interface IExportOptions {
  templateId?: string;
  customFields?: ITemplateField[];
  filters?: ITemplateFilter[];
  dateRange?: {
    startDate: string;
    endDate: string;
    field: string;
  };
  limit?: number;
  includeMetadata: boolean;
}

export class TemplateGenerator {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  /**
   * Generate export data using template
   */
  async generateExport(
    companyId: string,
    targetSchema: string,
    options: IExportOptions = { includeMetadata: true }
  ): Promise<{ data: Blob; filename: string; contentType: string }> {
    // Load template if specified
    let template: IExportTemplate;
    if (options.templateId) {
      template = await this.loadTemplate(options.templateId);
    } else {
      template = this.getDefaultTemplate(targetSchema as any);
    }

    // Override fields if custom fields provided
    if (options.customFields) {
      template.fields = options.customFields;
    }

    // Load and filter data
    const rawData = await this.loadData(companyId, targetSchema, options);

    // Apply template filters
    const filteredData = this.applyFilters(rawData, template.filters.concat(options.filters || []));

    // Apply transformations and formatting
    const formattedData = this.formatData(filteredData, template);

    // Apply grouping if specified
    const processedData = template.grouping 
      ? this.applyGrouping(formattedData, template.grouping)
      : formattedData;

    // Add calculations
    const dataWithCalculations = template.calculations
      ? this.addCalculations(processedData, template.calculations)
      : processedData;

    // Generate file
    const result = await this.generateFile(
      dataWithCalculations,
      template,
      { 
        companyId, 
        targetSchema, 
        exportedAt: new Date().toISOString(),
        recordCount: dataWithCalculations.length
      }
    );

    return result;
  }

  /**
   * Load data from database
   */
  private async loadData(
    companyId: string,
    targetSchema: string,
    options: IExportOptions
  ): Promise<Record<string, any>[]> {
    let query = this.supabase.from(targetSchema).select('*').eq('company_id', companyId);

    // Apply date range filter
    if (options.dateRange) {
      query = query
        .gte(options.dateRange.field, options.dateRange.startDate)
        .lte(options.dateRange.field, options.dateRange.endDate);
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load data: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Apply filters to data
   */
  private applyFilters(
    data: Record<string, any>[],
    filters: ITemplateFilter[]
  ): Record<string, any>[] {
    return data.filter(row => {
      return filters.every(filter => {
        const value = row[filter.field];
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          
          case 'contains':
            return String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase());
          
          case 'greater_than':
            return Number(value) > Number(filter.value);
          
          case 'less_than':
            return Number(value) < Number(filter.value);
          
          case 'between':
            return filter.values && 
                   Number(value) >= Number(filter.values[0]) && 
                   Number(value) <= Number(filter.values[1]);
          
          case 'in':
            return filter.values && filter.values.includes(value);
          
          case 'not_null':
            return value != null && value !== '';
          
          default:
            return true;
        }
      });
    });
  }

  /**
   * Format data according to template
   */
  private formatData(
    data: Record<string, any>[],
    template: IExportTemplate
  ): Record<string, any>[] {
    return data.map(row => {
      const formattedRow: Record<string, any> = {};

      template.fields.forEach(field => {
        let value = row[field.sourceField];

        // Apply default value if empty
        if ((value == null || value === '') && field.defaultValue !== undefined) {
          value = field.defaultValue;
        }

        // Apply transformations
        if (field.transformation) {
          value = this.applyTransformation(value, field.transformation);
        }

        // Apply formatting based on data type
        value = this.formatValue(value, field, template.formatting);

        formattedRow[field.displayName] = value;
      });

      return formattedRow;
    });
  }

  /**
   * Apply single transformation
   */
  private applyTransformation(value: any, transformation: string): any {
    if (value == null) return value;

    switch (transformation) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).replace(/\b\w/g, l => l.toUpperCase());
      case 'round_2':
        return Math.round(Number(value) * 100) / 100;
      case 'round_0':
        return Math.round(Number(value));
      case 'percentage':
        return Number(value) * 100;
      case 'currency_cents':
        return Number(value) / 100;
      default:
        return value;
    }
  }

  /**
   * Format value based on field type
   */
  private formatValue(
    value: any,
    field: ITemplateField,
    formatting: ITemplateFormatting
  ): any {
    if (value == null || value === '') return value;

    switch (field.dataType) {
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        
        switch (formatting.dateFormat) {
          case 'MM/DD/YYYY':
            return date.toLocaleDateString('en-US');
          case 'DD/MM/YYYY':
            return date.toLocaleDateString('en-GB');
          case 'YYYY-MM-DD':
            return date.toISOString().split('T')[0];
          default:
            return date.toLocaleDateString();
        }

      case 'currency':
        const num = Number(value);
        if (isNaN(num)) return value;
        return `${formatting.currencySymbol}${num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;

      case 'percentage':
        const pct = Number(value);
        if (isNaN(pct)) return value;
        return `${pct.toFixed(2)}%`;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) return value;
        
        if (field.format === 'integer') {
          return Math.round(numValue).toLocaleString();
        } else {
          return numValue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          });
        }

      case 'boolean':
        return value ? 'Yes' : 'No';

      default:
        return value;
    }
  }

  /**
   * Apply grouping to data
   */
  private applyGrouping(
    data: Record<string, any>[],
    grouping: ITemplateGrouping
  ): Record<string, any>[] {
    // Sort data by grouping field
    const sorted = data.sort((a, b) => {
      const aVal = a[grouping.field];
      const bVal = b[grouping.field];
      
      if (grouping.sortOrder === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    if (!grouping.showSubtotals) {
      return sorted;
    }

    // Insert subtotal rows
    const result: Record<string, any>[] = [];
    let currentGroup: any = null;
    let groupData: Record<string, any>[] = [];

    sorted.forEach((row, index) => {
      const groupValue = row[grouping.field];
      
      if (currentGroup !== groupValue) {
        // Insert previous group subtotal
        if (currentGroup !== null && groupData.length > 0) {
          result.push(this.createSubtotalRow(
            currentGroup,
            groupData,
            grouping.subtotalFields,
            grouping.field
          ));
        }
        
        currentGroup = groupValue;
        groupData = [];
      }
      
      groupData.push(row);
      result.push(row);
      
      // Insert final subtotal
      if (index === sorted.length - 1) {
        result.push(this.createSubtotalRow(
          currentGroup,
          groupData,
          grouping.subtotalFields,
          grouping.field
        ));
      }
    });

    return result;
  }

  /**
   * Create subtotal row
   */
  private createSubtotalRow(
    groupValue: any,
    groupData: Record<string, any>[],
    subtotalFields: string[],
    groupField: string
  ): Record<string, any> {
    const subtotalRow: Record<string, any> = {
      [groupField]: `${groupValue} (Subtotal)`
    };

    subtotalFields.forEach(field => {
      const values = groupData
        .map(row => Number(row[field]) || 0)
        .filter(val => !isNaN(val));
      
      subtotalRow[field] = values.reduce((sum, val) => sum + val, 0);
    });

    // Mark as subtotal row for styling
    subtotalRow._isSubtotal = true;

    return subtotalRow;
  }

  /**
   * Add calculations to data
   */
  private addCalculations(
    data: Record<string, any>[],
    calculations: ITemplateCalculation[]
  ): Record<string, any>[] {
    return data.map(row => {
      const calculatedRow = { ...row };

      calculations.forEach(calc => {
        try {
          // Simple calculation evaluator
          let formula = calc.formula;
          
          // Replace field references with actual values
          calc.fields.forEach(field => {
            const value = Number(row[field]) || 0;
            formula = formula.replace(new RegExp(`\\{${field}\\}`, 'g'), value.toString());
          });

          // Evaluate simple mathematical expressions
          const result = this.evaluateFormula(formula);
          calculatedRow[calc.displayName] = result;
        } catch (error) {
          console.error(`Calculation error for ${calc.name}:`, error);
          calculatedRow[calc.displayName] = 'ERROR';
        }
      });

      return calculatedRow;
    });
  }

  /**
   * Safe formula evaluator using recursive descent parser
   * Supports +, -, *, /, parentheses, and decimal numbers
   */
  private evaluateFormula(formula: string): number {
    const cleaned = formula.replace(/\s/g, '');
    
    // Validate input contains only allowed characters
    if (!/^[0-9+\-*/.()]+$/.test(cleaned)) {
      throw new Error('Invalid characters in formula');
    }

    // Prevent empty or malformed expressions
    if (!cleaned || cleaned === '' || /^[+\-*\/()]$/.test(cleaned)) {
      throw new Error('Empty or malformed formula');
    }

    try {
      const result = this.parseExpression(cleaned, 0).value;
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Formula evaluation resulted in invalid number');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recursive descent parser for mathematical expressions
   */
  private parseExpression(formula: string, index: number): { value: number; index: number } {
    let result = this.parseTerm(formula, index);
    
    while (result.index < formula.length) {
      const char = formula[result.index];
      if (char === '+') {
        const right = this.parseTerm(formula, result.index + 1);
        result = { value: result.value + right.value, index: right.index };
      } else if (char === '-') {
        const right = this.parseTerm(formula, result.index + 1);
        result = { value: result.value - right.value, index: right.index };
      } else {
        break;
      }
    }
    
    return result;
  }

  /**
   * Parse multiplication and division terms
   */
  private parseTerm(formula: string, index: number): { value: number; index: number } {
    let result = this.parseFactor(formula, index);
    
    while (result.index < formula.length) {
      const char = formula[result.index];
      if (char === '*') {
        const right = this.parseFactor(formula, result.index + 1);
        result = { value: result.value * right.value, index: right.index };
      } else if (char === '/') {
        const right = this.parseFactor(formula, result.index + 1);
        if (right.value === 0) {
          throw new Error('Division by zero');
        }
        result = { value: result.value / right.value, index: right.index };
      } else {
        break;
      }
    }
    
    return result;
  }

  /**
   * Parse numbers and parenthesized expressions
   */
  private parseFactor(formula: string, index: number): { value: number; index: number } {
    if (index >= formula.length) {
      throw new Error('Unexpected end of formula');
    }

    const char = formula[index];
    
    // Handle parentheses
    if (char === '(') {
      const result = this.parseExpression(formula, index + 1);
      if (result.index >= formula.length || formula[result.index] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return { value: result.value, index: result.index + 1 };
    }
    
    // Handle unary minus
    if (char === '-') {
      const result = this.parseFactor(formula, index + 1);
      return { value: -result.value, index: result.index };
    }
    
    // Handle unary plus
    if (char === '+') {
      return this.parseFactor(formula, index + 1);
    }
    
    // Parse number
    return this.parseNumber(formula, index);
  }

  /**
   * Parse a number (integer or decimal)
   */
  private parseNumber(formula: string, index: number): { value: number; index: number } {
    let endIndex = index;
    let hasDecimal = false;
    
    // Handle digits and decimal point
    while (endIndex < formula.length) {
      const char = formula[endIndex];
      if (/\d/.test(char)) {
        endIndex++;
      } else if (char === '.' && !hasDecimal) {
        hasDecimal = true;
        endIndex++;
      } else {
        break;
      }
    }
    
    if (endIndex === index) {
      throw new Error(`Expected number at position ${index}`);
    }
    
    const numberStr = formula.substring(index, endIndex);
    const value = parseFloat(numberStr);
    
    if (isNaN(value)) {
      throw new Error(`Invalid number: ${numberStr}`);
    }
    
    return { value, index: endIndex };
  }

  /**
   * Generate file output
   */
  private async generateFile(
    data: Record<string, any>[],
    template: IExportTemplate,
    metadata: any
  ): Promise<{ data: Blob; filename: string; contentType: string }> {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `${template.name.replace(/\s+/g, '_')}_${timestamp}`;

    if (template.formatting.fileFormat === 'csv') {
      return this.generateCSV(data, template, filename, metadata);
    } else {
      return this.generateExcel(data, template, filename, metadata);
    }
  }

  /**
   * Generate CSV file
   */
  private generateCSV(
    data: Record<string, any>[],
    template: IExportTemplate,
    filename: string,
    metadata: any
  ): { data: Blob; filename: string; contentType: string } {
    const csvData = Papa.unparse(data, {
      header: template.formatting.includeHeaders,
      delimiter: ',',
      newline: '\n'
    });

    // Add metadata as comments if requested
    let output = csvData;
    if (metadata) {
      const metadataLines = [
        `# Export: ${template.name}`,
        `# Generated: ${metadata.exportedAt}`,
        `# Records: ${metadata.recordCount}`,
        `# Company ID: ${metadata.companyId}`,
        ''
      ];
      output = metadataLines.join('\n') + csvData;
    }

    return {
      data: new Blob([output], { type: 'text/csv' }),
      filename: `${filename}.csv`,
      contentType: 'text/csv'
    };
  }

  /**
   * Generate Excel file
   */
  private generateExcel(
    data: Record<string, any>[],
    template: IExportTemplate,
    filename: string,
    metadata: any
  ): { data: Blob; filename: string; contentType: string } {
    const workbook = XLSX.utils.book_new();
    
    // Create main data worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: template.fields.map(f => f.displayName)
    });

    // Apply column widths
    const colWidths = template.fields.map(field => ({
      wch: field.width || 15
    }));
    worksheet['!cols'] = colWidths;

    // Add metadata worksheet if requested
    if (metadata) {
      const metadataSheet = XLSX.utils.json_to_sheet([
        { Property: 'Export Template', Value: template.name },
        { Property: 'Generated At', Value: metadata.exportedAt },
        { Property: 'Record Count', Value: metadata.recordCount },
        { Property: 'Company ID', Value: metadata.companyId },
        { Property: 'Target Schema', Value: template.targetSchema }
      ]);
      
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Info');
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Generate binary data
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });

    return {
      data: new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      }),
      filename: `${filename}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Save template to database
   */
  async saveTemplate(
    companyId: string,
    template: Omit<IExportTemplate, 'id'>
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('export_templates')
      .insert({
        company_id: companyId,
        name: template.name,
        description: template.description,
        template_type: 'export',
        target_schema: template.targetSchema,
        field_mappings: template.fields,
        formatting_options: template.formatting,
        filters: template.filters,
        grouping_config: template.grouping,
        calculations: template.calculations,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save template: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Load template from database
   */
  async loadTemplate(templateId: string): Promise<IExportTemplate> {
    const { data, error } = await this.supabase
      .from('export_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !data) {
      throw new Error('Template not found');
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      targetSchema: data.target_schema,
      fields: data.field_mappings,
      formatting: data.formatting_options,
      filters: data.filters || [],
      grouping: data.grouping_config,
      calculations: data.calculations || []
    };
  }

  /**
   * Get default template for schema
   */
  private getDefaultTemplate(targetSchema: 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules'): IExportTemplate {
    const baseTemplate: IExportTemplate = {
      id: 'default',
      name: `${targetSchema.replace('_', ' ').toUpperCase()} Export`,
      description: `Standard export template for ${targetSchema}`,
      targetSchema,
      fields: [],
      formatting: {
        fileFormat: 'xlsx',
        includeHeaders: true,
        dateFormat: 'MM/DD/YYYY',
        numberFormat: '#,##0.00',
        currencySymbol: '$'
      },
      filters: []
    };

    // Configure fields based on schema
    switch (targetSchema) {
      case 'shareholders':
        baseTemplate.fields = [
          { sourceField: 'name', displayName: 'Shareholder Name', dataType: 'string', required: true, width: 25 },
          { sourceField: 'email', displayName: 'Email', dataType: 'string', required: false, width: 30 },
          { sourceField: 'share_count', displayName: 'Shares Owned', dataType: 'number', required: true, width: 15 },
          { sourceField: 'share_class', displayName: 'Share Class', dataType: 'string', required: true, width: 15 },
          { sourceField: 'certificate_number', displayName: 'Certificate #', dataType: 'string', required: false, width: 15 },
          { sourceField: 'issue_date', displayName: 'Issue Date', dataType: 'date', required: false, width: 12 },
          { sourceField: 'vesting_start', displayName: 'Vesting Start', dataType: 'date', required: false, width: 12 }
        ];
        break;

      case 'transactions':
        baseTemplate.fields = [
          { sourceField: 'transaction_date', displayName: 'Date', dataType: 'date', required: true, width: 12 },
          { sourceField: 'transaction_type', displayName: 'Type', dataType: 'string', required: true, width: 15 },
          { sourceField: 'shareholder_name', displayName: 'Shareholder', dataType: 'string', required: true, width: 25 },
          { sourceField: 'share_count', displayName: 'Shares', dataType: 'number', required: true, width: 15 },
          { sourceField: 'price_per_share', displayName: 'Price/Share', dataType: 'currency', required: false, width: 12 },
          { sourceField: 'notes', displayName: 'Notes', dataType: 'string', required: false, width: 30 }
        ];
        break;

      case 'share_classes':
        baseTemplate.fields = [
          { sourceField: 'class_name', displayName: 'Class Name', dataType: 'string', required: true, width: 20 },
          { sourceField: 'authorized_shares', displayName: 'Authorized Shares', dataType: 'number', required: true, width: 18 },
          { sourceField: 'par_value', displayName: 'Par Value', dataType: 'currency', required: false, width: 12 },
          { sourceField: 'liquidation_preference', displayName: 'Liquidation Preference', dataType: 'number', required: false, width: 20 }
        ];
        break;

      case 'vesting_schedules':
        baseTemplate.fields = [
          { sourceField: 'shareholder_name', displayName: 'Shareholder', dataType: 'string', required: true, width: 25 },
          { sourceField: 'total_shares', displayName: 'Total Shares', dataType: 'number', required: true, width: 15 },
          { sourceField: 'start_date', displayName: 'Start Date', dataType: 'date', required: true, width: 12 },
          { sourceField: 'cliff_months', displayName: 'Cliff (months)', dataType: 'number', required: false, width: 15 },
          { sourceField: 'vesting_months', displayName: 'Vesting Period (months)', dataType: 'number', required: true, width: 20 }
        ];
        break;
    }

    return baseTemplate;
  }

  /**
   * List available templates for company
   */
  async listTemplates(companyId: string, targetSchema?: string): Promise<IExportTemplate[]> {
    let query = this.supabase
      .from('export_templates')
      .select('*')
      .eq('company_id', companyId);

    if (targetSchema) {
      query = query.eq('target_schema', targetSchema);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      targetSchema: row.target_schema,
      fields: row.field_mappings,
      formatting: row.formatting_options,
      filters: row.filters || [],
      grouping: row.grouping_config,
      calculations: row.calculations || []
    }));
  }
}

export const templateGenerator = new TemplateGenerator();