import { useState } from 'react';
import { 
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { User, UserInvitation, UserRole, roleDescriptions } from '../types';
import { InviteUserModal } from './InviteUserModal';
import { EditUserModal } from './EditUserModal';

// Mock data for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    email: 'alice@company.com',
    fullName: 'Alice Johnson',
    role: 'owner',
    status: 'active',
    lastActive: new Date('2024-01-15'),
    createdAt: new Date('2023-06-01')
  },
  {
    id: '2',
    email: 'bob@company.com',
    fullName: 'Bob Chen',
    role: 'admin',
    status: 'active',
    lastActive: new Date('2024-01-14'),
    createdAt: new Date('2023-08-15')
  },
  {
    id: '3',
    email: 'carol@company.com',
    fullName: 'Carol Williams',
    role: 'editor',
    status: 'active',
    lastActive: new Date('2024-01-13'),
    createdAt: new Date('2023-11-20')
  }
];

const mockInvitations: UserInvitation[] = [
  {
    id: '1',
    email: 'david@company.com',
    role: 'viewer',
    invitedBy: 'alice@company.com',
    invitedAt: new Date('2024-01-10'),
    expiresAt: new Date('2024-01-17'),
    status: 'pending'
  }
];

export function UserManagement() {
  const [users] = useState<User[]>(mockUsers);
  const [invitations] = useState<UserInvitation[]>(mockInvitations);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'editor': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage team members and their access to your cap table
            </p>
          </div>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Invite User</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Invites</dt>
                <dd className="text-lg font-medium text-gray-900">{invitations.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {users.filter(u => u.role === 'admin' || u.role === 'owner').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Today</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {users.filter(u => 
                    new Date(u.lastActive).toDateString() === new Date().toDateString()
                  ).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Pending Invitations</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <ClockIcon className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited {invitation.invitedAt.toLocaleDateString()} • Expires {invitation.expiresAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(invitation.role)}`}>
                    {invitation.role}
                  </span>
                  <button className="text-primary-600 hover:text-primary-700 text-sm">
                    Resend
                  </button>
                  <button className="text-red-600 hover:text-red-700 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {roleDescriptions[user.role]}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActive.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <EllipsisHorizontalIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isInviteModalOpen && (
        <InviteUserModal isOpen={true} onClose={() => setIsInviteModalOpen(false)} />
      )}
      
      {editingUser && (
        <EditUserModal 
          isOpen={true} 
          user={editingUser}
          onClose={() => setEditingUser(null)} 
        />
      )}
    </div>
  );
}