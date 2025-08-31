import { Outlet } from 'react-router-dom';
import { EmployeeMobileLayout } from '@/components/layout/EmployeeMobileLayout';

export default function EmployeePortal() {
  return (
    <EmployeeMobileLayout>
      <Outlet />
    </EmployeeMobileLayout>
  );
}