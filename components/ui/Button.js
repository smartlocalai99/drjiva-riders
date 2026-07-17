// components/ui/Button.js
import Link from 'next/link';

const BASE =
  'inline-flex items-center justify-center rounded-control px-4 py-2 font-sans font-medium text-sm transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-line hover:bg-paper',
  danger: 'bg-surface text-danger border border-danger hover:bg-danger/5',
};

export default function Button({ variant = 'primary', href, className = '', children, ...props }) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
