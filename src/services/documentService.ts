/**
 * Document Management Service for 409A Valuations
 * Handles file uploads, security, retention, and audit trails for valuation documents
 */

import { supabase } from './supabase';
import { AuditService } from './auditService';
import { AuditDocument, DocumentType } from '@/types/valuation409a';

export interface FileUploadRequest {
  file: File;
  document_type: DocumentType;
  company_id: string;
  related_entity_type?: string;
  related_entity_id?: string;
  classification_level?: string;
  uploaded_by?: string;
  retention_period_years?: number;
  legal_hold?: boolean;
}

export interface DocumentSearchFilters {
  document_type?: DocumentType;
  company_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  classification_level?: string;
  date_from?: string;
  date_to?: string;
}

export class DocumentService {
  private auditService: AuditService;
  private readonly BUCKET_NAME = 'valuation-documents';
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain',
    'image/png',
    'image/jpeg'
  ];

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Upload a document with full audit trail
   */
  async uploadDocument(request: FileUploadRequest): Promise<AuditDocument> {
    // Validate file
    this.validateFile(request.file);

    // Generate file path and hash
    const timestamp = new Date().toISOString();
    const sanitizedFileName = this.sanitizeFileName(request.file.name);
    const filePath = `${request.company_id}/${request.document_type}/${timestamp}_${sanitizedFileName}`;
    const fileHash = await this.calculateFileHash(request.file);

    // Check for duplicate files
    await this.checkForDuplicates(request.company_id, fileHash);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, request.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: request.file.type
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Create document audit record
    const documentAudit = await this.auditService.logDocumentEvent({
      document_type: request.document_type,
      file_name: request.file.name,
      file_path: filePath,
      file_size: request.file.size,
      file_hash: fileHash,
      mime_type: request.file.type,
      company_id: request.company_id,
      related_entity_type: request.related_entity_type,
      related_entity_id: request.related_entity_id,
      classification_level: request.classification_level || 'CONFIDENTIAL',
      uploaded_by: request.uploaded_by,
      retention_period_years: request.retention_period_years,
      legal_hold: request.legal_hold
    });

    return documentAudit;
  }

  /**
   * Download a document with access logging
   */
  async downloadDocument(documentId: string, userId?: string): Promise<{ blob: Blob; document: AuditDocument }> {
    // Get document details
    const { data: document, error: fetchError } = await supabase
      .from('audit_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      throw new Error('Document not found');
    }

    // Check if document is accessible
    this.validateDocumentAccess(document, userId);

    // Download from Supabase Storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .download(document.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Log access
    await this.auditService.logDocumentAccess(documentId, userId);

    return { blob, document };
  }

  /**
   * Get document metadata by ID
   */
  async getDocumentById(documentId: string, userId?: string): Promise<AuditDocument | null> {
    const { data: document, error } = await supabase
      .from('audit_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get document: ${error.message}`);
    }

    if (!document) return null;

    // Log metadata access
    await this.auditService.logEvent({
      event_type: 'VIEW',
      entity_type: 'REPORT',
      entity_id: documentId,
      company_id: document.company_id,
      user_id: userId,
      change_summary: `Document metadata accessed: ${document.file_name}`
    });

    return document;
  }

  /**
   * Search documents with filtering
   */
  async searchDocuments(
    filters: DocumentSearchFilters,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    documents: AuditDocument[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    let query = supabase
      .from('audit_documents')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    if (filters.document_type) {
      query = query.eq('document_type', filters.document_type);
    }

    if (filters.related_entity_type) {
      query = query.eq('related_entity_type', filters.related_entity_type);
    }

    if (filters.related_entity_id) {
      query = query.eq('related_entity_id', filters.related_entity_id);
    }

    if (filters.classification_level) {
      query = query.eq('classification_level', filters.classification_level);
    }

    if (filters.date_from) {
      query = query.gte('uploaded_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('uploaded_at', filters.date_to);
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      documents: documents || [],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    updates: {
      classification_level?: string;
      legal_hold?: boolean;
      retention_period_years?: number;
      access_permissions?: Record<string, any>;
    },
    userId?: string
  ): Promise<AuditDocument> {
    const existing = await this.getDocumentById(documentId);
    if (!existing) {
      throw new Error('Document not found');
    }

    const { data: updated, error } = await supabase
      .from('audit_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document metadata: ${error.message}`);
    }

    // Log the update
    await this.auditService.logEvent({
      event_type: 'UPDATE',
      entity_type: 'REPORT',
      entity_id: documentId,
      company_id: existing.company_id,
      user_id: userId,
      old_value: existing,
      new_value: updated,
      change_summary: 'Document metadata updated'
    });

    return updated;
  }

  /**
   * Delete a document (permanent deletion)
   */
  async deleteDocument(documentId: string, userId?: string): Promise<void> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Check if document is under legal hold
    if (document.legal_hold) {
      throw new Error('Cannot delete document under legal hold');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([document.file_path]);

    if (storageError) {
      throw new Error(`Failed to delete file from storage: ${storageError.message}`);
    }

    // Delete from audit table
    const { error: deleteError } = await supabase
      .from('audit_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      throw new Error(`Failed to delete document record: ${deleteError.message}`);
    }

    // Log deletion
    await this.auditService.logEvent({
      event_type: 'DELETE',
      entity_type: 'REPORT',
      entity_id: documentId,
      company_id: document.company_id,
      user_id: userId,
      old_value: document,
      change_summary: `Document permanently deleted: ${document.file_name}`
    });
  }

  /**
   * Get documents requiring retention action
   */
  async getRetentionActionRequired(companyId?: string): Promise<{
    expiring_soon: AuditDocument[];
    ready_for_destruction: AuditDocument[];
    legal_hold_review: AuditDocument[];
  }> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const today = new Date();

    let query = supabase
      .from('audit_documents')
      .select('*');

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: documents, error } = await query;

    if (error) {
      throw new Error(`Failed to get retention documents: ${error.message}`);
    }

    const expiring_soon: AuditDocument[] = [];
    const ready_for_destruction: AuditDocument[] = [];
    const legal_hold_review: AuditDocument[] = [];

    (documents || []).forEach(doc => {
      if (doc.destruction_date) {
        const destructionDate = new Date(doc.destruction_date);
        
        if (destructionDate <= today && !doc.legal_hold) {
          ready_for_destruction.push(doc);
        } else if (destructionDate <= thirtyDaysFromNow) {
          expiring_soon.push(doc);
        }
      }

      // Documents on legal hold for more than 2 years may need review
      if (doc.legal_hold) {
        const uploadedDate = new Date(doc.uploaded_at);
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        
        if (uploadedDate <= twoYearsAgo) {
          legal_hold_review.push(doc);
        }
      }
    });

    return {
      expiring_soon,
      ready_for_destruction,
      legal_hold_review
    };
  }

  /**
   * Generate signed URL for secure document access
   */
  async generateSignedUrl(
    documentId: string,
    expiresIn: number = 3600, // 1 hour default
    userId?: string
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    this.validateDocumentAccess(document, userId);

    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(document.file_path, expiresIn);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Log URL generation
    await this.auditService.logEvent({
      event_type: 'VIEW',
      entity_type: 'REPORT',
      entity_id: documentId,
      company_id: document.company_id,
      user_id: userId,
      change_summary: `Signed URL generated (expires: ${expiresAt})`,
      metadata: { expires_in: expiresIn }
    });

    return {
      signedUrl: data.signedUrl,
      expiresAt
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private validateFile(file: File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Basic file name validation
    if (!file.name || file.name.trim().length === 0) {
      throw new Error('File name is required');
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
    const fileName = file.name.toLowerCase();
    
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      throw new Error(`File extension is not allowed for security reasons`);
    }
  }

  private sanitizeFileName(fileName: string): string {
    // Remove dangerous characters and replace with underscores
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .trim();
  }

  private async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async checkForDuplicates(companyId: string, fileHash: string): Promise<void> {
    const { data: existing, error } = await supabase
      .from('audit_documents')
      .select('id, file_name')
      .eq('company_id', companyId)
      .eq('file_hash', fileHash)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check for duplicates: ${error.message}`);
    }

    if (existing && existing.length > 0) {
      throw new Error(`Duplicate file detected. Identical file already exists: ${existing[0].file_name}`);
    }
  }

  private validateDocumentAccess(document: AuditDocument, userId?: string): void {
    // Basic access control - in production, implement proper RBAC
    if (document.classification_level === 'RESTRICTED') {
      if (!userId) {
        throw new Error('Authentication required to access restricted documents');
      }
      
      // Additional access control logic would go here
      // For example, checking user roles, permissions, etc.
    }

    // Check if document is expired or under legal review
    if (document.destruction_date) {
      const destructionDate = new Date(document.destruction_date);
      const today = new Date();
      
      if (destructionDate <= today && !document.legal_hold) {
        throw new Error('Document is scheduled for destruction and no longer accessible');
      }
    }
  }
}

export const documentService = new DocumentService();