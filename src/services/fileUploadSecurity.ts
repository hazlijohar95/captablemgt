import { z } from 'zod';

// File validation schemas
export const FileValidationSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().min(1).max(100 * 1024 * 1024), // 100MB max
  type: z.string().min(1),
  lastModified: z.number().optional()
});

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedName: string;
  detectedMimeType?: string;
  scanId?: string;
}

export interface FileUploadConfig {
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFilesPerUpload: number;
  scanForMalware: boolean;
  checkMagicNumbers: boolean;
  sanitizeFilenames: boolean;
  blockExecutables: boolean;
  blockArchives: boolean;
  requireVirusScanning: boolean;
}

export class FileUploadSecurityService {
  private static readonly DEFAULT_CONFIG: FileUploadConfig = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      // Documents
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      
      // Other safe formats
      'application/json',
      'text/xml',
      'application/xml'
    ],
    allowedExtensions: [
      '.pdf', '.txt', '.csv', '.xls', '.xlsx', '.ppt', '.pptx', '.doc', '.docx',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.json', '.xml'
    ],
    maxFilesPerUpload: 10,
    scanForMalware: true,
    checkMagicNumbers: true,
    sanitizeFilenames: true,
    blockExecutables: true,
    blockArchives: true,
    requireVirusScanning: process.env.NODE_ENV === 'production'
  };

  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.dll', '.sys', '.vbs', '.js',
    '.jar', '.app', '.deb', '.rpm', '.dmg', '.pkg', '.msi', '.ps1', '.sh',
    '.php', '.asp', '.jsp', '.py', '.rb', '.pl', '.go', '.rs'
  ];

  private static readonly DANGEROUS_MIME_TYPES = [
    'application/x-msdownload',
    'application/x-executable',
    'application/x-dosexec',
    'application/x-winexe',
    'application/x-java-archive',
    'text/javascript',
    'application/javascript',
    'text/x-php',
    'application/x-php',
    'text/x-python',
    'application/x-python-code',
    'text/x-shellscript',
    'application/x-shellscript'
  ];

  private static readonly ARCHIVE_MIME_TYPES = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
    'application/x-bzip2'
  ];

  private static readonly MAGIC_NUMBER_SIGNATURES = {
    // PDF
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    
    // PNG
    'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    
    // JPEG
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    
    // GIF
    'image/gif': [0x47, 0x49, 0x46], // GIF
    
    // ZIP/Office formats
    'application/zip': [0x50, 0x4B, 0x03, 0x04],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': [0x50, 0x4B, 0x03, 0x04],
    
    // Windows executables
    'application/x-msdownload': [0x4D, 0x5A], // MZ
    
    // ELF executables
    'application/x-executable': [0x7F, 0x45, 0x4C, 0x46] // ÿELF
  };

  constructor(private config: FileUploadConfig = FileUploadSecurityService.DEFAULT_CONFIG) {}

  /**
   * Validate a single file for security compliance
   */
  async validateFile(file: File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedName: this.sanitizeFilename(file.name)
    };

    try {
      // Basic file validation
      const validation = FileValidationSchema.safeParse({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });

      if (!validation.success) {
        result.errors.push('Invalid file format');
        result.isValid = false;
      }

      // Check file size
      if (file.size > this.config.maxFileSize) {
        result.errors.push(`File size exceeds maximum allowed size of ${this.formatBytes(this.config.maxFileSize)}`);
        result.isValid = false;
      }

      if (file.size === 0) {
        result.errors.push('Empty file not allowed');
        result.isValid = false;
      }

      // Check filename
      const filenameValidation = this.validateFilename(file.name);
      if (!filenameValidation.isValid) {
        result.errors.push(...filenameValidation.errors);
        result.warnings.push(...filenameValidation.warnings);
        result.isValid = result.isValid && filenameValidation.isValid;
      }

      // Check file extension
      const extensionValidation = this.validateFileExtension(file.name);
      if (!extensionValidation.isValid) {
        result.errors.push(...extensionValidation.errors);
        result.isValid = false;
      }

      // Check MIME type
      const mimeValidation = this.validateMimeType(file.type);
      if (!mimeValidation.isValid) {
        result.errors.push(...mimeValidation.errors);
        result.isValid = false;
      }

      // Check magic numbers (file signature)
      if (this.config.checkMagicNumbers) {
        const magicNumberValidation = await this.validateMagicNumbers(file);
        if (!magicNumberValidation.isValid) {
          result.warnings.push(...magicNumberValidation.warnings);
          if (magicNumberValidation.errors.length > 0) {
            result.errors.push(...magicNumberValidation.errors);
            result.isValid = false;
          }
        }
        result.detectedMimeType = magicNumberValidation.detectedMimeType;
      }

      // Malware scanning placeholder
      if (this.config.scanForMalware) {
        const scanResult = await this.performMalwareScan(file);
        if (!scanResult.isClean) {
          result.errors.push('File failed security scan');
          result.isValid = false;
        }
        result.scanId = scanResult.scanId;
      }

    } catch (error) {
      result.errors.push(`File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate multiple files for batch upload
   */
  async validateFiles(files: FileList | File[]): Promise<{
    overallValid: boolean;
    results: FileValidationResult[];
    globalErrors: string[];
  }> {
    const fileArray = Array.from(files);
    const globalErrors: string[] = [];

    // Check number of files
    if (fileArray.length > this.config.maxFilesPerUpload) {
      globalErrors.push(`Too many files. Maximum ${this.config.maxFilesPerUpload} files allowed per upload.`);
    }

    // Check total size
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = this.config.maxFileSize * this.config.maxFilesPerUpload;
    if (totalSize > maxTotalSize) {
      globalErrors.push(`Total upload size exceeds limit of ${this.formatBytes(maxTotalSize)}`);
    }

    // Check for duplicate names
    const names = fileArray.map(f => f.name.toLowerCase());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      globalErrors.push(`Duplicate file names detected: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Validate each file
    const results = await Promise.all(
      fileArray.map(file => this.validateFile(file))
    );

    const overallValid = globalErrors.length === 0 && results.every(result => result.isValid);

    return {
      overallValid,
      results,
      globalErrors
    };
  }

  /**
   * Sanitize filename for safe storage
   */
  private sanitizeFilename(filename: string): string {
    if (!this.config.sanitizeFilenames) {
      return filename;
    }

    // Remove or replace dangerous characters
    let sanitized = filename
      // Remove null bytes and control characters
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      // Replace dangerous characters with underscore
      .replace(/[<>:"/\\|?*]/g, '_')
      // Remove leading/trailing dots and spaces
      .replace(/^[.\s]+|[.\s]+$/g, '')
      // Collapse multiple underscores
      .replace(/_+/g, '_')
      // Limit length
      .slice(0, 200);

    // Ensure we still have a valid filename
    if (!sanitized || sanitized.length === 0) {
      const extension = this.getFileExtension(filename);
      sanitized = `file_${Date.now()}${extension}`;
    }

    // Ensure it doesn't start with a dot
    if (sanitized.startsWith('.')) {
      sanitized = `file_${sanitized}`;
    }

    return sanitized;
  }

  /**
   * Validate filename for security issues
   */
  private validateFilename(filename: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for null bytes
    if (filename.includes('\0')) {
      errors.push('Filename contains null bytes');
    }

    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('./') || filename.includes('.\\')) {
      errors.push('Filename contains path traversal sequences');
    }

    // Check for reserved Windows names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      errors.push('Filename uses reserved system name');
    }

    // Check filename length
    if (filename.length > 255) {
      errors.push('Filename too long (max 255 characters)');
    }

    if (filename.length === 0) {
      errors.push('Empty filename');
    }

    // Check for suspicious patterns
    if (filename.match(/\.(exe|bat|cmd|scr|pif|com|dll|sys|vbs|js)$/i)) {
      if (!filename.match(/\.(exe|bat|cmd|scr|pif|com|dll|sys|vbs|js)\.(txt|doc|pdf)$/i)) {
        warnings.push('Filename has executable extension');
      }
    }

    // Check for multiple extensions (possible extension spoofing)
    const extensions = filename.split('.').slice(1);
    if (extensions.length > 2) {
      warnings.push('Filename has multiple extensions - possible extension spoofing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate file extension
   */
  private validateFileExtension(filename: string): { isValid: boolean; errors: string[] } {
    const extension = this.getFileExtension(filename).toLowerCase();
    const errors: string[] = [];

    if (!extension) {
      errors.push('File must have an extension');
      return { isValid: false, errors };
    }

    // Check if extension is allowed
    if (!this.config.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check for dangerous extensions
    if (this.config.blockExecutables && FileUploadSecurityService.DANGEROUS_EXTENSIONS.includes(extension)) {
      errors.push(`Potentially dangerous file extension '${extension}' blocked`);
    }

    // Check for archive extensions
    if (this.config.blockArchives && ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(extension)) {
      errors.push(`Archive files with extension '${extension}' are not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate MIME type
   */
  private validateMimeType(mimeType: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!mimeType) {
      errors.push('File MIME type is required');
      return { isValid: false, errors };
    }

    // Check if MIME type is allowed
    if (!this.config.allowedMimeTypes.includes(mimeType)) {
      errors.push(`MIME type '${mimeType}' is not allowed`);
    }

    // Check for dangerous MIME types
    if (this.config.blockExecutables && FileUploadSecurityService.DANGEROUS_MIME_TYPES.includes(mimeType)) {
      errors.push(`Potentially dangerous MIME type '${mimeType}' blocked`);
    }

    // Check for archive MIME types
    if (this.config.blockArchives && FileUploadSecurityService.ARCHIVE_MIME_TYPES.includes(mimeType)) {
      errors.push(`Archive MIME type '${mimeType}' is not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file magic numbers (file signatures)
   */
  private async validateMagicNumbers(file: File): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    detectedMimeType?: string;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let detectedMimeType: string | undefined;

    try {
      // Read first 32 bytes for magic number check
      const buffer = await this.readFileHeader(file, 32);
      const bytes = new Uint8Array(buffer);

      // Check against known signatures
      for (const [mimeType, signature] of Object.entries(FileUploadSecurityService.MAGIC_NUMBER_SIGNATURES)) {
        if (this.matchesSignature(bytes, signature)) {
          detectedMimeType = mimeType;
          break;
        }
      }

      // Compare detected MIME type with declared MIME type
      if (detectedMimeType && detectedMimeType !== file.type) {
        if (this.isMimeTypeMismatchCritical(detectedMimeType, file.type)) {
          errors.push(`File signature doesn't match declared type. Detected: ${detectedMimeType}, Declared: ${file.type}`);
        } else {
          warnings.push(`File signature suggests ${detectedMimeType} but declared as ${file.type}`);
        }
      }

      // Check for executable signatures
      if (this.config.blockExecutables && this.isExecutableSignature(bytes)) {
        errors.push('File appears to be an executable');
      }

    } catch (error) {
      warnings.push(`Could not validate file signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      detectedMimeType
    };
  }

  /**
   * Perform malware scanning (placeholder for real implementation)
   */
  private async performMalwareScan(file: File): Promise<{ isClean: boolean; scanId: string }> {
    // In a real implementation, this would integrate with a malware scanning service
    // like ClamAV, VirusTotal API, or cloud scanning services
    
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.config.requireVirusScanning) {
      // Placeholder: In production, implement actual scanning
      console.warn('Malware scanning not implemented - file passed by default');
    }

    return {
      isClean: true,
      scanId
    };
  }

  /**
   * Helper methods
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot);
  }

  private async readFileHeader(file: File, bytes: number): Promise<ArrayBuffer> {
    const slice = file.slice(0, bytes);
    return slice.arrayBuffer();
  }

  private matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
    if (bytes.length < signature.length) return false;
    
    return signature.every((byte, index) => bytes[index] === byte);
  }

  private isExecutableSignature(bytes: Uint8Array): boolean {
    // Windows PE
    if (bytes.length >= 2 && bytes[0] === 0x4D && bytes[1] === 0x5A) return true;
    
    // ELF
    if (bytes.length >= 4 && bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) return true;
    
    // Mach-O
    if (bytes.length >= 4 && (
      (bytes[0] === 0xFE && bytes[1] === 0xED && bytes[2] === 0xFA && bytes[3] === 0xCE) ||
      (bytes[0] === 0xCE && bytes[1] === 0xFA && bytes[2] === 0xED && bytes[3] === 0xFE)
    )) return true;
    
    return false;
  }

  private isMimeTypeMismatchCritical(detected: string, declared: string): boolean {
    // Allow some common mismatches that are not security critical
    const allowedMismatches = [
      // Office documents often appear as ZIP
      { detected: 'application/zip', declared: /^application\/vnd\.openxmlformats-officedocument/ },
      // Text files might be declared as plain text but be CSV
      { detected: 'text/plain', declared: 'text/csv' }
    ];

    return !allowedMismatches.some(mismatch => 
      mismatch.detected === detected && 
      (typeof mismatch.declared === 'string' ? 
        mismatch.declared === declared : 
        mismatch.declared.test(declared)
      )
    );
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Create a secure file upload configuration for different contexts
   */
  static createConfig(context: 'documents' | 'images' | 'data' | 'strict'): FileUploadConfig {
    const base = { ...FileUploadSecurityService.DEFAULT_CONFIG };

    switch (context) {
      case 'documents':
        return {
          ...base,
          allowedMimeTypes: [
            'application/pdf',
            'text/plain',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          allowedExtensions: ['.pdf', '.txt', '.csv', '.xls', '.xlsx', '.ppt', '.pptx', '.doc', '.docx'],
          maxFileSize: 25 * 1024 * 1024 // 25MB
        };

      case 'images':
        return {
          ...base,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
          maxFileSize: 10 * 1024 * 1024, // 10MB
          maxFilesPerUpload: 20
        };

      case 'data':
        return {
          ...base,
          allowedMimeTypes: ['text/csv', 'application/json', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
          allowedExtensions: ['.csv', '.json', '.txt', '.xls', '.xlsx'],
          maxFileSize: 100 * 1024 * 1024, // 100MB
          checkMagicNumbers: true,
          requireVirusScanning: true
        };

      case 'strict':
        return {
          ...base,
          maxFileSize: 5 * 1024 * 1024, // 5MB
          allowedMimeTypes: ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'],
          allowedExtensions: ['.pdf', '.txt', '.jpg', '.jpeg', '.png'],
          maxFilesPerUpload: 5,
          requireVirusScanning: true,
          checkMagicNumbers: true,
          blockArchives: true,
          blockExecutables: true
        };

      default:
        return base;
    }
  }
}