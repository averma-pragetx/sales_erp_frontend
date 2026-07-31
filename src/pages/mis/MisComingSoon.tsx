import { useParams, Link } from 'react-router-dom';
import { getMisDashboard } from '../../data/mis/dashboards';

export default function MisComingSoon() {
  const { id } = useParams<{ id: string }>();
  const dashboard = id ? getMisDashboard(id) : undefined;

  return (
    <div className="p-6 max-w-2xl">
      <Link to="/mis" className="text-sm text-blue-600 hover:underline">← Back to MIS Dashboards</Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-3">
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 mb-2">
          Coming soon
        </span>
        <h1 className="text-lg font-bold text-gray-900">{dashboard?.title ?? 'Dashboard'}</h1>
        {dashboard && <p className="text-sm text-gray-500 mt-1.5">{dashboard.purpose}</p>}
        {dashboard && (
          <p className="text-xs text-gray-400 mt-3">
            Primary users: {dashboard.primaryUsers.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
