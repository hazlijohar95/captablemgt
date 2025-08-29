import { useState } from 'react';
import { 
  DocumentTextIcon, 
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { documentTemplates, documentCategories, DocumentGeneration, DocumentTemplate } from '../types';
import { GenerateDocumentModal } from './GenerateDocumentModal';

// Mock generated documents for demonstration
const mockGeneratedDocs: DocumentGeneration[] = [
  {
    id: '1',
    templateId: 'stock-cert',
    name: 'Stock Certificate - Alice Johnson',
    status: 'ready',
    data: { holderName: 'Alice Johnson', shareCount: 500000, shareClass: 'Common' },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    createdBy: 'admin@company.com',
    downloadUrl: '/docs/cert-001.pdf',
    signatureRequired: false
  },
  {
    id: '2',
    templateId: 'option-grant',
    name: 'Option Agreement - Bob Chen',
    status: 'generating',
    data: { granteeName: 'Bob Chen', optionShares: 25000, exercisePrice: 1.50 },
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
    createdBy: 'admin@company.com',
    signatureRequired: true
  },
  {
    id: '3',
    templateId: '409a-report',
    name: 'Q1 2024 409A Valuation',
    status: 'ready',
    data: { valuationDate: '2024-01-01', fairMarketValue: 2.50, valuationMethod: 'Market Approach' },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'admin@company.com',
    downloadUrl: '/docs/409a-q1-2024.pdf',
    signatureRequired: false
  }
];

export function DocumentLibrary() {
  const [activeTab, setActiveTab] = useState<'templates' | 'generated'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generatingTemplate, setGeneratingTemplate] = useState<DocumentTemplate | null>(null);
  const [generatedDocs] = useState<DocumentGeneration[]>(mockGeneratedDocs);

  const filteredTemplates = documentTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredGeneratedDocs = generatedDocs.filter(doc => {
    const template = documentTemplates.find(t => t.id === doc.templateId);
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'signed': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Equity Instruments': 'bg-blue-100 text-blue-800',
      'Corporate Resolutions': 'bg-purple-100 text-purple-800',
      'Reports & Valuations': 'bg-green-100 text-green-800',
      'Tax Elections': 'bg-orange-100 text-orange-800',
      'Legal Agreements': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Document Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate, manage, and organize your cap table documents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                <dd className="text-lg font-medium text-gray-900">{generatedDocs.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Ready to Download</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {generatedDocs.filter(d => d.status === 'ready').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Signature</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {generatedDocs.filter(d => d.signatureRequired && d.status === 'ready').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Templates Available</dt>
                <dd className="text-lg font-medium text-gray-900">{documentTemplates.length}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Document Templates
          </button>
          <button
            onClick={() => setActiveTab('generated')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generated'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Generated Documents ({generatedDocs.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'templates' ? 'Search templates...' : 'Search documents...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            {activeTab === 'templates' && (
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Categories</option>
                  {documentCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'templates' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-8 w-8 text-primary-600" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                  </div>
                </div>
                {template.isRequired && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Required
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {template.fields.length} fields
                </span>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGeneratingTemplate(template)}
                    className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 flex items-center space-x-1"
                  >
                    <PlusIcon className="h-3 w-3" />
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGeneratedDocs.map((doc) => {
                  const template = documentTemplates.find(t => t.id === doc.templateId);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                            <div className="text-sm text-gray-500">{template?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex w-fit px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </span>
                          {doc.signatureRequired && (
                            <span className="text-xs text-orange-600">Signature Required</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.createdBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {doc.status === 'ready' && doc.downloadUrl && (
                            <button className="text-primary-600 hover:text-primary-900">
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button className="text-primary-600 hover:text-primary-900">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Document Modal */}
      {generatingTemplate && (
        <GenerateDocumentModal
          isOpen={true}
          template={generatingTemplate}
          onClose={() => setGeneratingTemplate(null)}
        />
      )}
    </div>
  );
}