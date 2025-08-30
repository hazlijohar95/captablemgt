/**
 * Optimized calculations hook with memoization and debouncing
 * Prevents unnecessary recalculations and improves performance
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { ComprehensiveScenario, ComprehensiveScenarioResult } from '../types/scenarioModeling';
import { ShareholderPosition } from '../calc/dilution';
import { ComprehensiveScenarioEngine } from '../calc/comprehensiveScenarioEngine';

interface UseOptimizedCalculationsProps {
  scenario: ComprehensiveScenario | null;
  currentPositions: ShareholderPosition[];
  engine: ComprehensiveScenarioEngine;
  debounceMs?: number;
}

interface UseOptimizedCalculationsReturn {
  result: ComprehensiveScenarioResult | null;
  isCalculating: boolean;
  error: string | null;
  calculate: () => Promise<void>;
  scheduleCalculation: () => void;
  cancelPendingCalculations: () => void;
}

export function useOptimizedCalculations({
  scenario,
  currentPositions,
  engine,
  debounceMs = 500
}: UseOptimizedCalculationsProps): UseOptimizedCalculationsReturn {
  const [result, setResult] = useState<ComprehensiveScenarioResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const calculationIdRef = useRef<string | null>(null);

  // Memoize scenario hash for change detection
  const scenarioHash = useMemo(() => {
    if (!scenario) return null;
    return JSON.stringify({
      fundingRounds: scenario.fundingRounds,
      exitScenarios: scenario.exitScenarios,
      positionsCount: currentPositions.length,
      positionsHash: currentPositions.map(p => `${p.id}-${p.shares}`).join(',')
    });
  }, [scenario, currentPositions]);

  // Core calculation function
  const calculate = useCallback(async () => {
    if (!scenario || currentPositions.length === 0) {
      setResult(null);
      setError(null);
      return;
    }

    // Cancel any pending calculation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const calculationId = Math.random().toString(36);
    calculationIdRef.current = calculationId;

    setIsCalculating(true);
    setError(null);

    try {
      // Check if calculation was cancelled
      if (abortController.signal.aborted) {
        return;
      }

      const calculationResult = await engine.calculateComprehensiveScenario(
        scenario,
        currentPositions
      );

      // Only update if this is still the current calculation
      if (calculationIdRef.current === calculationId && !abortController.signal.aborted) {
        setResult(calculationResult);
        setError(null);
      }
    } catch (err) {
      // Only update error if this is still the current calculation
      if (calculationIdRef.current === calculationId && !abortController.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Calculation failed';
        setError(errorMessage);
        setResult(null);
      }
    } finally {
      // Only update loading state if this is still the current calculation
      if (calculationIdRef.current === calculationId && !abortController.signal.aborted) {
        setIsCalculating(false);
      }
    }
  }, [scenario, currentPositions, engine]);

  // Debounced calculation for auto-triggers
  const debouncedCalculate = useMemo(
    () => debounce(calculate, debounceMs),
    [calculate, debounceMs]
  );

  // Schedule a debounced calculation
  const scheduleCalculation = useCallback(() => {
    debouncedCalculate();
  }, [debouncedCalculate]);

  // Cancel pending calculations
  const cancelPendingCalculations = useCallback(() => {
    debouncedCalculate.cancel();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [debouncedCalculate]);

  // Auto-calculate when scenario hash changes
  useEffect(() => {
    if (scenarioHash) {
      scheduleCalculation();
    } else {
      setResult(null);
      setError(null);
    }

    return () => {
      cancelPendingCalculations();
    };
  }, [scenarioHash, scheduleCalculation, cancelPendingCalculations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPendingCalculations();
    };
  }, [cancelPendingCalculations]);

  return {
    result,
    isCalculating,
    error,
    calculate,
    scheduleCalculation,
    cancelPendingCalculations
  };
}