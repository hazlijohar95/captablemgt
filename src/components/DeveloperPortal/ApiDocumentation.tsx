import React, { useState } from 'react';
import { 
  Book, 
  Copy, 
  CheckCircle, 
  ExternalLink,
  FileText,
  Zap,
  Shield,
  Globe
} from 'lucide-react';

interface CodeExample {
  language: string;
  code: string;
  description?: string;
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
  examples: CodeExample[];
}

interface DocumentationSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2 rounded-t-lg">
        <span className="text-sm font-medium">{language}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center text-sm text-gray-300 hover:text-white"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const EndpointCard: React.FC<{ endpoint: ApiEndpoint }> = ({ endpoint }) => {
  const [activeTab, setActiveTab] = useState('request');

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodColor(endpoint.method)}`}>
            {endpoint.method}
          </span>
          <code className="text-lg font-mono text-gray-900">{endpoint.path}</code>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mt-2">{endpoint.summary}</h3>
        <p className="text-gray-600 mt-1">{endpoint.description}</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('request')}
            className={`pb-2 border-b-2 font-medium ${
              activeTab === 'request'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Request
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`pb-2 border-b-2 font-medium ${
              activeTab === 'response'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Response
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            className={`pb-2 border-b-2 font-medium ${
              activeTab === 'examples'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Examples
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'request' && (
          <div className="space-y-4">
            {endpoint.parameters && endpoint.parameters.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Parameters</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Required</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {endpoint.parameters.map((param, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 font-mono text-sm">{param.name}</td>
                          <td className="px-4 py-2 text-sm">{param.type}</td>
                          <td className="px-4 py-2 text-sm">
                            {param.required ? (
                              <span className="text-red-600">Yes</span>
                            ) : (
                              <span className="text-gray-500">No</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {endpoint.requestBody && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Request Body</h4>
                <CodeBlock 
                  code={JSON.stringify(endpoint.requestBody, null, 2)} 
                  language="json" 
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'response' && (
          <div className="space-y-4">
            {Object.entries(endpoint.responses).map(([status, response]) => (
              <div key={status}>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Status {status}
                </h4>
                <CodeBlock 
                  code={JSON.stringify(response, null, 2)} 
                  language="json" 
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="space-y-6">
            {endpoint.examples.map((example, index) => (
              <div key={index}>
                {example.description && (
                  <p className="text-gray-600 mb-2">{example.description}</p>
                )}
                <CodeBlock code={example.code} language={example.language} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ApiDocumentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections: DocumentationSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Getting Started</h2>
            <p className="text-lg text-gray-600 mb-6">
              Welcome to the CapTable Management API. This comprehensive API allows you to manage cap tables, 
              stakeholders, securities, and generate reports programmatically.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center mb-3">
                <Zap className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Quick Start</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Get up and running in minutes with our sandbox environment and sample data.
              </p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center mb-3">
                <Shield className="w-6 h-6 text-green-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Secure by Default</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Enterprise-grade security with API key authentication and rate limiting.
              </p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center mb-3">
                <Globe className="w-6 h-6 text-purple-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Global Ready</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Support for multiple jurisdictions and compliance requirements.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Authentication</h3>
            <p className="text-gray-600 mb-4">
              All API requests require authentication using an API key. Include your API key in the Authorization header:
            </p>
            <CodeBlock 
              code={`curl -H "Authorization: Bearer ak_live_your_api_key_here" \\
  https://api.captable.com/v1/companies`}
              language="bash"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Base URLs</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li><strong>Production:</strong> https://api.captable.com/v1</li>
                  <li><strong>Sandbox:</strong> https://api.sandbox.captable.com/v1</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'endpoints',
      title: 'API Endpoints',
      content: (
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">API Endpoints</h2>
            <p className="text-lg text-gray-600 mb-8">
              Comprehensive API endpoints for managing your cap table data.
            </p>
          </div>

          {/* Company Management */}
          <section>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Company Management</h3>
            <div className="space-y-6">
              <EndpointCard endpoint={{
                method: 'GET',
                path: '/companies',
                summary: 'List Companies',
                description: 'Retrieve a paginated list of companies accessible to your API key.',
                parameters: [
                  { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
                  { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
                  { name: 'search', type: 'string', required: false, description: 'Search companies by name' }
                ],
                responses: {
                  '200': {
                    data: [
                      {
                        id: 'company-123',
                        name: 'TechStart Inc.',
                        jurisdiction: 'Delaware',
                        authorized_shares: 10000000,
                        outstanding_shares: 7500000,
                        created_at: '2024-01-01T00:00:00.000Z'
                      }
                    ],
                    pagination: {
                      page: 1,
                      limit: 20,
                      total: 1,
                      pages: 1
                    }
                  }
                },
                examples: [
                  {
                    language: 'curl',
                    description: 'List all companies',
                    code: `curl -H "Authorization: Bearer ak_live_your_api_key_here" \\
  "https://api.captable.com/v1/companies"`
                  },
                  {
                    language: 'javascript',
                    description: 'Using fetch API',
                    code: `const response = await fetch('https://api.captable.com/v1/companies', {
  headers: {
    'Authorization': 'Bearer ak_live_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`
                  },
                  {
                    language: 'python',
                    description: 'Using requests library',
                    code: `import requests

headers = {
    'Authorization': 'Bearer ak_live_your_api_key_here',
    'Content-Type': 'application/json'
}

response = requests.get('https://api.captable.com/v1/companies', headers=headers)
data = response.json()
print(data)`
                  }
                ]
              }} />

              <EndpointCard endpoint={{
                method: 'POST',
                path: '/companies',
                summary: 'Create Company',
                description: 'Create a new company with initial cap table structure.',
                requestBody: {
                  name: 'My Startup Inc.',
                  jurisdiction: 'Delaware',
                  incorporation_date: '2024-01-01',
                  authorized_shares: 10000000,
                  website: 'https://mystartup.com'
                },
                responses: {
                  '201': {
                    id: 'company-456',
                    name: 'My Startup Inc.',
                    jurisdiction: 'Delaware',
                    incorporation_date: '2024-01-01',
                    authorized_shares: 10000000,
                    outstanding_shares: 0,
                    website: 'https://mystartup.com',
                    created_at: '2024-12-31T12:00:00.000Z'
                  }
                },
                examples: [
                  {
                    language: 'curl',
                    code: `curl -X POST -H "Authorization: Bearer ak_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Startup Inc.",
    "jurisdiction": "Delaware",
    "authorized_shares": 10000000
  }' \\
  "https://api.captable.com/v1/companies"`
                  }
                ]
              }} />
            </div>
          </section>

          {/* Cap Table Operations */}
          <section>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Cap Table Operations</h3>
            <div className="space-y-6">
              <EndpointCard endpoint={{
                method: 'GET',
                path: '/companies/{companyId}/cap-table',
                summary: 'Get Cap Table',
                description: 'Retrieve the complete cap table for a company with ownership breakdown.',
                parameters: [
                  { name: 'companyId', type: 'string', required: true, description: 'Unique company identifier' },
                  { name: 'asOfDate', type: 'string', required: false, description: 'Calculate cap table as of specific date (YYYY-MM-DD)' },
                  { name: 'includeOptions', type: 'boolean', required: false, description: 'Include option pools in calculations (default: true)' }
                ],
                responses: {
                  '200': {
                    company_id: 'company-123',
                    as_of_date: '2024-12-31',
                    summary: {
                      total_authorized_shares: 10000000,
                      total_outstanding_shares: 7500000,
                      total_options_granted: 500000,
                      fully_diluted_shares: 8000000,
                      post_money_valuation: 50000000
                    },
                    holdings: [
                      {
                        stakeholder_id: 'stakeholder-1',
                        security_id: 'security-1',
                        share_class: 'Common',
                        quantity: 5000000,
                        ownership_percentage: 0.625
                      }
                    ]
                  }
                },
                examples: [
                  {
                    language: 'curl',
                    code: `curl -H "Authorization: Bearer ak_live_your_api_key_here" \\
  "https://api.captable.com/v1/companies/company-123/cap-table"`
                  }
                ]
              }} />
            </div>
          </section>

          {/* Stakeholder Management */}
          <section>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Stakeholder Management</h3>
            <div className="space-y-6">
              <EndpointCard endpoint={{
                method: 'POST',
                path: '/companies/{companyId}/stakeholders',
                summary: 'Create Stakeholder',
                description: 'Add a new stakeholder to the cap table.',
                parameters: [
                  { name: 'companyId', type: 'string', required: true, description: 'Unique company identifier' }
                ],
                requestBody: {
                  name: 'John Doe',
                  type: 'EMPLOYEE',
                  email: 'john.doe@example.com',
                  accredited_investor: false,
                  address: {
                    street1: '123 Main St',
                    city: 'San Francisco',
                    state: 'CA',
                    postal_code: '94105',
                    country: 'US'
                  }
                },
                responses: {
                  '201': {
                    id: 'stakeholder-456',
                    name: 'John Doe',
                    type: 'EMPLOYEE',
                    email: 'john.doe@example.com',
                    accredited_investor: false,
                    total_shares: 0,
                    ownership_percentage: 0,
                    created_at: '2024-12-31T12:00:00.000Z'
                  }
                },
                examples: [
                  {
                    language: 'javascript',
                    code: `const stakeholder = await fetch('https://api.captable.com/v1/companies/company-123/stakeholders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ak_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    type: 'EMPLOYEE',
    email: 'john.doe@example.com',
    accredited_investor: false
  })
});

const data = await stakeholder.json();`
                  }
                ]
              }} />
            </div>
          </section>
        </div>
      )
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Webhooks</h2>
            <p className="text-lg text-gray-600 mb-6">
              Set up webhooks to receive real-time notifications when events occur in your cap table.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-blue-900 mb-3">How Webhooks Work</h3>
            <ul className="text-blue-800 space-y-2">
              <li>• Configure webhook endpoints to receive HTTP POST requests</li>
              <li>• Subscribe to specific events like stakeholder creation or security issuance</li>
              <li>• Receive real-time updates as they happen in your cap table</li>
              <li>• Verify webhook authenticity using HMAC signatures</li>
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Available Events</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { event: 'company.created', description: 'A new company is created' },
                { event: 'company.updated', description: 'Company information is updated' },
                { event: 'stakeholder.created', description: 'A new stakeholder is added' },
                { event: 'stakeholder.updated', description: 'Stakeholder information is updated' },
                { event: 'security.issued', description: 'New shares or options are issued' },
                { event: 'security.exercised', description: 'Options are exercised' },
                { event: 'transaction.created', description: 'A new transaction is recorded' },
                { event: 'valuation.created', description: 'A new valuation is recorded' },
                { event: 'report.generated', description: 'A report generation is completed' }
              ].map(({ event, description }) => (
                <div key={event} className="border border-gray-200 p-4 rounded-lg">
                  <code className="text-sm font-mono text-blue-600">{event}</code>
                  <p className="text-sm text-gray-600 mt-1">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Webhook Payload Example</h3>
            <CodeBlock 
              code={`{
  "event_type": "stakeholder.created",
  "event_id": "evt_abc123def456",
  "company_id": "company-123",
  "timestamp": "2024-12-31T12:00:00.000Z",
  "data": {
    "stakeholder_id": "stakeholder-456",
    "name": "John Doe",
    "type": "EMPLOYEE",
    "email": "john.doe@example.com",
    "created_at": "2024-12-31T12:00:00.000Z"
  }
}`}
              language="json"
            />
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Verifying Webhooks</h3>
            <p className="text-gray-600 mb-4">
              Each webhook request includes a signature in the <code>X-Signature</code> header. 
              Verify this signature to ensure the request is from CapTable API:
            </p>
            
            <CodeBlock 
              code={`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}

// Usage
const isValid = verifyWebhook(
  JSON.stringify(req.body),
  req.headers['x-signature'],
  'your-webhook-secret'
);`}
              language="javascript"
            />
          </div>
        </div>
      )
    },
    {
      id: 'sdks',
      title: 'SDKs & Libraries',
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">SDKs & Libraries</h2>
            <p className="text-lg text-gray-600 mb-6">
              Official and community SDKs to integrate with the CapTable API in your preferred programming language.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'JavaScript/Node.js',
                status: 'Official',
                description: 'Full-featured SDK for JavaScript and Node.js applications',
                install: 'npm install @captable/sdk',
                docs: '/docs/sdks/javascript'
              },
              {
                name: 'Python',
                status: 'Official',
                description: 'Python SDK with async support and type hints',
                install: 'pip install captable-sdk',
                docs: '/docs/sdks/python'
              },
              {
                name: 'Ruby',
                status: 'Community',
                description: 'Ruby gem for Rails and other Ruby applications',
                install: 'gem install captable',
                docs: '/docs/sdks/ruby'
              },
              {
                name: 'PHP',
                status: 'Official',
                description: 'PHP SDK compatible with modern PHP frameworks',
                install: 'composer require captable/sdk',
                docs: '/docs/sdks/php'
              },
              {
                name: 'Go',
                status: 'Community',
                description: 'Go client library with full API coverage',
                install: 'go get github.com/captable/go-sdk',
                docs: '/docs/sdks/go'
              },
              {
                name: 'Java',
                status: 'Official',
                description: 'Java SDK for Spring Boot and other Java frameworks',
                install: 'Maven/Gradle available',
                docs: '/docs/sdks/java'
              }
            ].map((sdk) => (
              <div key={sdk.name} className="border border-gray-200 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{sdk.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    sdk.status === 'Official' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {sdk.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{sdk.description}</p>
                <div className="space-y-2">
                  <div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{sdk.install}</code>
                  </div>
                  <button className="flex items-center text-sm text-blue-600 hover:text-blue-700">
                    <FileText className="w-4 h-4 mr-1" />
                    View Documentation
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Quick Start Example</h3>
            <div className="space-y-4">
              <CodeBlock 
                code={`// Install the SDK
npm install @captable/sdk

// Initialize the client
import { CapTable } from '@captable/sdk';

const captable = new CapTable({
  apiKey: 'ak_live_your_api_key_here',
  environment: 'production' // or 'sandbox'
});

// List companies
const companies = await captable.companies.list();
console.log(companies);

// Get cap table
const capTable = await captable.companies.getCapTable('company-123');
console.log(capTable);

// Create a stakeholder
const stakeholder = await captable.stakeholders.create('company-123', {
  name: 'John Doe',
  type: 'EMPLOYEE',
  email: 'john@example.com'
});`}
                language="javascript"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Need an SDK?</h3>
            <p className="text-gray-600 mb-4">
              Don't see your preferred language? We're always working on new SDKs. 
              Let us know what you need or contribute to our open-source SDKs.
            </p>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Request SDK
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Contribute on GitHub
              </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Book className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">API Documentation</h1>
          </div>
          
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {sections.find(section => section.id === activeSection)?.content}
        </div>
      </div>
    </div>
  );
};