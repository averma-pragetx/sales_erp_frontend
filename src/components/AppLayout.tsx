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
        'flex items-center gap-2.5 px-3 py-2 rounded-r-md text-sm font-medium transition-colors',
        'border-l-2',
        isActive
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      ].join(' ')}
    >
      {icon}
      {label}
    </NavLink>
  );
};

const DimmedItem = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-400 opacity-40 cursor-not-allowed select-none border-l-2 border-transparent">
    <span className="w-4 h-4 inline-block" />
    {label}
  </div>
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

const ListIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor" />
    <rect x="1" y="6" width="14" height="2" rx="1" fill="currentColor" />
    <rect x="1" y="10" width="14" height="2" rx="1" fill="currentColor" />
    <rect x="1" y="14" width="8" height="2" rx="1" fill="currentColor" />
  </svg>
);

const BuildingIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0 text-indigo-600"
  >
    <rect x="2" y="4" width="16" height="14" rx="1.5" fill="currentColor" opacity="0.15" />
    <rect x="2" y="4" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="5" y="8" width="3" height="3" rx="0.5" fill="currentColor" />
    <rect x="8.5" y="8" width="3" height="3" rx="0.5" fill="currentColor" />
    <rect x="12" y="8" width="3" height="3" rx="0.5" fill="currentColor" />
    <rect x="7" y="12" width="6" height="6" rx="0.5" fill="currentColor" />
    <rect x="8" y="2" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
  </svg>
);

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 flex flex-col bg-white border-r border-gray-200 h-full">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
          <BuildingIcon />
          <span className="text-sm font-bold text-gray-900 tracking-tight">Sales ERP</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {/* WORKSPACE section */}
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              Workspace
            </p>
            <div className="space-y-0.5">
              <NavItem
                to="/"
                icon={<KanbanIcon />}
                label="Pipeline"
              />
              <NavItem
                to="/inquiries"
                icon={<ListIcon />}
                label="Inquiries"
              />
            </div>
          </div>

          {/* COMING SOON section */}
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase opacity-40">
              Coming Soon
            </p>
            <div className="space-y-0.5">
              <DimmedItem label="Estimation" />
              <DimmedItem label="Documents" />
              <DimmedItem label="Reports" />
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Sales ERP v0.1</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
