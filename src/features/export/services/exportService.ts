import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ICapTableResponse } from '@/types';
import { capTableService } from '@/services/capTableService';
import { AuthorizationService } from '@/services/authorizationService';

export interface IExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeDetails?: boolean;
  includeInactive?: boolean;
  asOfDate?: string;
  fileName?: string;
  watermark?: string;
  confidential?: boolean;
}

export interface IExportResult {
  success: boolean;
  fileName: string;
  downloadUrl?: string;
  error?: string;
}

export class ExportService {
  /**
   * Export cap table in specified format
   */
  static async exportCapTable(
    companyId: string,
    options: IExportOptions
  ): Promise<IExportResult> {
    try {
      // Verify authorization
      await AuthorizationService.validateCompanyAccess(companyId);
      await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');

      // Get cap table data
      const capTableData = await capTableService.getCapTable(companyId, options.asOfDate);
      
      // Get company information for headers
      const company = await this.getCompanyInfo(companyId);
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const fileName = options.fileName || `cap_table_${company.name}_${timestamp}`;

      let downloadUrl: string;
      
      switch (options.format) {
        case 'pdf':
          downloadUrl = await this.exportToPDF(capTableData, company, options, fileName);
          break;
        case 'excel':
          downloadUrl = await this.exportToExcel(capTableData, company, options, fileName);
          break;
        case 'csv':
          downloadUrl = await this.exportToCSV(capTableData, company, options, fileName);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Log export activity
      await AuthorizationService.logSecurityEvent(
        companyId,
        'EXPORT_CAP_TABLE',
        'cap_table',
        {
          format: options.format,
          fileName,
          asOfDate: options.asOfDate,
          includeInactive: options.includeInactive
        }
      );

      return {
        success: true,
        fileName: `${fileName}.${options.format}`,
        downloadUrl
      };
    } catch (error) {
      return {
        success: false,
        fileName: '',
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export to PDF format
   */
  private static async exportToPDF(
    capTableData: ICapTableResponse,
    company: any,
    options: IExportOptions,
    fileName: string
  ): Promise<string> {
    const doc = new jsPDF('landscape');
    
    // Add watermark if specified
    if (options.watermark || options.confidential) {
      doc.setFontSize(60);
      doc.setTextColor(220, 220, 220);
      doc.text(options.watermark || 'CONFIDENTIAL', 150, 100, { 
        angle: 45,
        align: 'center'
      });
    }

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(`${company.name} - Cap Table`, 20, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`As of: ${format(new Date(capTableData.asOf), 'MMMM dd, yyyy')}`, 20, 35);
    doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 20, 42);
    
    if (options.confidential) {
      doc.setTextColor(200, 50, 50);
      doc.text('CONFIDENTIAL - Do not distribute', 20, 49);
    }

    // Summary table
    const summaryData = [
      ['Total Stakeholders', capTableData.stakeholders.length.toString()],
      ['Common Shares Outstanding', capTableData.totals.common.toLocaleString()],
      ['Preferred Shares Outstanding', capTableData.totals.preferred.toLocaleString()],
      ['Options Granted', capTableData.totals.optionsGranted.toLocaleString()],
      ['Unallocated Pool', capTableData.totals.poolUnallocated.toLocaleString()]
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 }
    });

    // Stakeholder details table
    const stakeholderData = capTableData.stakeholders.map(stakeholder => [
      stakeholder.name,
      `${stakeholder.ownershipPct.toFixed(2)}%`,
      stakeholder.asConverted.toLocaleString(),
      (stakeholder.securities.common || 0).toLocaleString(),
      (stakeholder.securities.preferred || 0).toLocaleString(),
      (stakeholder.securities.options || 0).toLocaleString()
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Stakeholder', 'Ownership %', 'Total Shares', 'Common', 'Preferred', 'Options']],
      body: stakeholderData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 270, 200);
    }

    // Generate download URL
    const pdfBlob = doc.output('blob');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return downloadUrl;
  }

  /**
   * Export to Excel format
   */
  private static async exportToExcel(
    capTableData: ICapTableResponse,
    company: any,
    options: IExportOptions,
    fileName: string
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Company', company.name],
      ['As of Date', format(new Date(capTableData.asOf), 'yyyy-MM-dd')],
      ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
      [''],
      ['SUMMARY'],
      ['Total Stakeholders', capTableData.stakeholders.length],
      ['Common Shares Outstanding', capTableData.totals.common],
      ['Preferred Shares Outstanding', capTableData.totals.preferred],
      ['Options Granted', capTableData.totals.optionsGranted],
      ['Unallocated Pool', capTableData.totals.poolUnallocated],
      [''],
      ['Total Fully Diluted Shares', 
        capTableData.totals.common + 
        capTableData.totals.preferred + 
        capTableData.totals.optionsGranted
      ]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Stakeholders sheet
    const stakeholdersData = [
      [
        'Stakeholder Name',
        'Ownership Percentage',
        'Total Shares',
        'Common Stock',
        'Preferred Stock', 
        'Options',
        'RSUs',
        'Warrants',
        'SAFEs',
        'Notes'
      ]
    ];

    capTableData.stakeholders.forEach(stakeholder => {
      stakeholdersData.push([
        stakeholder.name,
        (stakeholder.ownershipPct / 100).toString(), // Excel percentage format
        stakeholder.asConverted.toString(),
        (stakeholder.securities.common || 0).toString(),
        (stakeholder.securities.preferred || 0).toString(),
        (stakeholder.securities.options || 0).toString(),
        (stakeholder.securities.rsus || 0).toString(),
        (stakeholder.securities.warrants || 0).toString(),
        (stakeholder.securities.safes || 0).toString(),
        (stakeholder.securities.notes || 0).toString()
      ]);
    });

    const stakeholdersSheet = XLSX.utils.aoa_to_sheet(stakeholdersData);
    
    // Format ownership percentage column
    const ownershipRange = XLSX.utils.encode_range({ 
      s: { c: 1, r: 1 }, 
      e: { c: 1, r: stakeholdersData.length - 1 } 
    });
    stakeholdersSheet['!format'] = stakeholdersSheet['!format'] || {};
    stakeholdersSheet['!format'][ownershipRange] = '0.00%';

    XLSX.utils.book_append_sheet(workbook, stakeholdersSheet, 'Stakeholders');

    // Detailed breakdown sheet (if requested)
    if (options.includeDetails) {
      const detailsData = [
        [
          'Stakeholder Name',
          'Security Type',
          'Share Class',
          'Quantity',
          'Strike Price',
          'Grant Date',
          'Vesting Schedule',
          'Status'
        ]
      ];

      // This would require additional data from securities table
      // For now, we'll create a placeholder
      detailsData.push(['Detailed security information requires additional implementation']);

      const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
      XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Details');
    }

    // Compliance sheet
    if (options.confidential) {
      const complianceData = [
        ['CONFIDENTIALITY NOTICE'],
        [''],
        ['This document contains confidential and proprietary information.'],
        ['Distribution is restricted to authorized parties only.'],
        [''],
        ['Generated by:', 'Cap Table Management Platform'],
        ['Export Date:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
        ['Company:', company.name]
      ];

      const complianceSheet = XLSX.utils.aoa_to_sheet(complianceData);
      XLSX.utils.book_append_sheet(workbook, complianceSheet, 'Compliance');
    }

    // Generate and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return downloadUrl;
  }

  /**
   * Export to CSV format
   */
  private static async exportToCSV(
    capTableData: ICapTableResponse,
    company: any,
    _options: IExportOptions,
    fileName: string
  ): Promise<string> {
    const headers = [
      'Stakeholder Name',
      'Ownership Percentage',
      'Total Shares',
      'Common Stock',
      'Preferred Stock',
      'Options',
      'RSUs',
      'Warrants',
      'SAFEs',
      'Notes'
    ];

    const rows = capTableData.stakeholders.map(stakeholder => [
      stakeholder.name,
      stakeholder.ownershipPct.toFixed(4),
      stakeholder.asConverted.toString(),
      (stakeholder.securities.common || 0).toString(),
      (stakeholder.securities.preferred || 0).toString(),
      (stakeholder.securities.options || 0).toString(),
      (stakeholder.securities.rsus || 0).toString(),
      (stakeholder.securities.warrants || 0).toString(),
      (stakeholder.securities.safes || 0).toString(),
      (stakeholder.securities.notes || 0).toString()
    ]);

    // Add metadata rows at the top
    const csvData = [
      [`# ${company.name} Cap Table`],
      [`# As of: ${format(new Date(capTableData.asOf), 'yyyy-MM-dd')}`],
      [`# Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`],
      [''],
      headers,
      ...rows
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return downloadUrl;
  }

  /**
   * Export ownership certificates (PDF)
   */
  static async exportOwnershipCertificates(
    companyId: string,
    stakeholderIds: string[],
    options: { 
      template?: 'standard' | 'formal' | 'modern';
      includeSignature?: boolean;
      watermark?: string;
    } = {}
  ): Promise<IExportResult> {
    try {
      await AuthorizationService.validateCompanyAccess(companyId);
      await AuthorizationService.verifyFinancialDataAccess(companyId, 'read');

      const company = await this.getCompanyInfo(companyId);
      const doc = new jsPDF();

      for (let i = 0; i < stakeholderIds.length; i++) {
        if (i > 0) doc.addPage();

        const stakeholderId = stakeholderIds[i];
        const stakeholder = await capTableService.getStakeholderById(stakeholderId);
        
        // Generate certificate for this stakeholder
        await this.generateCertificatePage(doc, company, stakeholder, options);
      }

      const fileName = `ownership_certificates_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      const blob = doc.output('blob');
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        fileName,
        downloadUrl
      };
    } catch (error) {
      return {
        success: false,
        fileName: '',
        error: error instanceof Error ? error.message : 'Certificate generation failed'
      };
    }
  }

  // Private helper methods
  private static async getCompanyInfo(companyId: string): Promise<any> {
    // This would fetch from companies table
    // For now, return mock data
    return {
      id: companyId,
      name: 'Sample Company Inc.',
      incorporationState: 'Delaware',
      incorporationDate: '2024-01-01'
    };
  }

  private static async generateCertificatePage(
    doc: jsPDF,
    company: any,
    stakeholder: any,
    options: any
  ): Promise<void> {
    // Certificate header
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text('STOCK CERTIFICATE', 105, 40, { align: 'center' });

    // Company name
    doc.setFontSize(18);
    doc.text(company.name, 105, 60, { align: 'center' });

    // Certificate number and details would be added here
    doc.setFontSize(12);
    doc.text(`This certifies that ${stakeholder.people?.name || stakeholder.entity_name}`, 20, 100);
    doc.text('is the owner of shares of stock in the above-named corporation.', 20, 115);

    // Add signature lines, seal, etc.
    if (options.includeSignature) {
      doc.text('_____________________', 20, 200);
      doc.text('Secretary', 20, 210);

      doc.text('_____________________', 120, 200);
      doc.text('President', 120, 210);
    }

    // Watermark
    if (options.watermark) {
      doc.setFontSize(60);
      doc.setTextColor(240, 240, 240);
      doc.text(options.watermark, 105, 150, { angle: 45, align: 'center' });
    }
  }
}

export const exportService = ExportService;