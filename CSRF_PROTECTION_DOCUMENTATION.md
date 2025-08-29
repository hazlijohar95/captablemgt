# CSRF Protection Implementation for Cap Table Management Platform

## Overview

This document describes the comprehensive Cross-Site Request Forgery (CSRF) protection implementation for the Cap Table Management Platform. CSRF protection is critical for preventing unauthorized state-changing operations, especially for financial transactions involving equity management.

## Security Rationale

CSRF attacks can exploit authenticated sessions to perform unauthorized actions on behalf of users. In a financial platform like ours, this could lead to:

- Unauthorized issuance of securities
- Fraudulent stakeholder creation
- Manipulation of cap table data
- Unauthorized financial transactions

Our CSRF protection implements a **double-submit cookie pattern** with server-side validation for maximum security.

## Architecture Overview

### Components

1. **CSRFService** - Core token generation, validation, and storage
2. **useCSRFProtection** - React hook for component-level CSRF handling
3. **useCSRFForm** - Specialized hook for form CSRF protection
4. **CSRFMiddleware** - Automatic CSRF protection for Supabase operations
5. **Integration** - Service-level CSRF validation for critical operations

### Security Features

- **Cryptographically secure tokens** (256-bit random values)
- **Time-based token expiration** (30 minutes)
- **Automatic token refresh** (25-minute intervals)
- **Constant-time comparison** (prevents timing attacks)
- **Server-side validation** with audit trail
- **Rate limiting** for financial transactions
- **Context-aware validation** per company
- **Security event logging**

## Implementation Details

### 1. CSRFService (`/src/services/csrfService.ts`)

The core service provides:

```typescript
// Token generation and retrieval
const token = await CSRFService.getToken();

// Token validation
await CSRFService.validateToken(token, companyId);

// Financial transaction protection
await CSRFService.validateFinancialTransaction(
  token, 
  'ISSUE', 
  companyId, 
  payload
);
```

**Key Features:**
- Generates 64-character hex tokens using `crypto.getRandomValues()`
- Stores token hashes (never plaintext) in database for validation
- Implements automatic cleanup of expired tokens
- Provides context-aware validation for multi-tenant security

### 2. React Hooks (`/src/hooks/useCSRFProtection.tsx`)

#### useCSRFProtection Hook

```typescript
const csrf = useCSRFProtection();

// Hook provides:
// - token: Current CSRF token
// - loading: Initialization state
// - error: Error messages
// - isReady: Ready for use
// - refreshToken(): Manual refresh
// - validateToken(): Validation method
// - getCSRFHeaders(): Headers for API calls
```

#### useCSRFForm Hook

```typescript
const csrf = useCSRFForm();

// Form-specific methods:
// - prepareSubmission(): Validates and adds CSRF token
// - getFormDataWithCSRF(): Adds token to form data
```

**Usage Pattern:**
```typescript
const handleSubmit = async (formData) => {
  const secureFormData = await csrf.prepareSubmission(formData, companyId);
  await apiCall(secureFormData);
};
```

### 3. Middleware Protection (`/src/services/csrfMiddleware.ts`)

Automatically protects Supabase operations:

```typescript
// Automatically initialized with Supabase client
initializeCSRFMiddleware(supabase);

// Protected tables: stakeholders, securities, transactions, people, grants
// Protected operations: INSERT, UPDATE, DELETE, UPSERT
```

**Features:**
- Transparent integration with Supabase client
- Automatic detection of critical financial operations
- Contextual validation based on table and operation type
- Security event logging for failed operations

### 4. Service Integration

#### CapTableService Integration

```typescript
// All critical operations require CSRF tokens
await capTableService.createStakeholder({
  companyId,
  // ... other data
  csrfToken: await csrf.getToken()
});

await capTableService.issueSecurity({
  // ... security data
  csrfToken: await csrf.getToken()
});
```

## Protected Operations

### Financial Transactions (High Priority)
- Securities issuance (`issueSecurity`)
- Stakeholder creation (`createStakeholder`)
- Grant creation (`createGrant`)
- Transaction recording (`createTransaction`)

