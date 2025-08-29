import { useAuth } from '@/features/auth/AuthContext';
import { rolePermissions, RolePermissions, UserRole } from '../types';

interface UseUserPermissionsReturn extends RolePermissions {
  userRole: UserRole | null;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  hasAnyPermission: (permissions: Array<keyof RolePermissions>) => boolean;
  hasAllPermissions: (permissions: Array<keyof RolePermissions>) => boolean;
}

export function useUserPermissions(): UseUserPermissionsReturn {
  const { } = useAuth();
  
  // For demo purposes, we'll assume the user is an owner
  // In a real app, this would come from user metadata or a separate API call
  const userRole: UserRole = 'owner'; // user?.user_metadata?.role || 'viewer';
  
  const permissions = rolePermissions[userRole];
  
  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission];
  };
  
  const hasAnyPermission = (permissionsList: Array<keyof RolePermissions>): boolean => {
    return permissionsList.some(permission => permissions[permission]);
  };
  
  const hasAllPermissions = (permissionsList: Array<keyof RolePermissions>): boolean => {
    return permissionsList.every(permission => permissions[permission]);
  };
  
  return {
    ...permissions,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}