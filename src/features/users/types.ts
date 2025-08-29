export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'pending' | 'suspended';
  lastActive: Date;
  createdAt: Date;
  invitedBy?: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
  message?: string;
}

export interface RolePermissions {
  canViewCapTable: boolean;
  canEditCapTable: boolean;
  canIssueGrants: boolean;
  canManageStakeholders: boolean;
  canRunScenarios: boolean;
  canGenerateDocuments: boolean;
  canManageUsers: boolean;
  canManageCompany: boolean;
  canViewReports: boolean;
  canExportData: boolean;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  owner: {
    canViewCapTable: true,
    canEditCapTable: true,
    canIssueGrants: true,
    canManageStakeholders: true,
    canRunScenarios: true,
    canGenerateDocuments: true,
    canManageUsers: true,
    canManageCompany: true,
    canViewReports: true,
    canExportData: true
  },
  admin: {
    canViewCapTable: true,
    canEditCapTable: true,
    canIssueGrants: true,
    canManageStakeholders: true,
    canRunScenarios: true,
    canGenerateDocuments: true,
    canManageUsers: true,
    canManageCompany: false,
    canViewReports: true,
    canExportData: true
  },
  editor: {
    canViewCapTable: true,
    canEditCapTable: true,
    canIssueGrants: true,
    canManageStakeholders: true,
    canRunScenarios: true,
    canGenerateDocuments: true,
    canManageUsers: false,
    canManageCompany: false,
    canViewReports: true,
    canExportData: false
  },
  viewer: {
    canViewCapTable: true,
    canEditCapTable: false,
    canIssueGrants: false,
    canManageStakeholders: false,
    canRunScenarios: true,
    canGenerateDocuments: false,
    canManageUsers: false,
    canManageCompany: false,
    canViewReports: true,
    canExportData: false
  }
};

export const roleDescriptions: Record<UserRole, string> = {
  owner: 'Full access to all features and company management',
  admin: 'Can manage cap table, users, and all features except company settings',
  editor: 'Can edit cap table, issue grants, and run scenarios',
  viewer: 'Read-only access to cap table and reports'
};