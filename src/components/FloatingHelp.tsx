import { useState } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { HelpCenter } from './HelpCenter';

export function FloatingHelp() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors z-40"
        title="Get Help"
      >
        <QuestionMarkCircleIcon className="h-6 w-6" />
      </button>

      {/* Help Center Modal */}
      <HelpCenter isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}