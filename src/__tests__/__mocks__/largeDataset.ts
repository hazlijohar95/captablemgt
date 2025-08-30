/**
 * Mock data generators for performance testing
 * Creates realistic large datasets for testing pagination and virtualization
 */

export interface MockStakeholder {
  id: string;
  type: 'INDIVIDUAL' | 'ENTITY';
  entity_name?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  people?: {
    name: string;
    email: string;
  };
  securities?: Array<{
    count: number;
  }>;
  deleted_at?: string | null;
}

export interface MockSecurity {
  id: string;
  stakeholder_id: string;
  type: string;
  status: string;
  shares: number;
  issue_date: string;
  strike_price?: number;
  share_class_id?: string;
  created_at: string;
  updated_at: string;
  stakeholder: {
    id: string;
    type: string;
    company_id: string;
    entity_name?: string;
    people?: {
      name: string;
      email: string;
    };
  };
  vesting_schedules?: Array<{
    id: string;
    commencement_date: string;
    cliff_months: number;
    vesting_months: number;
    total_shares: number;
  }>;
  share_class?: {
    id: string;
    name: string;
    seniority_rank: number;
  };
  deleted_at?: string | null;
}

// Sample names and companies for realistic data
const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kate', 'Luke', 'Mary', 'Noah', 'Olivia', 'Peter',
  'Quinn', 'Rachel', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xander',
  'Yvonne', 'Zoe', 'Alex', 'Blake', 'Chris', 'Dana', 'Eli', 'Fiona'
];

const LAST_NAMES = [
  'Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris',
  'Ivanov', 'Johnson', 'Kim', 'Lee', 'Miller', 'Nguyen', 'O\'Connor', 'Patel',
  'Quinn', 'Rodriguez', 'Smith', 'Taylor', 'Upton', 'Volkov', 'Williams', 'Xu',
  'Yang', 'Zhang', 'Abbott', 'Baker', 'Carter', 'Diaz', 'Ellis', 'Freeman'
];

const ENTITY_SUFFIXES = ['LLC', 'Inc', 'Corp', 'LP', 'LLP', 'Foundation', 'Trust', 'Holdings'];
const ENTITY_PREFIXES = [
  'Acme', 'Global', 'Premier', 'Elite', 'Strategic', 'Dynamic', 'Innovative', 'Advanced',
  'Superior', 'Prime', 'Excellence', 'Pinnacle', 'Apex', 'Zenith', 'Vanguard', 'Stellar'
];

const SECURITY_TYPES = [
  'COMMON_STOCK',
  'PREFERRED_STOCK',
  'STOCK_OPTION',
  'RSU',
  'WARRANT',
  'SAFE',
  'CONVERTIBLE_NOTE'
];

const SECURITY_STATUSES = ['ACTIVE', 'CANCELLED', 'EXERCISED', 'EXPIRED', 'VESTED'];

const SHARE_CLASSES = [
  { name: 'Common', seniority: 1 },
  { name: 'Series A', seniority: 2 },
  { name: 'Series B', seniority: 3 },
  { name: 'Series C', seniority: 4 },
  { name: 'Preferred', seniority: 5 }
];

/**
 * Generate a random string ID
 */
function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}${timestamp}_${random}`;
}

/**
 * Generate a random date within a range
 */
function randomDate(start: Date = new Date(2020, 0, 1), end: Date = new Date()): string {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime).toISOString();
}

/**
 * Generate a random name
 */
function generatePersonName(): { name: string; email: string } {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`;
  return { name, email };
}

/**
 * Generate a random entity name
 */
function generateEntityName(): string {
  const prefix = ENTITY_PREFIXES[Math.floor(Math.random() * ENTITY_PREFIXES.length)];
  const suffix = ENTITY_SUFFIXES[Math.floor(Math.random() * ENTITY_SUFFIXES.length)];
  const number = Math.random() > 0.7 ? ` ${Math.floor(Math.random() * 999) + 1}` : '';
  return `${prefix}${number} ${suffix}`;
}

/**
 * Generate a single mock stakeholder
 */
function generateStakeholder(index: number, companyId: string = 'test-company'): MockStakeholder {
  const type = Math.random() > 0.3 ? 'INDIVIDUAL' : 'ENTITY';
  const createdAt = randomDate(new Date(2020, 0, 1), new Date());
  const updatedAt = randomDate(new Date(createdAt), new Date());
  
  const stakeholder: MockStakeholder = {
    id: generateId('stakeholder_'),
    type,
    company_id: companyId,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: Math.random() > 0.95 ? randomDate() : null, // 5% deleted
    securities: Array(Math.floor(Math.random() * 3) + 1).fill({ count: 1 }) // 1-3 securities
  };

  if (type === 'INDIVIDUAL') {
    stakeholder.people = generatePersonName();
  } else {
    stakeholder.entity_name = generateEntityName();
  }

  return stakeholder;
}

