import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Check, X, Plus } from 'lucide-react';

interface CustomEnumSelectProps {
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'base';
  id?: string;
  ariaLabel?: string;
}

export const CustomEnumSelect: React.FC<CustomEnumSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select or enter custom...',
  className = '',
  size = 'sm',
  id,
  ariaLabel,
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current value is in standard options list
  const isValueStandard = options.includes(value);

  // When custom mode activates, focus the input
  useEffect(() => {
    if (isCustomMode) {
      setCustomInputValue(isValueStandard ? '' : value);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isCustomMode, isValueStandard, value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__ENTER_CUSTOM__') {
      setIsCustomMode(true);
    } else {
      onChange(selected);
    }
  };

  const handleApplyCustom = () => {
    const trimmed = customInputValue.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setIsCustomMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyCustom();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCustomMode(false);
    }
  };

  // Sizing styles
  const sizeClasses = {
    xs: 'text-xs py-1 px-2',
    sm: 'text-xs py-1.5 px-2.5',
    base: 'text-sm py-2 px-3',
  }[size];

  if (isCustomMode) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={customInputValue}
            onChange={(e) => setCustomInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type custom value...'}
            className={`w-full bg-white border border-indigo-500 rounded-lg ${sizeClasses} font-semibold text-slate-900 outline-none ring-2 ring-indigo-500/20 shadow-2xs pr-14`}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-0.5">
            <button
              type="button"
              onClick={handleApplyCustom}
              title="Apply custom value (Enter)"
              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              title="Cancel (Esc)"
              className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="relative flex-1">
        <select
          id={id}
          value={value}
          onChange={handleSelectChange}
          aria-label={ariaLabel}
          className={`w-full bg-white border border-slate-200 rounded-lg ${sizeClasses} font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all truncate pr-7`}
        >
          {/* If the current value is custom (not in predefined options), show it prominently */}
          {!isValueStandard && value && (
            <option value={value}>
              ✨ {value} (Custom)
            </option>
          )}

          {/* Standard options */}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}

          {/* Action to enter custom */}
          <option value="__ENTER_CUSTOM__" className="font-bold text-indigo-600">
            ➕ Type custom value...
          </option>
        </select>
      </div>

      {/* Direct inline button to type custom value */}
      <button
        type="button"
        onClick={() => setIsCustomMode(true)}
        title="Type or edit custom value"
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 transition-colors shrink-0 shadow-2xs"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
