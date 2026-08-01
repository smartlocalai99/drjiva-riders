export function formatOrderNumber(value) {
  return `ORD-${Number(value)}`;
}

export function formatRupees(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export function formatAddress(address = {}) {
  if (address.formatted?.trim()) return address.formatted.trim();
  return [
    address.building,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pinCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export function buildDirectionsUrl(order) {
  const origin = order?.hospital?.address?.trim();
  const destination = formatAddress(order?.address);
  if (!origin || !destination) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

const ACTIONS = {
  placed: [
    { label: 'Confirm order', status: 'confirmed', tone: 'primary' },
    { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
  ],
  confirmed: [
    { label: 'Start preparing', status: 'preparing', tone: 'primary' },
    { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
  ],
  preparing: [
    { label: 'Out for delivery', status: 'out_for_delivery', tone: 'primary' },
    { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
  ],
  out_for_delivery: [
    { label: 'Mark delivered', status: 'delivered', tone: 'primary' },
    { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
  ],
  delivered: [],
  cancelled: [],
};

export function nextOrderActions(status) {
  return ACTIONS[status] ?? [];
}

export function buildNotificationBody(order) {
  const medicines = (order.items ?? [])
    .map((item) => `${item.quantity}× ${item.name}`)
    .join(', ');
  return [
    `${order.customerName} · ${order.customerPhone}`,
    medicines,
    `${formatRupees(order.total)} COD`,
    formatAddress(order.address),
  ].join('\n');
}

export function statusLabel(status) {
  return (
    {
      placed: 'New order',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      out_for_delivery: 'Out for delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    }[status] ?? 'Order'
  );
}
