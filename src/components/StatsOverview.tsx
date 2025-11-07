interface Stat {
  label: string;
  value: string | number;
  subLabel?: string;
}

interface StatsOverviewProps {
  stats: Stat[];
  title?: string;
}

export function StatsOverview({ stats, title }: StatsOverviewProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-50 px-4 py-5 rounded-lg">
            <dt className="text-sm font-medium text-gray-500 truncate">
              {stat.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {stat.value}
            </dd>
            {stat.subLabel && (
              <dd className="mt-1 text-xs text-gray-500">{stat.subLabel}</dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
