/**
 * API Validation and Testing Middleware
 * Comprehensive request/response validation and API testing infrastructure
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { BaseService } from '@/services/baseService';
import { ApiError, ValidationError, FieldError } from '@/types/api';

// Initialize AJV for JSON Schema validation
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

interface ValidationRequest extends Request {
  validatedData?: {
    params?: any;
    query?: any;
    body?: any;
  };
  apiSpec?: {
    operationId: string;
    method: string;
    path: string;
    parameters?: any[];
    requestBody?: any;
    responses?: any;
  };
}

class ApiValidationService extends BaseService {
  private schemas: Map<string, any> = new Map();
  private openApiSpec: any = null;

  constructor() {
    super();
    this.loadOpenApiSpec();
  }

  /**
   * Load OpenAPI specification
   */
  private async loadOpenApiSpec() {
    try {
      // In production, this would load from a file or database
      this.openApiSpec = await this.getOpenApiSpecification();
      this.compileSchemas();
    } catch (error) {
      console.error('Failed to load OpenAPI specification:', error);
    }
  }

  /**
   * Compile JSON schemas from OpenAPI spec
   */
  private compileSchemas() {
    if (!this.openApiSpec?.components?.schemas) {
      return;
    }

    Object.entries(this.openApiSpec.components.schemas).forEach(([name, schema]) => {
      try {
        const compiledSchema = ajv.compile(schema);
        this.schemas.set(name, compiledSchema);
      } catch (error) {
        console.error(`Failed to compile schema ${name}:`, error);
      }
    });
  }

  /**
   * Get OpenAPI specification (mock implementation)
   */
  private async getOpenApiSpecification() {
    // This would normally load the OpenAPI spec from a file
    // For now, return a subset for validation
    return {
      openapi: '3.0.3',
      info: { title: 'CapTable API', version: '1.0.0' },
      paths: {
        '/companies': {
          get: {
            operationId: 'listCompanies',
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', minimum: 1, default: 1 }
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
              },
              {
                name: 'search',
                in: 'query',
                schema: { type: 'string', maxLength: 100 }
              }
            ],
            responses: {
              '200': {
                description: 'List of companies',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CompanyListResponse' }
                  }
                }
              }
            }
          },
          post: {
            operationId: 'createCompany',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateCompanyRequest' }
                }
              }
            },
            responses: {
              '201': {
                description: 'Company created',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Company' }
                  }
                }
              }
            }
          }
        },
        '/companies/{companyId}': {
          get: {
            operationId: 'getCompany',
            parameters: [
              {
                name: 'companyId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' }
              }
            ],
            responses: {
              '200': {
                description: 'Company details',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CompanyDetails' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Company: {
            type: 'object',
            required: ['id', 'name', 'jurisdiction', 'created_at'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', minLength: 1, maxLength: 200 },
              jurisdiction: { type: 'string' },
              incorporation_date: { type: 'string', format: 'date' },
              authorized_shares: { type: 'integer', minimum: 1 },
              outstanding_shares: { type: 'integer', minimum: 0 },
              website: { type: 'string', format: 'uri' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            }
          },
          CreateCompanyRequest: {
            type: 'object',
            required: ['name', 'jurisdiction'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 200 },
              jurisdiction: { type: 'string' },
              incorporation_date: { type: 'string', format: 'date' },
              authorized_shares: { type: 'integer', minimum: 1, default: 10000000 },
              website: { type: 'string', format: 'uri' }
            }
          },
          CompanyListResponse: {
            type: 'object',
            required: ['data', 'pagination'],
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/Company' }
              },
              pagination: { $ref: '#/components/schemas/PaginationResponse' }
            }
          },
          PaginationResponse: {
            type: 'object',
            required: ['page', 'limit', 'total', 'pages'],
            properties: {
              page: { type: 'integer', minimum: 1 },
              limit: { type: 'integer', minimum: 1 },
              total: { type: 'integer', minimum: 0 },
              pages: { type: 'integer', minimum: 0 }
            }
          },
          ApiError: {
            type: 'object',
            required: ['error', 'message', 'request_id', 'timestamp'],
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
              request_id: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    };
  }

  /**
   * Validate request against OpenAPI specification
   */
  validateRequest(req: ValidationRequest): ValidationError | null {
    if (!this.openApiSpec) {
      return null; // Skip validation if spec not loaded
    }

    const method = req.method.toLowerCase();
    const path = this.normalizePathForSpec(req.path);
    const operation = this.openApiSpec.paths?.[path]?.[method];

    if (!operation) {
      return null; // No spec found for this endpoint
    }

    const errors: FieldError[] = [];

    // Validate path parameters
    if (operation.parameters) {
      const pathParams = operation.parameters.filter((p: any) => p.in === 'path');
      const queryParams = operation.parameters.filter((p: any) => p.in === 'query');
      const headerParams = operation.parameters.filter((p: any) => p.in === 'header');

      // Validate path parameters
      pathParams.forEach((param: any) => {
        const value = req.params[param.name];
        const validation = this.validateParameter(value, param, 'path');
        if (validation) errors.push(validation);
      });

      // Validate query parameters
      queryParams.forEach((param: any) => {
        const value = req.query[param.name];
        const validation = this.validateParameter(value, param, 'query');
        if (validation) errors.push(validation);
      });

      // Validate header parameters
      headerParams.forEach((param: any) => {
        const value = req.headers[param.name.toLowerCase()];
        const validation = this.validateParameter(value, param, 'header');
        if (validation) errors.push(validation);
      });
    }

    // Validate request body
    if (operation.requestBody) {
      const contentType = req.headers['content-type'];
      const expectedContent = operation.requestBody.content;

      if (operation.requestBody.required && !req.body) {
        errors.push({
          field: 'body',
          code: 'required',
          message: 'Request body is required'
        });
      } else if (req.body && expectedContent) {
        const schema = expectedContent['application/json']?.schema;
        if (schema) {
          const bodyValidation = this.validateAgainstSchema(req.body, schema, 'body');
          errors.push(...bodyValidation);
        }
      }
    }

    if (errors.length > 0) {
      return {
        error: 'validation_error',
        message: 'Request validation failed',
        request_id: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString(),
        validation_errors: errors
      };
    }

    return null;
  }

  /**
   * Validate response against OpenAPI specification
   */
  validateResponse(req: ValidationRequest, res: Response, body: any): ValidationError | null {
    if (!this.openApiSpec || !req.apiSpec) {
      return null;
    }

    const operation = req.apiSpec;
    const statusCode = res.statusCode.toString();
    const responseSpec = operation.responses?.[statusCode] || operation.responses?.default;

    if (!responseSpec) {
      return null; // No response spec found
    }

    const contentSpec = responseSpec.content?.['application/json'];
    if (!contentSpec?.schema) {
      return null; // No schema to validate against
    }

    const errors = this.validateAgainstSchema(body, contentSpec.schema, 'response');
    
    if (errors.length > 0) {
      return {
        error: 'response_validation_error',
        message: 'Response validation failed',
        request_id: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString(),
        validation_errors: errors
      };
    }

    return null;
  }

  /**
   * Validate a single parameter
   */
  private validateParameter(value: any, param: any, location: string): FieldError | null {
    const { name, required, schema } = param;

    // Check if required parameter is missing
    if (required && (value === undefined || value === null || value === '')) {
      return {
        field: `${location}.${name}`,
        code: 'required',
        message: `${name} is required in ${location}`,
        value
      };
    }

    // Skip validation if parameter is optional and not provided
    if (!required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Validate against schema
    return this.validateParameterValue(value, schema, `${location}.${name}`);
  }

  /**
   * Validate parameter value against schema
   */
  private validateParameterValue(value: any, schema: any, fieldPath: string): FieldError | null {
    const { type, format, minimum, maximum, minLength, maxLength, pattern, enum: enumValues } = schema;

    // Type validation
    if (type === 'integer' && !Number.isInteger(Number(value))) {
      return {
        field: fieldPath,
        code: 'invalid_type',
        message: `Expected integer, got ${typeof value}`,
        value
      };
    }

    if (type === 'number' && isNaN(Number(value))) {
      return {
        field: fieldPath,
        code: 'invalid_type',
        message: `Expected number, got ${typeof value}`,
        value
      };
    }

    // Convert value for further validation
    let convertedValue = value;
    if (type === 'integer' || type === 'number') {
      convertedValue = Number(value);
    }

    // Range validation
    if (minimum !== undefined && convertedValue < minimum) {
      return {
        field: fieldPath,
        code: 'minimum',
        message: `Value must be at least ${minimum}`,
        value
      };
    }

    if (maximum !== undefined && convertedValue > maximum) {
      return {
        field: fieldPath,
        code: 'maximum',
        message: `Value must be at most ${maximum}`,
        value
      };
    }

    // String length validation
    if (type === 'string') {
      if (minLength !== undefined && value.length < minLength) {
        return {
          field: fieldPath,
          code: 'min_length',
          message: `Value must be at least ${minLength} characters long`,
          value
        };
      }

      if (maxLength !== undefined && value.length > maxLength) {
        return {
          field: fieldPath,
          code: 'max_length',
          message: `Value must be at most ${maxLength} characters long`,
          value
        };
      }

      // Pattern validation
      if (pattern && !new RegExp(pattern).test(value)) {
        return {
          field: fieldPath,
          code: 'pattern',
          message: `Value does not match required pattern`,
          value
        };
      }

      // Format validation
      if (format) {
        const formatError = this.validateFormat(value, format, fieldPath);
        if (formatError) return formatError;
      }
    }

    // Enum validation
    if (enumValues && !enumValues.includes(value)) {
      return {
        field: fieldPath,
        code: 'enum',
        message: `Value must be one of: ${enumValues.join(', ')}`,
        value
      };
    }

    return null;
  }

  /**
   * Validate format (email, date, uuid, etc.)
   */
  private validateFormat(value: string, format: string, fieldPath: string): FieldError | null {
    const formats: Record<string, RegExp> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      date: /^\d{4}-\d{2}-\d{2}$/,
      'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/,
      uri: /^https?:\/\/.+/
    };

    const regex = formats[format];
    if (regex && !regex.test(value)) {
      return {
        field: fieldPath,
        code: 'format',
        message: `Value does not match ${format} format`,
        value
      };
    }

    return null;
  }

  /**
   * Validate object against JSON schema
   */
  private validateAgainstSchema(data: any, schema: any, fieldPrefix: string): FieldError[] {
    const errors: FieldError[] = [];

    // Handle schema references
    if (schema.$ref) {
      const schemaName = schema.$ref.replace('#/components/schemas/', '');
      const compiledSchema = this.schemas.get(schemaName);
      
      if (compiledSchema) {
        const valid = compiledSchema(data);
        if (!valid && compiledSchema.errors) {
          compiledSchema.errors.forEach((error: any) => {
            errors.push({
              field: fieldPrefix + (error.instancePath || ''),
              code: error.keyword,
              message: error.message || 'Validation failed',
              value: error.data
            });
          });
        }
      }
      return errors;
    }

    // Direct schema validation
    const compiledSchema = ajv.compile(schema);
    const valid = compiledSchema(data);
    
    if (!valid && compiledSchema.errors) {
      compiledSchema.errors.forEach((error: any) => {
        errors.push({
          field: fieldPrefix + (error.instancePath || ''),
          code: error.keyword,
          message: error.message || 'Validation failed',
          value: error.data
        });
      });
    }

    return errors;
  }

  /**
   * Normalize request path to match OpenAPI spec
   */
  private normalizePathForSpec(requestPath: string): string {
    // Convert path parameters to OpenAPI format
    // e.g., /companies/123 -> /companies/{companyId}
    return requestPath.replace(/\/[0-9a-f-]{36}/gi, '/{id}') // UUID params
                     .replace(/\/\d+/g, '/{id}') // Numeric params
                     .replace(/\/api\/v\d+/, ''); // Remove version prefix
  }

  /**
   * Generate test cases from OpenAPI specification
   */
  generateTestCases(): Array<{
    name: string;
    method: string;
    path: string;
    description: string;
    validRequest: any;
    invalidRequests: any[];
    expectedResponses: any[];
  }> {
    if (!this.openApiSpec) return [];

    const testCases: any[] = [];

    Object.entries(this.openApiSpec.paths).forEach(([path, pathSpec]: [string, any]) => {
      Object.entries(pathSpec).forEach(([method, operation]: [string, any]) => {
        const testCase = {
          name: `${method.toUpperCase()} ${path}`,
          method: method.toUpperCase(),
          path,
          description: operation.summary || operation.description,
          validRequest: this.generateValidRequest(operation),
          invalidRequests: this.generateInvalidRequests(operation),
          expectedResponses: Object.keys(operation.responses || {})
        };

        testCases.push(testCase);
      });
    });

    return testCases;
  }

  /**
   * Generate valid request example
   */
  private generateValidRequest(operation: any): any {
    const request: any = {};

    // Generate path parameters
    if (operation.parameters) {
      const pathParams = operation.parameters.filter((p: any) => p.in === 'path');
      pathParams.forEach((param: any) => {
        if (!request.params) request.params = {};
        request.params[param.name] = this.generateValidValue(param.schema);
      });

      // Generate query parameters
      const queryParams = operation.parameters.filter((p: any) => p.in === 'query');
      queryParams.forEach((param: any) => {
        if (!param.required) return; // Skip optional for valid example
        if (!request.query) request.query = {};
        request.query[param.name] = this.generateValidValue(param.schema);
      });
    }

    // Generate request body
    if (operation.requestBody?.content?.['application/json']?.schema) {
      request.body = this.generateValidValue(operation.requestBody.content['application/json'].schema);
    }

    return request;
  }

  /**
   * Generate invalid request examples
   */
  private generateInvalidRequests(operation: any): any[] {
    const invalidRequests: any[] = [];

    // Missing required parameters
    if (operation.parameters) {
      const requiredParams = operation.parameters.filter((p: any) => p.required);
      requiredParams.forEach((param: any) => {
        const invalidRequest = this.generateValidRequest(operation);
        if (param.in === 'path' && invalidRequest.params) {
          delete invalidRequest.params[param.name];
        } else if (param.in === 'query' && invalidRequest.query) {
          delete invalidRequest.query[param.name];
        }
        invalidRequest._description = `Missing required ${param.in} parameter: ${param.name}`;
        invalidRequests.push(invalidRequest);
      });
    }

    // Missing required body
    if (operation.requestBody?.required) {
      const invalidRequest = this.generateValidRequest(operation);
      delete invalidRequest.body;
      invalidRequest._description = 'Missing required request body';
      invalidRequests.push(invalidRequest);
    }

    return invalidRequests;
  }

  /**
   * Generate valid value for schema
   */
  private generateValidValue(schema: any): any {
    if (schema.$ref) {
      // Handle schema references
      const schemaName = schema.$ref.replace('#/components/schemas/', '');
      const referencedSchema = this.openApiSpec.components?.schemas?.[schemaName];
      if (referencedSchema) {
        return this.generateValidValue(referencedSchema);
      }
      return {};
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'date') return '2024-01-01';
        if (schema.format === 'date-time') return '2024-01-01T12:00:00.000Z';
        if (schema.format === 'uri') return 'https://example.com';
        if (schema.enum) return schema.enum[0];
        return schema.example || 'test string';

      case 'integer':
        return schema.example || Math.max(schema.minimum || 0, 1);

      case 'number':
        return schema.example || Math.max(schema.minimum || 0, 1.0);

      case 'boolean':
        return schema.example !== undefined ? schema.example : true;

      case 'array':
        if (schema.items) {
          return [this.generateValidValue(schema.items)];
        }
        return [];

      case 'object':
        const obj: any = {};
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
            if (schema.required?.includes(key)) {
              obj[key] = this.generateValidValue(prop);
            }
          });
        }
        return obj;

      default:
        return null;
    }
  }
}

