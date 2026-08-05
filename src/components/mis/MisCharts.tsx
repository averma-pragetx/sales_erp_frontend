import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, PieChart, Pie, LabelList,
} from 'recharts';
import { CAT, AXIS_TICK, GRID_STROKE } from './misUtils';

// ─── Layout building blocks ─────────────────────────────────────────────────

export function BackLink() {
  return (
    <Link to="/mis" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
      ← Back to MIS Dashboards
    </Link>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[10.5px] font-bold tracking-wide text-gray-500 uppercase">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function ChartCard({
  title, subtitle, action, children,
}: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-[11.5px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Donut({
  data, onSliceClick, activeKey, valueLabel = 'Items',
}: {
  data: { key: string; name: string; value: number; color: string }[];
  onSliceClick?: (key: string) => void;
  activeKey?: string;
  valueLabel?: string;
}) {
  return (
    <>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={44}
            outerRadius={68}
            paddingAngle={2}
            onClick={onSliceClick ? (_, i) => onSliceClick(data[i].key) : undefined}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color}
                opacity={activeKey && activeKey !== d.key ? 0.35 : 1}
                stroke={activeKey === d.key ? '#0b0b0b' : 'none'}
                strokeWidth={activeKey === d.key ? 2 : 0}
                cursor={onSliceClick ? 'pointer' : 'default'}
              />
            ))}
          </Pie>
          <Tooltip formatter={v => [v, valueLabel]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
        {data.map(d => (
          <span key={d.key} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
            {d.name} · {d.value}
          </span>
        ))}
      </div>
    </>
  );
}

export function HBar({
  data, onBarClick, activeName, valueFormatter, height,
}: {
  data: { name: string; value: number; fill?: string }[];
  onBarClick?: (name: string) => void;
  activeName?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(150, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={112} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip formatter={v => [valueFormatter ? valueFormatter(Number(v)) : v, '']} />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          onClick={onBarClick ? (_, i) => onBarClick(data[i].name) : undefined}
          cursor={onBarClick ? 'pointer' : 'default'}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill ?? CAT[0]} opacity={activeName && activeName !== d.name ? 0.4 : 1} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={v => (valueFormatter ? valueFormatter(Number(v)) : String(v))}
            style={{ fontSize: 11, fill: '#6b6a66' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FilterSelect({
  label, value, options, onChange,
}: { label: string; value?: string; options: readonly string[]; onChange: (v?: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-36"
      >
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${color}1f`, color }}>
      {label}
    </span>
  );
}

export function FilterChips({
  entries, labelFor, onRemove, onClear,
}: {
  entries: [string, string][];
  labelFor: (key: string, value: string) => string;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">
          {labelFor(key, value)}
          <button onClick={() => onRemove(key)} className="text-blue-400 hover:text-blue-700">✕</button>
        </span>
      ))}
      <button onClick={onClear} className="text-xs font-semibold text-blue-600 hover:underline ml-1">Clear all</button>
    </div>
  );
}
