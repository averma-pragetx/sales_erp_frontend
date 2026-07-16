import { NavLink, Outlet, useLocation } from 'react-router-dom';

const NavItem = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={[
        'flex items-center gap-2.5 px-3 py-2.5 rounded-r-md text-sm font-medium transition-colors',
        'border-l-2',
        isActive
          ? 'border-blue-500 bg-white/10 text-white'
          : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100',
      ].join(' ')}
    >
      {icon}
      {label}
    </NavLink>
  );
};

const LeadEngineIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
    <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const KanbanIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <rect x="1" y="2" width="4" height="10" rx="1" fill="currentColor" opacity="0.85" />
    <rect x="6" y="2" width="4" height="7" rx="1" fill="currentColor" opacity="0.85" />
    <rect x="11" y="2" width="4" height="12" rx="1" fill="currentColor" opacity="0.85" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 flex flex-col bg-[#0c1330] h-full">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold tracking-tight">OE</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-tight truncate">Oswal Energies</p>
            <p className="text-[11px] text-slate-400 truncate">Sales ERP</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          <NavItem to="/tender-intel" icon={<LeadEngineIcon />} label="Tender Intelligence" />
          <NavItem to="/sales-pipeline" icon={<KanbanIcon />} label="Sales Pipeline" />
          <NavItem to="/search" icon={<SearchIcon />} label="Contextual Search" />
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-[10px] text-slate-500">Sales ERP v0.1</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
