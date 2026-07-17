// components/ui/DosageTimingPicker.js
const SLOTS = [
  { key: 'morning', label: 'Morning', color: 'var(--color-morning)', offset: 'translate-y-2' },
  { key: 'afternoon', label: 'Afternoon', color: 'var(--color-afternoon)', offset: '-translate-y-1' },
  { key: 'night', label: 'Night', color: 'var(--color-night)', offset: 'translate-y-2' },
];

function SlotIcon({ slotKey, active }) {
  if (slotKey === 'night') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path
          d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="12" cy="12" r="5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="1.5" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22.5" />
        <line x1="1.5" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22.5" y2="12" />
        <line x1="4.2" y1="4.2" x2="6" y2="6" />
        <line x1="18" y1="18" x2="19.8" y2="19.8" />
        <line x1="4.2" y1="19.8" x2="6" y2="18" />
        <line x1="18" y1="6" x2="19.8" y2="4.2" />
      </g>
    </svg>
  );
}

export default function DosageTimingPicker({ value = [], onChange, readOnly = false }) {
  const toggle = (key) => {
    if (readOnly || !onChange) return;
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  };

  const Tag = readOnly ? 'div' : 'button';

  return (
    <div className="flex items-end justify-center gap-6 py-2">
      {SLOTS.map((slot) => {
        const active = value.includes(slot.key);
        return (
          <Tag
            key={slot.key}
            type={readOnly ? undefined : 'button'}
            onClick={readOnly ? undefined : () => toggle(slot.key)}
            className={`flex flex-col items-center gap-1.5 ${slot.offset} ${readOnly ? '' : 'cursor-pointer'}`}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors duration-150"
              style={{
                borderColor: slot.color,
                backgroundColor: active ? slot.color : 'transparent',
                color: active ? '#fff' : slot.color,
              }}
            >
              <SlotIcon slotKey={slot.key} active={active} />
            </span>
            <span className={`text-xs font-medium ${active ? 'text-ink' : 'text-muted'}`}>{slot.label}</span>
          </Tag>
        );
      })}
    </div>
  );
}
