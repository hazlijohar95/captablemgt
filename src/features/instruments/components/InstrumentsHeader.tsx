import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { InstrumentsHeaderProps } from '../types';

export function InstrumentsHeader({ onIssueNew, stats }: InstrumentsHeaderProps) {
  return (
    <div className="sm:flex sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Instruments
        </h1>
        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
          <p className="text-sm text-gray-500">
            Manage securities, stock options, and other instruments
          </p>
          {stats && (
            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
              <DocumentTextIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />
              {stats.active_securities} active instruments
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <Button
          onClick={onIssueNew}
          variant="primary"
          className="flex items-center hover:bg-indigo-700 transition-colors duration-200"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
          Issue Securities
        </Button>
      </div>
    </div>
  );
}