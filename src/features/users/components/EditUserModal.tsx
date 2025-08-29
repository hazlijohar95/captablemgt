import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { User, UserRole, roleDescriptions } from '../types';

interface EditUserModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
}

export function EditUserModal({ isOpen, user, onClose }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    role: user.role,
    status: user.status
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Updating user:', { userId: user.id, ...formData });
      onClose();
      
      // Show success message
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Deleting user:', user.id);
      onClose();
      
      // Show success message
      alert('User removed successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canEditUser = user.role !== 'owner'; // Can't edit owner role
  const isCurrentUser = false; // In real app, check if this is the current user

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {!showDeleteConfirm ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Edit User
                      </Dialog.Title>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-lg font-medium text-primary-600">
                            {user.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{user.fullName}</h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                          </label>
                          {canEditUser ? (
                            <select
                              value={formData.role}
                              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                              {formData.role} (Cannot be changed)
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {roleDescriptions[formData.role]}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                          </label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">User Information</h5>
                          <dl className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Joined:</dt>
                              <dd className="text-gray-900">{user.createdAt.toLocaleDateString()}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Last Active:</dt>
                              <dd className="text-gray-900">{user.lastActive.toLocaleDateString()}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-between">
                        <div>
                          {!isCurrentUser && canEditUser && (
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(true)}
                              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                              disabled={isLoading}
                            >
                              Remove User
                            </button>
                          )}
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                          >
                            Cancel
                          </button>
                          
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                          >
                            {isLoading && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{isLoading ? 'Updating...' : 'Update User'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-red-900">
                        Remove User
                      </Dialog.Title>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">Are you sure?</h4>
                          <p className="text-sm text-gray-500">This action cannot be undone.</p>
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700">
                          Removing <strong>{user.fullName}</strong> will:
                        </p>
                        <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                          <li>Revoke all access to the cap table</li>
                          <li>Cancel any pending invitations</li>
                          <li>Remove them from all company communications</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDeleteUser}
                        disabled={isLoading}
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                      >
                        {isLoading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        <span>{isLoading ? 'Removing...' : 'Remove User'}</span>
                      </button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}