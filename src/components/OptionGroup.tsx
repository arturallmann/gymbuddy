'use client';

type Option<T extends string> = { value: T; label: string };

// A row of buttons where exactly one option is chosen.
export default function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              option.value === value
                ? 'border-sky-600 bg-sky-600 text-white'
                : 'border-gray-400/50 bg-transparent'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
