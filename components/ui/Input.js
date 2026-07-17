// components/ui/Input.js
export default function Input({ mono = false, className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-control border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink focus:border-ink ${
        mono ? 'font-mono' : 'font-sans'
      } ${className}`}
      {...props}
    />
  );
}
