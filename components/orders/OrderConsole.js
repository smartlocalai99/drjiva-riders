import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  assignRider,
  getOrder,
  getOrderConsoleConfig,
  listOrders,
  subscribeToOrderEvents,
  updateOrderStatus,
} from '../../lib/orders';
import { clearStoredAccessCode } from './AccessGate';
import NotificationSetup from './NotificationSetup';
import OrderDetail from './OrderDetail';
import OrderQueue from './OrderQueue';
import PickupSettings from './PickupSettings';
import RiderAssignment from './RiderAssignment';

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All orders' },
];
const ACTIVE_STATUSES = new Set([
  'placed',
  'shared',
  'assigned',
  'collected',
  'out_for_delivery',
]);

function matchesFilter(order, filter) {
  if (filter === 'all') return true;
  if (filter === 'active') return ACTIVE_STATUSES.has(order.status);
  return order.status === filter;
}

export default function OrderConsole({ accessCode, onLock }) {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState(null);
  const [filter, setFilter] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const [nextOrders, nextConfig] = await Promise.all([
          listOrders(accessCode, 'all'),
          getOrderConsoleConfig(accessCode),
        ]);
        setOrders(nextOrders);
        setConfig(nextConfig);
        setSelectedOrder((current) =>
          current
            ? nextOrders.find((order) => order.id === current.id) ?? current
            : null,
        );
        setError('');
        setLastUpdated(new Date());
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not load orders. Check your connection.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessCode],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const unsubscribe = subscribeToOrderEvents(() => void refresh({ quiet: true }));
    const interval = window.setInterval(() => void refresh({ quiet: true }), 15_000);
    const handleFocus = () => void refresh({ quiet: true });
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    return () => {
      unsubscribe();
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!router.isReady || typeof router.query.order !== 'string') return;
    const orderId = router.query.order;
    const current = orders.find((order) => order.id === orderId);
    if (current) {
      const selectCurrent = window.setTimeout(() => setSelectedOrder(current), 0);
      return () => window.clearTimeout(selectCurrent);
    }
    let active = true;
    getOrder(accessCode, orderId)
      .then((order) => {
        if (active) setSelectedOrder(order);
      })
      .catch(() => {
        if (active) setError('That order could not be opened.');
      });
    return () => {
      active = false;
    };
  }, [accessCode, orders, router.isReady, router.query.order]);

  const displayedOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [filter, orders],
  );
  const activeCount = orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length;
  const newCount = orders.filter((order) => order.status === 'placed').length;

  function selectOrder(order) {
    setSelectedOrder(order);
    void router.replace(
      { pathname: '/', query: { order: order.id } },
      undefined,
      { shallow: true },
    );
  }

  function closeOrder() {
    setSelectedOrder(null);
    void router.replace('/', undefined, { shallow: true });
  }

  async function changeStatus(status) {
    if (!selectedOrder || statusBusy) return;
    setStatusBusy(true);
    setError('');
    try {
      const updated = await updateOrderStatus(accessCode, selectedOrder.id, status);
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
      setSelectedOrder(updated);
      setLastUpdated(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this order.');
    } finally {
      setStatusBusy(false);
    }
  }

  async function assignSelectedRider(rider) {
    if (!selectedOrder || statusBusy) return;
    setStatusBusy(true);
    setError('');
    try {
      const updated = await assignRider(accessCode, selectedOrder.id, rider);
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
      setSelectedOrder(updated);
      setAssignmentOpen(false);
      setLastUpdated(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not assign this rider.');
    } finally {
      setStatusBusy(false);
    }
  }

  function lockConsole() {
    clearStoredAccessCode();
    onLock();
  }

  return (
    <main className="console-shell">
      <header className="console-header">
        <div className="console-brand">
          <div className="brand-mark brand-mark-small" aria-hidden="true"><span>+</span></div>
          <div>
            <p className="eyebrow">DRJIVA operations</p>
            <h1>Order dispatch</h1>
          </div>
        </div>
        <div className="header-actions">
          <span className="connection-state">
            <span className="live-dot" /> Live
          </span>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} type="button" aria-label="Hospital pickup settings">⌂</button>
          <button className="button button-quiet" onClick={lockConsole} type="button">Lock</button>
        </div>
      </header>

      <div className="console-content">
        <section className="console-summary" aria-labelledby="queue-heading">
          <div>
            <p className="eyebrow">WhatsApp rider queue</p>
            <h2 id="queue-heading">
              {newCount > 0 ? `${newCount} new ${newCount === 1 ? 'order' : 'orders'}` : 'Orders are up to date'}
            </h2>
            <p className="summary-copy">
              {activeCount} active · You control every rider handoff
            </p>
          </div>
          <button className="button button-secondary refresh-button" disabled={refreshing} onClick={() => void refresh({ quiet: true })} type="button">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </section>

        <NotificationSetup accessCode={accessCode} vapidPublicKey={config?.vapidPublicKey} />

        {!config?.hospital?.address ? (
          <button className="pickup-alert" onClick={() => setSettingsOpen(true)} type="button">
            <span aria-hidden="true">!</span>
            <span>
              <strong>Add hospital pickup address</strong>
              <small>Required to create hospital → customer directions.</small>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        ) : null}

        {error ? (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => void refresh()} type="button">Try again</button>
          </div>
        ) : null}

        <div className="filter-row" role="tablist" aria-label="Order filters">
          {FILTERS.map((item) => (
            <button
              aria-selected={filter === item.key}
              className={filter === item.key ? 'is-active' : ''}
              key={item.key}
              onClick={() => setFilter(item.key)}
              role="tab"
              type="button"
            >
              {item.label}
              <span>{orders.filter((order) => matchesFilter(order, item.key)).length}</span>
            </button>
          ))}
        </div>

        <div className={`workspace${selectedOrder ? ' has-selection' : ''}`}>
          <section className="queue-panel">
            {loading ? (
              <div className="loading-state" role="status">
                <span className="spinner" /> Loading orders…
              </div>
            ) : (
              <OrderQueue
                onSelect={selectOrder}
                orders={displayedOrders}
                selectedId={selectedOrder?.id}
              />
            )}
            <p className="last-updated">
              {lastUpdated
                ? `Last checked ${lastUpdated.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
                : 'Connecting to order service…'}
            </p>
          </section>
          <OrderDetail
            busy={statusBusy}
            onClose={closeOrder}
            onAssign={() => setAssignmentOpen(true)}
            onStatus={(status) => void changeStatus(status)}
            order={selectedOrder}
          />
        </div>
      </div>

      {settingsOpen ? (
        <PickupSettings
          accessCode={accessCode}
          hospital={config?.hospital}
          onClose={() => setSettingsOpen(false)}
          onSaved={(hospital) =>
            setConfig((current) => ({ ...current, hospital }))
          }
        />
      ) : null}
      {assignmentOpen && selectedOrder ? (
        <RiderAssignment
          busy={statusBusy}
          onAssign={(rider) => assignSelectedRider(rider)}
          onClose={() => setAssignmentOpen(false)}
          order={selectedOrder}
        />
      ) : null}
    </main>
  );
}
