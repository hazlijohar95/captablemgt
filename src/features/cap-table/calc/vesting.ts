import { IVestingSchedule, VestingFrequency } from '@/types';
import { differenceInMonths, addMonths, startOfDay } from 'date-fns';

/**
 * Computes vested units based on time-based vesting schedule
 * Pure function following PRD §6.2 pseudocode
 */
export function computeVested(
  units: number,
  schedule: IVestingSchedule,
  asOf: Date
): number {
  const start = new Date(schedule.start);
  const asOfDate = startOfDay(asOf);
  const startDate = startOfDay(start);
  
  // Before cliff, nothing is vested
  const cliffDate = addMonths(startDate, schedule.cliffMonths);
  if (asOfDate < cliffDate) {
    return 0;
  }
  
  const elapsed = differenceInMonths(asOfDate, startDate);
  
  // Convert frequency to months
  const frequencyMonths = getFrequencyInMonths(schedule.frequency);
  
  // Calculate vested periods
  const totalPeriods = Math.floor(schedule.durationMonths / frequencyMonths);
  const vestedPeriods = Math.min(
    Math.floor(elapsed / frequencyMonths),
    totalPeriods
  );
  
  // Calculate vested units (round down to nearest whole unit)
  const vestedUnits = Math.floor(units * (vestedPeriods * frequencyMonths) / schedule.durationMonths);
  
  return vestedUnits;
}

/**
 * Computes unvested units
 */
export function computeUnvested(
  units: number,
  schedule: IVestingSchedule,
  asOf: Date
): number {
  return units - computeVested(units, schedule, asOf);
}

/**
 * Computes next vesting date
 */
export function getNextVestingDate(
  schedule: IVestingSchedule,
  asOf: Date
): Date | null {
  const start = new Date(schedule.start);
  const asOfDate = startOfDay(asOf);
  const startDate = startOfDay(start);
  
  // If vesting hasn't started yet, next date is cliff date
  const cliffDate = addMonths(startDate, schedule.cliffMonths);
  if (asOfDate < cliffDate) {
    return cliffDate;
  }
  
  // Calculate end of vesting
  const endDate = addMonths(startDate, schedule.durationMonths);
  if (asOfDate >= endDate) {
    return null; // Fully vested
  }
  
  // Find next vesting date based on frequency
  const frequencyMonths = getFrequencyInMonths(schedule.frequency);
  const elapsed = differenceInMonths(asOfDate, startDate);
  const nextPeriod = Math.floor(elapsed / frequencyMonths) + 1;
  const nextDate = addMonths(startDate, nextPeriod * frequencyMonths);
  
  return nextDate <= endDate ? nextDate : endDate;
}

/**
 * Generates complete vesting schedule
 */
export function generateVestingSchedule(
  units: number,
  schedule: IVestingSchedule
): Array<{ date: Date; vestedUnits: number; cumulativeVested: number }> {
  const events: Array<{ date: Date; vestedUnits: number; cumulativeVested: number }> = [];
  const start = new Date(schedule.start);
  const frequencyMonths = getFrequencyInMonths(schedule.frequency);
  
  // First vesting event
  let firstVestingDate: Date;
  let previousVested = 0;
  
  if (schedule.cliffMonths > 0) {
    // First vesting at cliff
    firstVestingDate = addMonths(start, schedule.cliffMonths);
    const cliffVested = computeVested(units, schedule, firstVestingDate);
    if (cliffVested > 0) {
      events.push({
        date: firstVestingDate,
        vestedUnits: cliffVested,
        cumulativeVested: cliffVested,
      });
      previousVested = cliffVested;
    }
  } else {
    // No cliff - first vesting at first frequency period
    firstVestingDate = addMonths(start, frequencyMonths);
    const firstVested = computeVested(units, schedule, firstVestingDate);
    if (firstVested > 0) {
      events.push({
        date: firstVestingDate,
        vestedUnits: firstVested,
        cumulativeVested: firstVested,
      });
      previousVested = firstVested;
    }
  }
  
  // Subsequent vesting events
  let currentDate = addMonths(firstVestingDate, frequencyMonths);
  
  while (currentDate <= addMonths(start, schedule.durationMonths)) {
    const currentVested = computeVested(units, schedule, currentDate);
    const periodVested = currentVested - previousVested;
    
    if (periodVested > 0) {
      events.push({
        date: currentDate,
        vestedUnits: periodVested,
        cumulativeVested: currentVested,
      });
    }
    
    previousVested = currentVested;
    currentDate = addMonths(currentDate, frequencyMonths);
  }
  
  return events;
}

/**
 * Helper to convert frequency enum to months
 */
function getFrequencyInMonths(frequency: VestingFrequency): number {
  switch (frequency) {
    case VestingFrequency.MONTHLY:
      return 1;
    case VestingFrequency.QUARTERLY:
      return 3;
    case VestingFrequency.ANNUALLY:
      return 12;
    default:
      throw new Error(`Unknown vesting frequency: ${frequency}`);
  }
}