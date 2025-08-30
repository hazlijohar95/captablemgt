/**
 * Comprehensive Scenario Modeling Page
 * Main page for advanced scenario modeling with integrated financial calculations
 */

import { ComprehensiveScenarioModeler } from '@/features/scenarios/components/ComprehensiveScenarioModeler';
import { ComprehensiveScenario } from '@/features/scenarios/types/scenarioModeling';

export function ComprehensiveScenarioPage() {
  const handleScenarioSave = (scenario: ComprehensiveScenario) => {
    // TODO: Implement scenario persistence
    console.log('Saving scenario:', scenario);
    // This would typically save to a database or local storage
  };

  const handleScenarioLoad = (scenarioId: string) => {
    // TODO: Implement scenario loading
    console.log('Loading scenario:', scenarioId);
    // This would typically load from a database or local storage
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ComprehensiveScenarioModeler
        onScenarioSave={handleScenarioSave}
        onScenarioLoad={handleScenarioLoad}
      />
    </div>
  );
}