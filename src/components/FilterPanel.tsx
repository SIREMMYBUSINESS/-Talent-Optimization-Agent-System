import { useState } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterPanelProps {
  searchPlaceholder?: string;
  filters?: {
    label: string;
    key: string;
    options: FilterOption[];
  }[];
  onSearch?: (term: string) => void;
  onFilterChange?: (key: string, value: string) => void;
}

export function FilterPanel({
  searchPlaceholder = 'Search...',
  filters = [],
  onSearch,
  onFilterChange,
}: FilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch?.(term);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilterChange?.(key, value);
  };

  return (
    <div className="space-y-4">
      {onSearch && (
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {filters.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={activeFilters[filter.key] || ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}

      {Object.keys(activeFilters).length > 0 && (
        <button
          onClick={() => {
            setActiveFilters({});
            setSearchTerm('');
            onSearch?.('');
          }}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