const validationService = new ApiValidationService();

/**
 * Request validation middleware
 */
export const requestValidationMiddleware = (
  req: ValidationRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validationError = validationService.validateRequest(req);
    
    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Store operation info for response validation
    const method = req.method.toLowerCase();
    const path = req.path.replace(/\/api\/v\d+/, ''); // Remove version prefix
    
    req.apiSpec = {
      operationId: `${method}${path.replace(/\//g, '_')}`,
      method,
      path,
      parameters: [], // Would be populated from spec
      responses: {} // Would be populated from spec
    };

    next();
  } catch (error) {
    console.error('Request validation error:', error);
    next(); // Continue without validation if service fails
  }
};

/**
 * Response validation middleware (for development/testing)
 */
export const responseValidationMiddleware = (
  req: ValidationRequest,
  res: Response,
  next: NextFunction
) => {
  if (process.env.NODE_ENV === 'production') {
    return next(); // Skip in production
  }

  // Intercept response
  const originalSend = res.send;
  
  res.send = function(body: any) {
    try {
      const validationError = validationService.validateResponse(req, res, 
        typeof body === 'string' ? JSON.parse(body) : body
      );
      
      if (validationError) {
        console.warn('Response validation failed:', validationError);
        // Log but don't block response in non-production
      }
    } catch (error) {
      console.error('Response validation error:', error);
    }
    
    return originalSend.call(this, body);
  };

  next();
};