/**
 * Generate a single mock security
 */
function generateSecurity(stakeholder: MockStakeholder): MockSecurity {
  const type = SECURITY_TYPES[Math.floor(Math.random() * SECURITY_TYPES.length)];
  const status = SECURITY_STATUSES[Math.floor(Math.random() * SECURITY_STATUSES.length)];
  const shareClass = SHARE_CLASSES[Math.floor(Math.random() * SHARE_CLASSES.length)];
  const shares = Math.floor(Math.random() * 50000) + 1000; // 1K to 50K shares
  const issueDate = randomDate(new Date(stakeholder.created_at), new Date());
  
  const security: MockSecurity = {
    id: generateId('security_'),
    stakeholder_id: stakeholder.id,
    type,
    status,
    shares,
    issue_date: issueDate,
    created_at: stakeholder.created_at,
    updated_at: randomDate(new Date(issueDate), new Date()),
    share_class_id: generateId('class_'),
    stakeholder: {
      id: stakeholder.id,
      type: stakeholder.type,
      company_id: stakeholder.company_id,
      entity_name: stakeholder.entity_name,
      people: stakeholder.people
    },
    share_class: {
      id: generateId('class_'),
      name: shareClass.name,
      seniority_rank: shareClass.seniority
    },
    deleted_at: Math.random() > 0.98 ? randomDate() : null // 2% deleted
  };

  // Add strike price for options
  if (type === 'STOCK_OPTION') {
    security.strike_price = Math.floor(Math.random() * 1000) + 50; // $0.50 to $10.00 in cents
  }

  // Add vesting schedule for equity compensation
  if (['STOCK_OPTION', 'RSU'].includes(type) && Math.random() > 0.3) {
    security.vesting_schedules = [{
      id: generateId('vesting_'),
      commencement_date: issueDate,
      cliff_months: Math.random() > 0.5 ? 12 : 0, // 50% have 1-year cliff
      vesting_months: [36, 48, 60][Math.floor(Math.random() * 3)], // 3, 4, or 5 years
      total_shares: shares
    }];
  }

  return security;
}

/**
 * Generate a large dataset of stakeholders for performance testing
 */
export function generateLargeStakeholderDataset(
  count: number,
  companyId: string = 'test-company'
): MockStakeholder[] {
  const stakeholders: MockStakeholder[] = [];
  
  for (let i = 0; i < count; i++) {
    stakeholders.push(generateStakeholder(i, companyId));
  }
  
  return stakeholders;
}

/**
 * Generate a large dataset of securities for performance testing
 */
export function generateLargeSecuritiesDataset(
  stakeholders: MockStakeholder[],
  securitiesPerStakeholder: number = 2
): MockSecurity[] {
  const securities: MockSecurity[] = [];
  
  stakeholders.forEach(stakeholder => {
    const securityCount = Math.floor(Math.random() * securitiesPerStakeholder) + 1;
    for (let i = 0; i < securityCount; i++) {
      securities.push(generateSecurity(stakeholder));
    }
  });
  
  return securities;
}

/**
 * Generate realistic cap table data with proper distributions
 */
export function generateRealisticCapTableData(stakeholderCount: number) {
  // Realistic distribution: 70% individuals, 30% entities
  const individualCount = Math.floor(stakeholderCount * 0.7);
  const entityCount = stakeholderCount - individualCount;
  
  const individuals = Array(individualCount).fill(null).map((_, i) => 
    generateStakeholder(i, 'test-company')
  ).map(s => ({ ...s, type: 'INDIVIDUAL' as const }));
  
  const entities = Array(entityCount).fill(null).map((_, i) => 
    generateStakeholder(i + individualCount, 'test-company')
  ).map(s => ({ ...s, type: 'ENTITY' as const, people: undefined }));
  
  const allStakeholders = [...individuals, ...entities];
  
  // Generate securities with realistic distribution
  const allSecurities = generateLargeSecuritiesDataset(allStakeholders, 2);
  
  return {
    stakeholders: allStakeholders,
    securities: allSecurities,
    summary: {
      totalStakeholders: stakeholderCount,
      totalSecurities: allSecurities.length,
      individuals: individualCount,
      entities: entityCount,
      totalShares: allSecurities.reduce((sum, sec) => sum + sec.shares, 0)
    }
  };
}

/**
 * Performance benchmark helper
 */
export function benchmarkFunction<T>(
  name: string,
  fn: () => T,
  iterations: number = 1
): { result: T; averageTime: number; totalTime: number } {
  const startTime = performance.now();
  let result: T;
  
  for (let i = 0; i < iterations; i++) {
    result = fn();
  }
  
  const totalTime = performance.now() - startTime;
  const averageTime = totalTime / iterations;
  
  console.log(`Benchmark [${name}]: ${averageTime.toFixed(2)}ms average (${iterations} iterations)`);
  
  return {
    result: result!,
    averageTime,
    totalTime
  };
}