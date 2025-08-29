// Quick debug script to understand actual calculation results
import { calculateDilution } from './src/features/scenarios/calc/dilution.js';

const currentPositions = [
  {
    id: 'founder-1',
    name: 'Alice Founder',
    shares: 8000000,
    shareClass: 'COMMON',
    pricePerShare: 100
  },
  {
    id: 'founder-2', 
    name: 'Bob Founder',
    shares: 2000000,
    shareClass: 'COMMON',
    pricePerShare: 100
  }
];

const scenario = {
  name: 'Series A',
  preMoney: 1000000000, // $10M
  investmentAmount: 500000000, // $5M
  pricePerShare: 150, // $1.50
  shareClass: 'PREFERRED',
  optionPoolIncrease: 10, // 10%
  includeConversion: false
};

try {
  const result = calculateDilution(currentPositions, scenario);
  console.log('Post-round new shares:', result.postRound.newSharesIssued);
  console.log('Post-round total shares:', result.postRound.totalShares);
  console.log('Alice percentage:', result.postRound.shareholderPositions.find(p => p.id === 'founder-1')?.percentage);
  console.log('Full result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}