### Sensitive Data Operations (Medium Priority)
- Person record creation (`createPerson`)
- Role assignment changes
- Company data modifications

### Token Requirements by Operation Type

| Operation Type | CSRF Required | Validation Level |
|---|---|---|
| Securities Operations | ✅ Required | Financial Transaction |
| Stakeholder Management | ✅ Required | Financial Transaction |
| User Management | ✅ Required | Standard Token |
| Read Operations | ❌ Not Required | None |
| Company Setup | ✅ Required | Standard Token |

## Security Validation Levels

### 1. Standard Token Validation
```typescript
await CSRFService.validateToken(token, companyId);
```
- Validates token existence and expiration
- Checks against session storage
- Verifies database token hash

### 2. Financial Transaction Validation
```typescript
await CSRFService.validateFinancialTransaction(
  token, 
  transactionType, 
  companyId, 
  payload
);
```
- All standard validation checks
- Rate limiting enforcement
- Company access verification
- Audit trail logging
- Payload integrity verification

## Implementation Examples

### 1. Form Component with CSRF Protection

```typescript
import { useCSRFForm } from '@/hooks/useCSRFProtection';

export function SecureForm() {
  const csrf = useCSRFForm();
  const { companyId } = useCompanyContext();

  const handleSubmit = async (formData) => {
    try {
      // Automatically validates CSRF and adds token
      const secureData = await csrf.prepareSubmission(formData, companyId);
      await apiService.createRecord(secureData);
    } catch (error) {
      // Handle CSRF validation errors
      if (error instanceof CSRFError) {
        // Show CSRF-specific error handling
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* CSRF Status Indicators */}
      {!csrf.isReady && <LoadingIndicator />}
      {csrf.hasError && <ErrorMessage error={csrf.error} />}
      
      {/* Form fields */}
      <button type="submit" disabled={!csrf.isReady}>
        Submit
      </button>
    </form>
  );
}
```

### 2. API Service with CSRF Integration

