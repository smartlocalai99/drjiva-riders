import {
  formatOrderNumber,
  formatRupees,
  statusLabel,
} from '../../lib/orderPresentation';

function orderTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

export default function OrderQueue({ orders, onSelect, selectedId }) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-symbol" aria-hidden="true">✓</div>
        <h2>No orders in this view</h2>
        <p>New orders will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="order-list" aria-label="Orders">
      {orders.map((order) => (
        <button
          className={`order-card${selectedId === order.id ? ' is-selected' : ''}`}
          key={order.id}
          onClick={() => onSelect(order)}
          type="button"
        >
          <span className={`status-rail status-${order.status}`} aria-hidden="true" />
          <span className="order-card-main">
            <span className="order-card-topline">
              <span className="order-id">{formatOrderNumber(order.orderNumber)}</span>
              <span className="order-time">{orderTime(order.createdAt)}</span>
            </span>
            <span className="order-card-customer">{order.customerName}</span>
            <span className="order-card-items">
              {(order.items ?? [])
                .map((item) => `${item.quantity}× ${item.name}`)
                .join(' · ')}
            </span>
            <span className="order-card-bottomline">
              <span className={`status-chip status-${order.status}`}>
                {statusLabel(order.status)}
              </span>
              <span className="order-card-total">{formatRupees(order.total)} · COD</span>
            </span>
          </span>
          <span className="card-arrow" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  );
}
