import Image from 'next/image';

import {
  buildDirectionsUrl,
  formatAddress,
  formatOrderNumber,
  formatRupees,
  nextOrderActions,
  statusLabel,
} from '../../lib/orderPresentation';

const STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

function createdTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function OrderDetail({ busy, onClose, onStatus, order }) {
  if (!order) {
    return (
      <aside className="detail-empty">
        <div className="detail-empty-art" aria-hidden="true">↗</div>
        <p>Select an order to see delivery details.</p>
      </aside>
    );
  }

  const routeUrl = buildDirectionsUrl(order);
  const actions = nextOrderActions(order.status);
  const currentIndex = STEPS.indexOf(order.status);

  return (
    <aside className="order-detail" aria-label={`${formatOrderNumber(order.orderNumber)} details`}>
      <header className="detail-header">
        <div>
          <p className="eyebrow">Order detail</p>
          <h2>{formatOrderNumber(order.orderNumber)}</h2>
          <p className="detail-time">Received {createdTime(order.createdAt)}</p>
        </div>
        <button className="icon-button detail-close" onClick={onClose} type="button" aria-label="Close order details">
          ×
        </button>
      </header>

      {order.status === 'cancelled' ? (
        <div className="cancelled-banner">This order was cancelled.</div>
      ) : (
        <ol className="status-progress" aria-label="Order progress">
          {STEPS.map((step, index) => (
            <li className={index <= currentIndex ? 'is-complete' : ''} key={step}>
              <span className="progress-dot" />
              <span>{statusLabel(step)}</span>
            </li>
          ))}
        </ol>
      )}

      <section className="detail-section">
        <div className="section-heading">
          <span className="section-icon" aria-hidden="true">⌂</span>
          <div>
            <p className="section-kicker">Deliver to</p>
            <h3>{order.customerName}</h3>
          </div>
        </div>
        <a className="phone-link" href={`tel:${order.customerPhone}`}>
          +91 {order.customerPhone}
        </a>
        <p className="address-copy">{formatAddress(order.address)}</p>
        {routeUrl ? (
          <a className="route-link" href={routeUrl} rel="noreferrer" target="_blank">
            Open hospital → customer route <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <p className="setup-warning">
            Add the hospital pickup address in settings to enable directions.
          </p>
        )}
      </section>

      <section className="detail-section">
        <div className="section-heading">
          <span className="section-icon" aria-hidden="true">Rx</span>
          <div>
            <p className="section-kicker">Medicines</p>
            <h3>{(order.items ?? []).length} line items</h3>
          </div>
        </div>
        <div className="detail-items">
          {(order.items ?? []).map((item) => (
            <div className="detail-item" key={item.id ?? item.medicineId}>
              <div className="item-thumb">
                {item.imageUrl ? (
                  <Image alt="" height={42} src={item.imageUrl} unoptimized width={42} />
                ) : (
                  <span>Rx</span>
                )}
              </div>
              <div className="item-copy">
                <strong>{item.name}</strong>
                <span>{item.packDisplay}</span>
              </div>
              <div className="item-amount">
                <strong>{item.quantity}×</strong>
                <span>{formatRupees(item.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="total-row">
          <span>Cash to collect</span>
          <strong>{formatRupees(order.total)}</strong>
        </div>
      </section>

      <section className="detail-section pickup-summary">
        <p className="section-kicker">Pickup from</p>
        <h3>{order.hospital?.name}</h3>
        <p>{order.hospital?.address || 'Hospital pickup address not configured'}</p>
        {order.hospital?.phone ? <p>{order.hospital.phone}</p> : null}
      </section>

      {actions.length > 0 ? (
        <div className="detail-actions">
          {actions.map((action) => (
            <button
              className={`button button-${action.tone}`}
              disabled={busy}
              key={action.status}
              onClick={() => onStatus(action.status)}
              type="button"
            >
              {busy ? 'Updating…' : action.label}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
