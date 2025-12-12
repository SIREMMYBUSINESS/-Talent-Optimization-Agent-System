import { useState } from 'react';
import { TimeRangeFilter } from '../types/dashboard';
import { formatDate } from '../utils/formatters';

interface TimeRangeSelectorProps {
  selectedRange: TimeRangeFilter;
  onChange: (range: TimeRangeFilter) => void;
}

export function TimeRangeSelector({ selectedRange, onChange }: TimeRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(selectedRange.preset === 'custom');
  const [customStart, setCustomStart] = useState(
    selectedRange.customStart ? selectedRange.customStart.toISOString().split('T')[0] : ''
  );
  const [customEnd, setCustomEnd] = useState(
    selectedRange.customEnd ? selectedRange.customEnd.toISOString().split('T')[0] : ''
  );

  const handlePresetClick = (preset: '7d' | '30d' | '90d') => {
    setShowCustom(false);
    onChange({ preset });
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        preset: 'custom',
        customStart: new Date(customStart),
        customEnd: new Date(customEnd),
      });
      setShowCustom(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => handlePresetClick('7d')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            selectedRange.preset === '7d' && !showCustom
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          7D
        </button>
        <button
          onClick={() => handlePresetClick('30d')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            selectedRange.preset === '30d' && !showCustom
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          30D
        </button>
        <button
          onClick={() => handlePresetClick('90d')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            selectedRange.preset === '90d' && !showCustom
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          90D
        </button>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            showCustom
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 ml-4 p-2 bg-white border border-gray-200 rounded-lg">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded-md"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded-md"
          />
          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="px-3 py-1 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
