import { Outlet, NavLink } from 'react-router';
import { useAuth } from '@/features/auth/AuthContext';
import { FloatingHelp } from './FloatingHelp';
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
  ArrowRightStartOnRectangleIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Cap Table', href: '/cap-table', icon: TableCellsIcon },
  { name: 'Stakeholders', href: '/stakeholders', icon: UserGroupIcon },
  { name: 'Instruments', href: '/instruments', icon: DocumentTextIcon },
  { name: 'Grants', href: '/grants', icon: GiftIcon },
  { name: 'Scenarios', href: '/scenarios', icon: BeakerIcon },
  { name: 'Waterfall', href: '/waterfall', icon: ChartBarIcon },
  { name: 'Documents', href: '/documents', icon: DocumentChartBarIcon },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  { name: 'Admin', href: '/admin', icon: CogIcon },
];

export function Layout() {
  const { user, signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6">
            <h1 className="text-xl font-semibold text-gray-900">Cap Table</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            ))}
          </nav>
          
          {/* User menu */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Sign out"
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
      
      {/* Floating help button */}
      <FloatingHelp />
    </div>
  );
}