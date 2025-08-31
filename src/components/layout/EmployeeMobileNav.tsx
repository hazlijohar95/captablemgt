import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  FileText, 
  User, 
  Calculator 
} from 'lucide-react';

const navItems = [
  {
    name: 'Dashboard',
    href: '/employee',
    icon: Home
  },
  {
    name: 'Equity',
    href: '/employee/equity',
    icon: TrendingUp
  },
  {
    name: 'Vesting',
    href: '/employee/vesting',
    icon: Calculator
  },
  {
    name: 'Documents',
    href: '/employee/documents',
    icon: FileText
  },
  {
    name: 'Profile',
    href: '/employee/profile',
    icon: User
  }
];

export const EmployeeMobileNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/employee' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : ''}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};