```typescript
import { CSRFService } from '@/services/csrfService';

export class SecureAPIService {
  async performFinancialOperation(data, companyId) {
    // Get current CSRF token
    const csrfToken = await CSRFService.getToken();
    
    // Validate for financial transaction
    await CSRFService.validateFinancialTransaction(
      csrfToken,
      'ISSUE',
      companyId,
      data
    );

    // Perform operation with CSRF token
    return await this.client
      .from('securities')
      .insert({ ...data, csrfToken });
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Token generation and validation
- Hook behavior and error handling
- Middleware integration
- Service method protection

### 2. Integration Tests
- End-to-end form submission workflows
- API protection across all services
- Error scenarios and recovery
- Token refresh cycles

### 3. Security Tests
- CSRF attack simulation
- Token tampering detection
- Timing attack prevention
- Session hijacking protection

## Error Handling

### Error Types
```typescript
class CSRFError extends Error {
  name: 'CSRFError'
  message: string
}
```

### Common Error Scenarios
1. **Token Missing**: User must refresh page or retry operation
2. **Token Expired**: Automatic refresh attempted
3. **Token Invalid**: Security incident logged, user authentication checked
4. **Rate Limit Exceeded**: Temporary operation blocking
5. **Company Access Denied**: Authorization failure

### Error Recovery
```typescript
try {
  await operation();
} catch (error) {
  if (error instanceof CSRFError) {
    // Attempt token refresh
    await csrf.refreshToken();
    // Retry operation once
    await operation();
  }
  throw error;
}
```

## Monitoring and Logging

### Security Events Logged
- Token generation and validation attempts
- Failed CSRF validations
- Rate limit violations
- Suspicious activity patterns
- Token refresh cycles

### Audit Trail
```typescript
// Example audit event
{
  actor_id: "user-uuid",
  company_id: "company-uuid", 
  timestamp: "2024-01-01T00:00:00.000Z",
  event_type: "csrf_validation_success",
  context: "financial_transaction",
  metadata: {
    token_hash: "sha256-hash",
    transaction_type: "ISSUE",
    payload_hash: "sha256-payload-hash"
  }
}
```

## Configuration

### Environment Variables
```bash
# No additional environment variables required
# CSRF service uses existing Supabase configuration
```

### Token Lifecycle Settings
```typescript
const TOKEN_EXPIRY_MINUTES = 30;        // Token validity period
const AUTO_REFRESH_MINUTES = 25;        // Auto-refresh interval
const RATE_LIMIT_WINDOW = 60;           // Rate limit window (seconds)
const FINANCIAL_RATE_LIMIT = 10;        // Max financial ops per window
```

## Performance Considerations

### Token Storage
- Session storage for client-side tokens (cleared on tab close)
- Database hash storage for server-side validation
- Automatic cleanup of expired tokens

### Validation Performance
- Constant-time string comparison
- Efficient database queries with proper indexing
- Minimal overhead for read operations

### Memory Management
- Automatic token cleanup on expiration
- Efficient hash storage in audit events table
- Session storage limits prevent memory leaks

## Security Best Practices

### Implementation Guidelines
1. **Always validate CSRF tokens** for state-changing operations
2. **Use financial validation** for critical business operations
3. **Implement proper error handling** with user-friendly messages
4. **Log security events** for monitoring and auditing
5. **Test thoroughly** including edge cases and attack scenarios

### Token Management
1. **Never log actual tokens** (only hashes)
2. **Use constant-time comparison** for validation
3. **Implement proper cleanup** of expired tokens
4. **Monitor for suspicious patterns** in validation failures

## Future Enhancements

### Planned Improvements
1. **Dynamic token expiration** based on session activity
2. **Enhanced rate limiting** with user-specific limits
3. **Advanced threat detection** using machine learning
4. **Token binding** to additional session attributes
5. **Cross-tab synchronization** for improved UX

### Integration Opportunities
1. **Content Security Policy** integration
2. **SameSite cookie** enhancement for additional protection
3. **Subresource Integrity** for static assets
4. **Feature Policy** restrictions

## Compliance and Standards

### Security Standards Compliance
- **OWASP Top 10** - Addresses A01:2021 (Broken Access Control)
- **NIST Cybersecurity Framework** - Implements PR.AC (Access Control)
- **SOC 2 Type II** - Security and availability controls
- **PCI DSS** (if applicable) - Requirement 6.3 (Secure Development)

### Regulatory Compliance
- **SOX** - Accurate financial reporting controls
- **GDPR** - Data protection through access control
- **CCPA** - Consumer data protection measures

## Troubleshooting

### Common Issues

#### 1. CSRF Token Not Ready
```typescript
// Symptoms: Form disabled, "Initializing security..." message
// Solution: Check network connectivity, verify Supabase configuration
if (!csrf.isReady) {
  // Wait for initialization or show appropriate message
}
```

#### 2. Token Validation Failures
```typescript
// Symptoms: "CSRF validation failed" errors
// Solution: Check token expiration, verify company access
if (csrf.hasError) {
  await csrf.refreshToken(); // Attempt recovery
}
```

#### 3. Rate Limiting
```typescript
// Symptoms: "Rate limit exceeded" errors
// Solution: Implement exponential backoff, reduce operation frequency
// Rate limits: 10 operations per minute for financial transactions
```

### Debug Tools
```typescript
// Enable CSRF debug logging
localStorage.setItem('csrf_debug', 'true');

// Check CSRF status
console.log('CSRF Status:', {
  token: csrf.token,
  ready: csrf.isReady,
  error: csrf.error
});
```

## Conclusion

The CSRF protection implementation provides comprehensive security for the Cap Table Management Platform through:

- **Multi-layered defense** with tokens, validation, and monitoring
- **Automatic integration** with minimal developer overhead  
- **Financial transaction focus** with enhanced validation for critical operations
- **Robust error handling** with graceful recovery mechanisms
- **Comprehensive testing** ensuring reliability and security

This implementation follows security best practices and provides enterprise-grade protection against CSRF attacks while maintaining excellent user experience and developer productivity.

---

**Document Version**: 1.0  
**Last Updated**: 2025-08-29  
**Next Review**: 2025-09-29  
**Owner**: Security Team  
**Classification**: Internal Use