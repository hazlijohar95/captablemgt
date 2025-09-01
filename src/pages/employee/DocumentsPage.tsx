import React from 'react';
import { DocumentCenter } from '@/components/Employee/DocumentCenter';

const DocumentsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Documents
          </h1>
          <p className="text-gray-600">
            Access and download your equity-related documents
          </p>
        </div>

        {/* Document Center Component */}
        <DocumentCenter />
      </div>
    </div>
  );
};

export default DocumentsPage;