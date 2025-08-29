import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardHeader } from '@/components/ui';
import { 
  PlusIcon, 
  UserPlusIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Modals that would be imported from their respective feature directories
import { IssueGrantModal } from './modals/IssueGrantModal';
import { AddStakeholderModal } from '@/features/stakeholders/components/AddStakeholderModal';
import { DataImportModal } from './modals/DataImportModal';

export function QuickActions() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const quickActions = [
    {
      id: 'issue-grant',
      title: 'Issue Grant',
      description: 'Create stock options or equity grants',
      icon: PlusIcon,
      action: () => setActiveModal('issue-grant'),
      color: 'bg-primary-500',
      primary: true
    },
    {
      id: 'add-stakeholder',
      title: 'Add Stakeholder',
      description: 'Invite team members or investors',
      icon: UserPlusIcon,
      action: () => setActiveModal('add-stakeholder'),
      color: 'bg-blue-500'
    },
    {
      id: 'model-round',
      title: 'Model Round',
      description: 'Simulate funding scenarios',
      icon: ChartBarIcon,
      action: () => navigate('/scenarios'),
      color: 'bg-green-500'
    },
    {
      id: 'generate-docs',
      title: 'Generate Documents',
      description: 'Create certificates and agreements',
      icon: DocumentTextIcon,
      action: () => navigate('/documents'),
      color: 'bg-purple-500'
    },
    {
      id: 'import-data',
      title: 'Import Data',
      description: 'Upload from CSV or other platforms',
      icon: ArrowUpTrayIcon,
      action: () => setActiveModal('import-data'),
      color: 'bg-orange-500'
    },
    {
      id: 'company-settings',
      title: 'Company Settings',
      description: 'Manage company information',
      icon: CogIcon,
      action: () => navigate('/admin'),
      color: 'bg-gray-500'
    }
  ];

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <Card noPadding>
        <CardHeader 
          title="Quick Actions"
          description="Frequently used features and tools"
          icon={<SparklesIcon className="h-5 w-5 text-gray-400" />}
        />
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className={`group relative p-4 border rounded-lg text-left hover:shadow-sm transition-all duration-200 ${
                  action.primary 
                    ? 'border-primary-300 bg-primary-50 hover:bg-primary-100 hover:border-primary-400' 
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${action.color} bg-opacity-10`}>
                    <action.icon className={`h-5 w-5 ${action.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium ${
                      action.primary ? 'text-primary-900' : 'text-gray-900'
                    } group-hover:text-primary-600`}>
                      {action.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Modals */}
      {activeModal === 'issue-grant' && (
        <IssueGrantModal isOpen={true} onClose={closeModal} />
      )}
      
      {activeModal === 'add-stakeholder' && (
        <AddStakeholderModal 
          isOpen={true} 
          onClose={closeModal} 
          onSuccess={closeModal}
        />
      )}
      
      {activeModal === 'import-data' && (
        <DataImportModal isOpen={true} onClose={closeModal} />
      )}
    </>
  );
}