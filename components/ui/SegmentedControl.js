// components/ui/SegmentedControl.js
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-control border border-line bg-surface p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
            value === opt.value ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
