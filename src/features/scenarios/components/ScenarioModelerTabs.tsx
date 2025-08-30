/**
 * Tab navigation component for Scenario Modeler
 */

import React from 'react';
import {
  ChartBarSquareIcon,
  CompareIcon,
  Cog8ToothIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';

export type TabType = 'modeling' | 'results' | 'comparison' | 'sensitivity';

interface Tab {
  id: TabType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  disabled?: boolean;
}

interface ScenarioModelerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasActiveScenario: boolean;
  hasResults: boolean;
}

export const ScenarioModelerTabs: React.FC<ScenarioModelerTabsProps> = ({
  activeTab,
  onTabChange,
  hasActiveScenario,
  hasResults
}) => {
  const tabs: Tab[] = [
    {
      id: 'modeling',
      name: 'Modeling',
      icon: Cog8ToothIcon,
      description: 'Configure funding rounds and exit scenarios'
    },
    {
      id: 'results',
      name: 'Results',
      icon: ChartBarSquareIcon,
      description: 'View calculated scenario results',
      disabled: !hasResults
    },
    {
      id: 'comparison',
      name: 'Comparison',
      icon: CompareIcon,
      description: 'Compare multiple scenarios',
      disabled: !hasResults
    },
    {
      id: 'sensitivity',
      name: 'Sensitivity',
      icon: PresentationChartLineIcon,
      description: 'Analyze parameter sensitivity',
      disabled: !hasResults
    }
  ];

  return (
    <div className="mt-6">
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as TabType)}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id} disabled={tab.disabled}>
              {tab.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="hidden sm:block">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;
            
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && onTabChange(tab.id)}
                className={`
                  group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : isDisabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                disabled={isDisabled}
                title={tab.description}
              >
                <Icon 
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive
                      ? 'text-blue-500'
                      : isDisabled
                      ? 'text-gray-400'
                      : 'text-gray-400 group-hover:text-gray-500'
                    }
                  `}
                  aria-hidden="true"
                />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};