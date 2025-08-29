import { describe, it, expect } from 'vitest';
import { computeVested, generateVestingSchedule } from './vesting';
import { VestingFrequency } from '@/types';
import vestingGoldenData from '@/testdata/golden/vesting.basic.gold.json';

describe('Vesting Calculator', () => {
  describe('computeVested - golden tests', () => {
    vestingGoldenData.testCases.forEach((testCase) => {
      it(testCase.name, () => {
        const { input, expectedVested } = testCase;
        const result = computeVested(
          input.units,
          {
            ...input.schedule,
            frequency: input.schedule.frequency as VestingFrequency,
          },
          new Date(input.asOf)
        );
        
        expect(result).toBe(expectedVested);
      });
    });
  });
  
  describe('generateVestingSchedule', () => {
    it('should generate complete 4-year monthly vesting schedule', () => {
      const units = 48000;
      const schedule = {
        start: '2025-01-01',
        cliffMonths: 12,
        durationMonths: 48,
        frequency: VestingFrequency.MONTHLY,
      };
      
      const events = generateVestingSchedule(units, schedule);
      
      // Should have 48 vesting events (monthly over 4 years)
      expect(events.length).toBe(37); // 1 cliff + 36 monthly
      
      // First event should be at cliff with 25%
      expect(events[0].date).toEqual(new Date('2026-01-01'));
      expect(events[0].cumulativeVested).toBe(12000); // 25% of 48000
      
      // Last event should vest everything
      const lastEvent = events[events.length - 1];
      expect(lastEvent.cumulativeVested).toBe(48000);
    });
    
    it('should handle quarterly vesting', () => {
      const units = 100000;
      const schedule = {
        start: '2025-01-01',
        cliffMonths: 12,
        durationMonths: 48,
        frequency: VestingFrequency.QUARTERLY,
      };
      
      const events = generateVestingSchedule(units, schedule);
      
      // Should have 16 vesting events (quarterly over 4 years)
      expect(events.length).toBe(13); // 1 cliff + 12 quarterly
      
      // Verify quarterly increments after cliff
      if (events.length > 1) {
        const secondEvent = events[1];
        expect(secondEvent.date).toEqual(new Date('2026-04-01'));
      }
    });
    
    it('should handle immediate vesting (no cliff)', () => {
      const units = 12000;
      const schedule = {
        start: '2025-01-01',
        cliffMonths: 0,
        durationMonths: 12,
        frequency: VestingFrequency.MONTHLY,
      };
      
      const events = generateVestingSchedule(units, schedule);
      
      // Should vest monthly from the start (first vesting after first period)
      expect(events[0].date).toEqual(new Date('2025-02-01'));
      expect(events[0].vestedUnits).toBe(1000); // 1/12 of total
    });
  });
});