/**
 * Dilution Analysis Dashboard
 * Advanced dilution modeling and impact analysis interface
 */

import React, { useState, useEffect } from 'react';
import { 
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  CalculatorIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

import { 
  PageLayout, 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  StatCard,
  Badge,
  Input,
  Select,
  Modal
} from '@/components/ui';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { reportingService } from '@/services/reportingService';
import { 
  DilutionScenario,
  DilutionAnalysisResults,
  DilutionScenarioParameters
} from '@/types/reporting';
import { STAT_CARD_COLORS } from '@/constants';

interface ScenarioFormData {
  scenario_name: string;
  scenario_type: 'FUNDRAISING' | 'OPTION_POOL_EXPANSION' | 'CONVERSION' | 'CUSTOM';
  funding_amount: number;
  pre_money_valuation: number;
  new_shares_issued?: number;
  option_pool_increase?: number;
  conversion_trigger?: string;
  anti_dilution_provision?: 'NONE' | 'FULL_RATCHET' | 'WEIGHTED_AVERAGE_BROAD' | 'WEIGHTED_AVERAGE_NARROW';
}

export const DilutionAnalysisDashboard: React.FC = () => {
  const { companyId } = useCompanyContext();
  
  const [scenarios, setScenarios] = useState<DilutionScenario[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Map<string, DilutionAnalysisResults>>(new Map());
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const [formData, setFormData] = useState<ScenarioFormData>({
    scenario_name: '',
    scenario_type: 'FUNDRAISING',
    funding_amount: 0,
    pre_money_valuation: 0
  });

  useEffect(() => {
    loadScenarios();
  }, [companyId]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const scenarioList = await reportingService.getDilutionScenarios(companyId);
      setScenarios(scenarioList);

      // Load analysis results for each scenario
      const results = new Map<string, DilutionAnalysisResults>();
      for (const scenario of scenarioList) {
        if (scenario.analysis_results) {
          const analysis = await reportingService.getDilutionAnalysisResults(scenario.id);
          results.set(scenario.id, analysis);
        }
      }
      setAnalysisResults(results);

      if (scenarioList.length > 0 && !activeScenario) {
        setActiveScenario(scenarioList[0].id);
      }
    } catch (error) {
      console.error('Error loading dilution scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async () => {
    try {
      const parameters: DilutionScenarioParameters = {
        funding_amount: formData.funding_amount,
        pre_money_valuation: formData.pre_money_valuation,
        new_shares_issued: formData.new_shares_issued,
        option_pool_increase: formData.option_pool_increase,
        conversion_trigger: formData.conversion_trigger,
        anti_dilution_provision: formData.anti_dilution_provision || 'NONE'
      };

      const scenario = await reportingService.createDilutionScenario(
        companyId,
        formData.scenario_name,
        formData.scenario_type,
        parameters
      );

      setScenarios([...scenarios, scenario]);
      setActiveScenario(scenario.id);
      setShowCreateModal(false);
      setFormData({
        scenario_name: '',
        scenario_type: 'FUNDRAISING',
        funding_amount: 0,
        pre_money_valuation: 0
      });
    } catch (error) {
      console.error('Error creating dilution scenario:', error);
    }
  };

  const handleRunAnalysis = async (scenarioId: string) => {
    setAnalyzing(scenarioId);
    try {
      const results = await reportingService.analyzeDilutionImpact(scenarioId);
      setAnalysisResults(prev => new Map(prev.set(scenarioId, results)));
    } catch (error) {
      console.error('Error running dilution analysis:', error);
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      await reportingService.deleteDilutionScenario(scenarioId);
      setScenarios(scenarios.filter(s => s.id !== scenarioId));
      setAnalysisResults(prev => {
        const updated = new Map(prev);
        updated.delete(scenarioId);
        return updated;
      });
      
      if (activeScenario === scenarioId) {
        setActiveScenario(scenarios.length > 1 ? scenarios[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
    }
  };

  const handleDuplicateScenario = async (scenario: DilutionScenario) => {
    setFormData({
      scenario_name: `${scenario.scenario_name} (Copy)`,
      scenario_type: scenario.scenario_type,
      funding_amount: scenario.parameters.funding_amount,
      pre_money_valuation: scenario.parameters.pre_money_valuation,
      new_shares_issued: scenario.parameters.new_shares_issued,
      option_pool_increase: scenario.parameters.option_pool_increase,
      conversion_trigger: scenario.parameters.conversion_trigger,
      anti_dilution_provision: scenario.parameters.anti_dilution_provision
    });
    setShowCreateModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScenarioTypeColor = (type: string) => {
    switch (type) {
      case 'FUNDRAISING': return 'bg-blue-100 text-blue-800';
      case 'OPTION_POOL_EXPANSION': return 'bg-green-100 text-green-800';
      case 'CONVERSION': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeScenarioData = scenarios.find(s => s.id === activeScenario);
  const activeAnalysis = activeScenario ? analysisResults.get(activeScenario) : null;

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading dilution analysis...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayout.Header
        title="Dilution Analysis"
        description="Model funding scenarios and analyze ownership impact"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Scenario Management */}
        <Card>
          <CardHeader
            title="Dilution Scenarios"
            description="Manage and analyze different funding scenarios"
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    activeScenario === scenario.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveScenario(scenario.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{scenario.scenario_name}</h4>
                      <Badge className={`mt-1 ${getScenarioTypeColor(scenario.scenario_type)}`}>
                        {scenario.scenario_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateScenario(scenario);
                        }}
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScenario(scenario.id);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Funding:</span>
                      <span>{formatCurrency(scenario.parameters.funding_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pre-money:</span>
                      <span>{formatCurrency(scenario.parameters.pre_money_valuation)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500">
                      Created {formatDate(scenario.created_at)}
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunAnalysis(scenario.id);
                      }}
                      disabled={analyzing === scenario.id}
                    >
                      {analyzing === scenario.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <PlayIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {activeScenarioData && activeAnalysis && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Summary Metrics */}
            <Card>
              <CardHeader
                title={`Analysis: ${activeScenarioData.scenario_name}`}
                description="Impact summary and key metrics"
              />
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      title="Post-Money Valuation"
                      value={formatCurrency(activeAnalysis.post_money_valuation)}
                      icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
                      iconBgColor={STAT_CARD_COLORS.GREEN}
                      subtitle="After funding"
                    />
                    
                    <StatCard
                      title="New Shares Issued"
                      value={activeAnalysis.new_shares_issued.toLocaleString()}
                      icon={<ChartPieIcon className="h-5 w-5" />}
                      iconBgColor={STAT_CARD_COLORS.BLUE}
                      subtitle="Total new shares"
                    />
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Average Dilution Impact</h4>
                    <p className="text-2xl font-bold text-yellow-800">
                      {formatPercentage(activeAnalysis.average_dilution)}
                    </p>
                    <p className="text-sm text-yellow-700">
                      Across all existing shareholders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stakeholder Impact */}
            <Card>
              <CardHeader
                title="Stakeholder Impact"
                description="Individual dilution effects"
              />
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activeAnalysis.stakeholder_impact.map((impact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{impact.stakeholder_name}</h5>
                        <p className="text-sm text-gray-500">{impact.stakeholder_type}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          {impact.dilution_percentage > 0 ? (
                            <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                          ) : (
                            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                          )}
                          <span className={`font-medium ${
                            impact.dilution_percentage > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {impact.dilution_percentage > 0 ? '-' : '+'}{formatPercentage(Math.abs(impact.dilution_percentage))}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(impact.pre_dilution_ownership)} → {formatPercentage(impact.post_dilution_ownership)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Active Scenario */}
        {scenarios.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Dilution Scenarios
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first dilution scenario to analyze funding impact
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Scenario
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Scenario Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Dilution Scenario"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scenario Name
            </label>
            <Input
              value={formData.scenario_name}
              onChange={(e) => setFormData({ ...formData, scenario_name: e.target.value })}
              placeholder="e.g., Series A Funding"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scenario Type
            </label>
            <Select
              value={formData.scenario_type}
              onChange={(value) => setFormData({ ...formData, scenario_type: value as any })}
            >
              <Select.Option value="FUNDRAISING">Fundraising</Select.Option>
              <Select.Option value="OPTION_POOL_EXPANSION">Option Pool Expansion</Select.Option>
              <Select.Option value="CONVERSION">Conversion Event</Select.Option>
              <Select.Option value="CUSTOM">Custom Scenario</Select.Option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funding Amount ($)
              </label>
              <Input
                type="number"
                value={formData.funding_amount}
                onChange={(e) => setFormData({ ...formData, funding_amount: Number(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pre-Money Valuation ($)
              </label>
              <Input
                type="number"
                value={formData.pre_money_valuation}
                onChange={(e) => setFormData({ ...formData, pre_money_valuation: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anti-Dilution Protection
            </label>
            <Select
              value={formData.anti_dilution_provision || 'NONE'}
              onChange={(value) => setFormData({ ...formData, anti_dilution_provision: value as any })}
            >
              <Select.Option value="NONE">None</Select.Option>
              <Select.Option value="FULL_RATCHET">Full Ratchet</Select.Option>
              <Select.Option value="WEIGHTED_AVERAGE_BROAD">Weighted Average (Broad)</Select.Option>
              <Select.Option value="WEIGHTED_AVERAGE_NARROW">Weighted Average (Narrow)</Select.Option>
            </Select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateScenario}
              disabled={!formData.scenario_name || !formData.funding_amount}
            >
              Create Scenario
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

export default DilutionAnalysisDashboard;