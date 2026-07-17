// components/ui/Card.js
export default function Card({ className = '', children }) {
  return <div className={`bg-surface border border-line rounded-card p-5 card-shadow ${className}`}>{children}</div>;
}
