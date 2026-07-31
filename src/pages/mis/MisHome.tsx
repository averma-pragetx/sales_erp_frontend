import { useNavigate } from 'react-router-dom';
import { MIS_DASHBOARDS, MIS_SECTION_LABELS, type MisSection } from '../../data/mis/dashboards';

const SECTIONS: MisSection[] = ['pre-award', 'post-award'];

export default function MisHome() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-gray-900">Executive MIS Dashboards</h1>
        <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
          Unified system of visibility on top of Business Central and the AI Platform — department dashboards
          feeding into a single leadership cockpit.
        </p>
      </div>

      {SECTIONS.map(section => (
        <div key={section} className="mb-6">
          <h2 className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-2.5">
            {MIS_SECTION_LABELS[section]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {MIS_DASHBOARDS.filter(d => d.section === section).map(d => (
              <button
                key={d.id}
                onClick={() => navigate(d.path)}
                className="text-left bg-white rounded-lg border border-gray-200 px-4 py-3.5 hover:-translate-y-px hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">{d.title}</p>
                  {d.ready ? (
                    <span className="shrink-0 px-1.5 py-px rounded text-[10px] font-bold bg-green-100 text-green-700">
                      Live
                    </span>
                  ) : (
                    <span className="shrink-0 px-1.5 py-px rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-gray-500 mt-1.5 leading-snug">{d.purpose}</p>
                <p className="text-[10.5px] text-gray-400 mt-2.5 pt-2.5 border-t border-gray-100">
                  {d.primaryUsers.join(' · ')}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
