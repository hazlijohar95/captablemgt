/**
 * Mobile-optimized scenario editor with bottom sheets and gesture support
 * Implements mobile-first UX patterns for complex scenario modeling
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  XMarkIcon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  PlusIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { FinancialInput } from '@/components/forms/FinancialInput';
import { FormSection, FormGrid } from '@/components/forms/ProgressiveForm';
import { EnhancedRoundScenario, ExitScenario } from '../../types/scenarioModeling';

export interface MobileScenarioEditorProps {
  scenario: {
    fundingRounds: EnhancedRoundScenario[];
    exitScenarios: ExitScenario[];
  };
  onUpdateRound: (index: number, updates: Partial<EnhancedRoundScenario>) => void;
  onUpdateExit: (index: number, updates: Partial<ExitScenario>) => void;
  onAddRound: () => void;
  onAddExit: () => void;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '80vh'
}) => {
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY === null) return;
    
    const deltaY = e.touches[0].clientY - dragStartY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  }, [dragStartY]);

  const handleTouchEnd = useCallback(() => {
    if (currentY > 100) {
      onClose();
    }
    setDragStartY(null);
    setCurrentY(0);
  }, [currentY, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform"
        style={{
          maxHeight,
          transform: `translateY(${currentY}px)`
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </>
  );
};

interface AccordionItemProps {
  title: string;
  subtitle?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  subtitle,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  children
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onToggle}
          className="flex-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-medium text-gray-900 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            
            <div className="ml-3 flex items-center space-x-2">
              {(onEdit || onDelete) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Actions"
                >
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
              )}
              
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Actions menu */}
      {showActions && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex space-x-3">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onEdit();
                  setShowActions(false);
                }}
                className="flex-1"
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  onDelete();
                  setShowActions(false);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isExpanded && children && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

export const MobileScenarioEditor: React.FC<MobileScenarioEditorProps> = ({
  scenario,
  onUpdateRound,
  onUpdateExit,
  onAddRound,
  onAddExit
}) => {
  const [activeSection, setActiveSection] = useState<'funding' | 'exits'>('funding');
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [expandedExit, setExpandedExit] = useState<number | null>(null);
  const [editingRound, setEditingRound] = useState<{ index: number; round: EnhancedRoundScenario } | null>(null);
  const [editingExit, setEditingExit] = useState<{ index: number; exit: ExitScenario } | null>(null);

  const formatCurrency = (cents: number) => `$${(cents / 100000000).toFixed(1)}M`;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveSection('funding')}
            className={`flex-1 py-4 text-center font-medium ${
              activeSection === 'funding'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Funding Rounds ({scenario.fundingRounds.length})
          </button>
          <button
            onClick={() => setActiveSection('exits')}
            className={`flex-1 py-4 text-center font-medium ${
              activeSection === 'exits'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Exit Scenarios ({scenario.exitScenarios.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'funding' && (
          <div className="bg-white">
            {scenario.fundingRounds.map((round, index) => (
              <AccordionItem
                key={index}
                title={round.name}
                subtitle={`${formatCurrency(round.investmentAmount)} at ${formatCurrency(round.preMoney)} pre-money`}
                isExpanded={expandedRound === index}
                onToggle={() => setExpandedRound(expandedRound === index ? null : index)}
                onEdit={() => setEditingRound({ index, round })}
                onDelete={() => {
                  // Handle delete
                }}
              >
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">Price per share:</span>
                      <p className="font-medium">${(round.pricePerShare / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Share class:</span>
                      <p className="font-medium">{round.shareClass}</p>
                    </div>
                  </div>
                  
                  {round.antiDilutionType && round.antiDilutionType !== 'NONE' && (
                    <div>
                      <span className="text-gray-500">Anti-dilution:</span>
                      <p className="font-medium">{round.antiDilutionType}</p>
                    </div>
                  )}
                </div>
              </AccordionItem>
            ))}
            
            {/* Add round button */}
            <div className="p-4">
              <Button
                onClick={onAddRound}
                variant="outline"
                className="w-full"
                leftIcon={<PlusIcon className="h-5 w-5" />}
              >
                Add Funding Round
              </Button>
            </div>
          </div>
        )}

        {activeSection === 'exits' && (
          <div className="bg-white">
            {scenario.exitScenarios.map((exit, index) => (
              <AccordionItem
                key={exit.id}
                title={exit.name}
                subtitle={`${formatCurrency(exit.exitValue)} ${exit.exitType}`}
                isExpanded={expandedExit === index}
                onToggle={() => setExpandedExit(expandedExit === index ? null : index)}
                onEdit={() => setEditingExit({ index, exit })}
                onDelete={() => {
                  // Handle delete
                }}
              >
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">Timeframe:</span>
                      <p className="font-medium">{exit.timeframe || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Probability:</span>
                      <p className="font-medium">{exit.probability ? `${(exit.probability * 100).toFixed(0)}%` : 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </AccordionItem>
            ))}
            
            {/* Add exit button */}
            <div className="p-4">
              <Button
                onClick={onAddExit}
                variant="outline"
                className="w-full"
                leftIcon={<PlusIcon className="h-5 w-5" />}
              >
                Add Exit Scenario
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Round editor bottom sheet */}
      <BottomSheet
        isOpen={!!editingRound}
        onClose={() => setEditingRound(null)}
        title="Edit Funding Round"
      >
        {editingRound && (
          <div className="space-y-6">
            <FormGrid columns={1} gap="md">
              <FinancialInput
                label="Investment Amount"
                value={editingRound.round.investmentAmount}
                onChange={(value) => onUpdateRound(editingRound.index, { investmentAmount: value })}
                displayFormat="millions"
                required
              />
              
              <FinancialInput
                label="Pre-money Valuation"
                value={editingRound.round.preMoney}
                onChange={(value) => onUpdateRound(editingRound.index, { preMoney: value })}
                displayFormat="millions"
                required
              />
              
              <FinancialInput
                label="Price per Share"
                value={editingRound.round.pricePerShare}
                onChange={(value) => onUpdateRound(editingRound.index, { pricePerShare: value })}
                displayFormat="dollars"
                required
              />
            </FormGrid>

            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => setEditingRound(null)}
                className="w-full"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Exit editor bottom sheet */}
      <BottomSheet
        isOpen={!!editingExit}
        onClose={() => setEditingExit(null)}
        title="Edit Exit Scenario"
      >
        {editingExit && (
          <div className="space-y-6">
            <FormGrid columns={1} gap="md">
              <FinancialInput
                label="Exit Value"
                value={editingExit.exit.exitValue}
                onChange={(value) => onUpdateExit(editingExit.index, { exitValue: value })}
                displayFormat="millions"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exit Type
                </label>
                <select
                  value={editingExit.exit.exitType}
                  onChange={(e) => onUpdateExit(editingExit.index, { 
                    exitType: e.target.value as 'IPO' | 'ACQUISITION' | 'MERGER' | 'LIQUIDATION'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACQUISITION">Acquisition</option>
                  <option value="IPO">IPO</option>
                  <option value="MERGER">Merger</option>
                  <option value="LIQUIDATION">Liquidation</option>
                </select>
              </div>
            </FormGrid>

            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => setEditingExit(null)}
                className="w-full"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};