/**
 * API testing endpoint middleware
 */
export const apiTestingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only allow in development/sandbox
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.path === '/api/test/generate-cases') {
    const testCases = validationService.generateTestCases();
    return res.json({
      test_cases: testCases,
      generated_at: new Date().toISOString(),
      total_cases: testCases.length
    });
  }

  next();
};

/**
 * Contract testing helper
 */
export class ContractTester {
  private validationService = validationService;

  /**
   * Test API endpoint against contract
   */
  async testEndpoint(
    method: string,
    path: string,
    request: any,
    expectedStatusCode: number
  ): Promise<{
    passed: boolean;
    errors: string[];
    actualResponse?: any;
  }> {
    const errors: string[] = [];

    try {
      // This would make an actual HTTP request in a real implementation
      const mockResponse = await this.makeTestRequest(method, path, request);
      
      if (mockResponse.statusCode !== expectedStatusCode) {
        errors.push(`Expected status ${expectedStatusCode}, got ${mockResponse.statusCode}`);
      }

      // Validate response format
      const mockReq = { 
        method, 
        path, 
        params: request.params || {},
        query: request.query || {},
        body: request.body,
        headers: { 'x-request-id': 'test-request' },
        apiSpec: { method, path, responses: {} }
      } as ValidationRequest;

      const mockRes = { statusCode: mockResponse.statusCode } as Response;
      
      const responseValidation = this.validationService.validateResponse(
        mockReq, 
        mockRes, 
        mockResponse.body
      );
      
      if (responseValidation) {
        errors.push(`Response validation failed: ${responseValidation.message}`);
      }

      return {
        passed: errors.length === 0,
        errors,
        actualResponse: mockResponse.body
      };

    } catch (error) {
      return {
        passed: false,
        errors: [`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Mock test request (replace with actual HTTP client)
   */
  private async makeTestRequest(method: string, path: string, request: any) {
    // This is a mock implementation
    // In reality, this would make HTTP requests to your API
    return {
      statusCode: 200,
      body: {
        message: 'Mock response for testing',
        method,
        path,
        request
      }
    };
  }

  /**
   * Run all contract tests
   */
  async runAllTests(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: any[];
  }> {
    const testCases = this.validationService.generateTestCases();
    const results = [];
    let passedTests = 0;

    for (const testCase of testCases) {
      const result = await this.testEndpoint(
        testCase.method,
        testCase.path,
        testCase.validRequest,
        200 // Expected success status
      );

      if (result.passed) {
        passedTests++;
      }

      results.push({
        name: testCase.name,
        description: testCase.description,
        passed: result.passed,
        errors: result.errors
      });
    }

    return {
      totalTests: testCases.length,
      passedTests,
      failedTests: testCases.length - passedTests,
      results
    };
  }
}

export { validationService };