/**
 * Type definitions for dilution scenarios and waterfall analysis
 */

import { ShareholderPosition, RoundScenario, DilutionResult } from '@/features/scenarios/calc/dilution';

export interface ScenarioResultsProps {
  results: DilutionResult[];
  scenarios: RoundScenario[];
  initialPositions: ShareholderPosition[];
}

export interface DilutionChartProps {
  results: DilutionResult[];
  scenarios: RoundScenario[];
}

export interface UpcomingVestingEvent {
  id: string;
  stakeholderName: string;
  nextVestingDate: string;
  vestingAmount: number;
  totalShares: number;
  vestedShares: number;
  scheduleType: string;
}

export interface VestingGrant {
  id: string;
  stakeholder_id: string;
  security_type: string;
  grant_date: string;
  vesting_start_date: string;
  cliff_months: number;
  vesting_period_months: number;
  quantity: number;
  strike_price?: number;
  vesting_schedules?: VestingSchedule[];
  stakeholders?: {
    id: string;
    people?: { name: string } | null;
    entity_name?: string | null;
  };
}

export interface VestingSchedule {
  id: string;
  grant_id: string;
  vesting_date: string;
  shares_vested: number;
  cumulative_shares_vested: number;
}

export interface VestingDashboardData {
  grants: VestingGrant[];
  schedules: VestingSchedule[];
  totalVested: number;
  totalUnvested: number;
  upcomingEvents: UpcomingVestingEvent[];
}