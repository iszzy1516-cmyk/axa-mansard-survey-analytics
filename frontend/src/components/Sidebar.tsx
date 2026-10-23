import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  FileBarChart2,
  Gauge,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import logoUrl from '../assets/axa-logo.svg';

const REPORT_TABS = [
  { to: '/reports/survey-request-details', label: 'Survey Request Details' },
  { to: '/reports/survey-requests', label: 'Survey Requests' },
  { to: '/reports/survey-responses', label: 'Survey Responses' },
  { to: '/reports/filtered-requests', label: 'Filtered Requests' },
];

export function Sidebar() {
  const { isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [reportsOpen, setReportsOpen] = useState(location.pathname.startsWith('/reports'));

  const reportsActive = location.pathname.startsWith('/reports');

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-100 px-4">
        <img src={logoUrl} alt="AXA" className="h-7 w-7" />
        <span className="text-[15px] font-bold tracking-tight text-gray-900">
          Survey Analytics
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-blue-50 text-axa-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          <Gauge size={17} />
          Dashboard
        </NavLink>

        <div>
          <button
            type="button"
            onClick={() => setReportsOpen((v) => !v)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
              reportsActive ? 'text-axa-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FileBarChart2 size={17} />
            Reports
            <ChevronDown
              size={15}
              className={`ml-auto transition-transform ${reportsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {reportsOpen && (
            <div className="mt-0.5 space-y-0.5 pl-5">
              {REPORT_TABS.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-1.5 text-[13px] ${
                      isActive
                        ? 'bg-blue-50 font-medium text-axa-primary'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-blue-50 text-axa-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Users size={17} />
            User Management
          </NavLink>
        )}

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-blue-50 text-axa-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          <Settings size={17} />
          Settings
        </NavLink>
      </nav>

      <div className="border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
