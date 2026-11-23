'use client';

type Tab<T extends string> = { value: T; label: string };

// A row of tabs above a page's content (decision 042). The page shows the panel of the chosen tab;
// its panel uses `tabPanelProps()` so screen readers connect the two.
export default function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex border-b border-line-strong">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          id={`tab-${tab.value}`}
          aria-selected={tab.value === value}
          aria-controls={`panel-${tab.value}`}
          onClick={() => onChange(tab.value)}
          className={`flex-auto border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
            tab.value === value ? 'border-primary text-ink' : 'border-transparent text-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// The props of the panel that belongs to the tab `value`.
export function tabPanelProps(value: string) {
  return { role: 'tabpanel', id: `panel-${value}`, 'aria-labelledby': `tab-${value}` } as const;
}
