import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> & {
  Header: React.FC<PageHeaderProps>;
  Section: React.FC<PageSectionProps>;
} = ({ children }) => {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, children }) => {
  return (
    <>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <div className="mt-1 text-sm text-gray-500">{description}</div>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
      {children}
    </>
  );
};

const PageSection: React.FC<PageSectionProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

PageLayout.Header = PageHeader;
PageLayout.Section = PageSection;