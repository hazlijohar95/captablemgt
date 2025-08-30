import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { FloatingHelp } from './FloatingHelp';
import { NotificationBadge } from '@/components/ui';
import { 
  HomeIcon,
  TableCellsIcon,
  UserGroupIcon,
  DocumentTextIcon,
  GiftIcon,
  BeakerIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  CogIcon,
  ArrowRightStartOnRectangleIcon,
  BuildingOffice2Icon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon,
    notifications: 0
  },
  { 
    name: 'Cap Table', 
    href: '/cap-table', 
    icon: TableCellsIcon,
    notifications: 0
  },
  { 
    name: 'Stakeholders', 
    href: '/stakeholders', 
    icon: UserGroupIcon,
    notifications: 0
  },
  { 
    name: 'Instruments', 
    href: '/instruments', 
    icon: DocumentTextIcon,
    notifications: 2
  },
  { 
    name: 'Grants', 
    href: '/grants', 
    icon: GiftIcon,
    notifications: 0
  },
  { 
    name: 'Scenarios', 
    href: '/scenarios', 
    icon: BeakerIcon,
    notifications: 0
  },
  { 
    name: 'Waterfall', 
    href: '/waterfall', 
    icon: ChartBarIcon,
    notifications: 0
  },
  { 
    name: 'Documents', 
    href: '/documents', 
    icon: DocumentChartBarIcon,
    notifications: 1
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: DocumentChartBarIcon,
    notifications: 0
  },
  { 
    name: 'Settings', 
    href: '/admin', 
    icon: CogIcon,
    notifications: 0
  },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Find current page name
  const currentPage = navigation.find(item => item.href === location.pathname)?.name || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500 rounded-lg">
                <BuildingOffice2Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">
                  Cap Table
                </h1>
                <p className="text-xs text-gray-500">
                  Professional
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border-0 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`h-4 w-4 ${
                      location.pathname === item.href
                        ? 'text-primary-600'
                        : 'text-gray-600 group-hover:text-gray-800'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                
                {item.notifications > 0 && (
                  <NotificationBadge count={item.notifications} size="sm" />
                )}
              </NavLink>
            ))}
          </nav>
          
          {/* User Profile */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1 gap-3">
                <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Sign out"
              >
                <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header for mobile */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentPage}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="relative p-1 rounded-lg text-gray-600 hover:bg-gray-100">
                <BellIcon className="w-5 h-5" />
                <NotificationBadge count={3} size="sm" />
              </button>
              
              <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto bg-white">
          <main className="p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Floating help button */}
      <FloatingHelp />
    </div>
  );
}