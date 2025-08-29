// Core types for the Cap Table Management Platform
// All monetary values are stored as strings to avoid floating-point errors

export type Money = string;
export type ULID = string;
export type ISODate = string;

// Enums
export enum SecurityType {
  EQUITY = 'EQUITY',
  OPTION = 'OPTION',
  RSU = 'RSU',
  WARRANT = 'WARRANT',
  SAFE = 'SAFE',
  NOTE = 'NOTE',
}

export enum ShareClassType {
  COMMON = 'COMMON',
  PREFERRED = 'PREFERRED',
}

export enum VestingFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

export enum StakeholderType {
  FOUNDER = 'FOUNDER',
  INVESTOR = 'INVESTOR',
  EMPLOYEE = 'EMPLOYEE',
  ENTITY = 'ENTITY',
}

export enum RoundType {
  SEED = 'SEED',
  SERIES_A = 'SERIES_A',
  SERIES_B = 'SERIES_B',
  SERIES_C = 'SERIES_C',
  SERIES_D = 'SERIES_D',
  SERIES_E = 'SERIES_E',
  BRIDGE = 'BRIDGE',
  OTHER = 'OTHER',
}

export enum TransactionKind {
  ISSUE = 'ISSUE',
  TRANSFER = 'TRANSFER',
  CANCEL = 'CANCEL',
  CONVERT = 'CONVERT',
  EXERCISE = 'EXERCISE',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  INVESTOR = 'INVESTOR',
  AUDITOR = 'AUDITOR',
}

// Core Interfaces
export interface ICompany {
  id: ULID;
  name: string;
  country: string;
  currency: string;
  fiscalYearStart: number; // Month (1-12)
  settings: ICompanySettings;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ICompanySettings {
  roundingPolicy: 'BANKERS' | 'TRUNCATE' | 'ROUND_UP';
  shareDecimalPlaces: number;
  currencyDecimalPlaces: number;
  timezone: string;
  defaultExerciseWindow: number; // days
  defaultVestingSchedule?: IVestingSchedule;
}

export interface IPerson {
  id: ULID;
  name: string;
  email: string;
  phone?: string;
  address?: IAddress;
}

export interface IAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IStakeholder {
  id: ULID;
  companyId: ULID;
  personId?: ULID;
  entityName?: string;
  type: StakeholderType;
  taxId?: string;
  createdAt: ISODate;
}

export interface IShareClass {
  id: ULID;
  companyId: ULID;
  name: string;
  type: ShareClassType;
  authorized: number;
  parValue: Money;
  preferenceTerms?: IPreferenceTerms;
  seniorityRank?: number;
  createdAt: ISODate;
}

export interface IPreferenceTerms {
  liquidationPreference: Money;
  preferenceMultiple: number;
  participating: boolean;
  participationCap?: Money;
  cumulativeDividend?: number; // percentage
  conversionRatio: number;
  antiDilution?: 'BROAD_BASED' | 'NARROW_BASED' | 'FULL_RATCHET';
}

export interface ISecurity {
  id: ULID;
  companyId: ULID;
  stakeholderId: ULID;
  classId?: ULID;
  type: SecurityType;
  quantity: number;
  issuedAt: ISODate;
  cancelledAt?: ISODate;
  terms?: ISecurityTerms;
}

export interface ISecurityTerms {
  // For Options/Warrants
  strikePrice?: Money;
  expirationDate?: ISODate;
  
  // For SAFEs
  cap?: Money;
  discount?: number;
  mfn?: boolean;
  postMoney?: boolean;
  
  // For Convertible Notes
  principal?: Money;
  interestRate?: number;
  compounding?: 'SIMPLE' | 'COMPOUND';
  maturityDate?: ISODate;
}

export interface IGrant {
  id: ULID;
  securityId: ULID;
  planId: ULID;
  strikePrice: Money;
  vestingScheduleId: ULID;
  grantDate: ISODate;
  fairMarketValue?: Money;
}

export interface IVestingSchedule {
  id?: ULID;
  start: ISODate;
  cliffMonths: number;
  durationMonths: number;
  frequency: VestingFrequency;
  acceleration?: IAcceleration;
}

export interface IAcceleration {
  singleTrigger?: boolean;
  doubleTrigger?: boolean;
  percentageAccelerated?: number;
}

export interface IVestingEvent {
  id: ULID;
  grantId: ULID;
  date: ISODate;
  quantity: number;
  type: 'VEST' | 'FORFEIT' | 'ACCELERATE';
}

export interface IRound {
  id: ULID;
  companyId: ULID;
  name: string;
  type: RoundType;
  preMoney: Money;
  investment: Money;
  targetPostPoolPct: number;
  pps?: Money;
  closedAt?: ISODate;
  status: 'DRAFT' | 'CLOSED';
}

export interface ITransaction {
  id: ULID;
  companyId: ULID;
  kind: TransactionKind;
  effectiveAt: ISODate;
  payload: any; // Transaction-specific data
  actorId: ULID;
  requestId: string; // Idempotency key
  createdAt: ISODate;
}

export interface IAuditEvent {
  id: ULID;
  actorId: ULID;
  companyId: ULID;
  timestamp: ISODate;
  before: any;
  after: any;
  hash: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IRoleAssignment {
  id: ULID;
  companyId: ULID;
  personId: ULID;
  role: UserRole;
  scopes: string[];
  createdAt: ISODate;
}

// Calculator Types
export interface IRoundInput {
  preMoney: Money;
  investment: Money;
  targetPostPoolPct: number;
  s0FdShares: number;
}

export interface IRoundOutput {
  poolTopUp: number;
  pps: Money;
  investorShares: number;
}

export interface ISAFEInput {
  investment: Money;
  cap?: Money;
  discount?: number;
  roundPps: Money;
  postMoneyCapBasis: number;
}

export interface ISAFEOutput {
  shares: number;
  price: Money;
}

export interface INoteInput {
  principal: Money;
  rate: number;
  compounding: 'SIMPLE' | 'COMPOUND';
  start: Date;
  asOf: Date;
}

export interface INoteOutput {
  accrued: Money;
  total: Money;
}

export interface IWaterfallClass {
  id: string;
  name: string;
  seniority: number;
  prefMultiple: number;
  participating: boolean;
  cap?: Money;
  asConverted: number;
}

export interface IWaterfallInput {
  enterpriseValue: Money;
  classes: IWaterfallClass[];
  commonAsConverted: number;
}

export interface IWaterfallPayout {
  classId: string;
  className: string;
  preferenceAmount: Money;
  participationAmount: Money;
  commonAmount: Money;
  totalAmount: Money;
  perShare: Money;
}

// API Response Types
export interface ICapTableResponse {
  companyId: ULID;
  asOf: ISODate;
  mode: 'FD' | 'AS_CONVERTED' | 'OUTSTANDING';
  totals: {
    common: number;
    preferred: number;
    optionsGranted: number;
    poolUnallocated: number;
  };
  stakeholders: ICapTableStakeholder[];
}

export interface ICapTableStakeholder {
  stakeholderId: ULID;
  name: string;
  asConverted: number;
  ownershipPct: number;
  securities: {
    common?: number;
    preferred?: number;
    options?: number;
    rsus?: number;
    warrants?: number;
    safes?: number;
    notes?: number;
  };
}