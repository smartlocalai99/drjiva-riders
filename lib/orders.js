import { supabase } from '../utils/supabaseClient';

async function callOrderApi(operation, input = {}) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, input }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Order service request failed.');
  }
  return payload.data;
}

export async function listOrders(filter = 'active') {
  const data = await callOrderApi('listOrders', { filter });
  return Array.isArray(data) ? data : [];
}

export function getOrder(orderId) {
  return callOrderApi('getOrder', { orderId });
}

export function updateOrderStatus(orderId, status) {
  return callOrderApi('updateOrderStatus', { orderId, status });
}

export function assignRider(orderId, { name, phone }) {
  const normalizedName = name.trim();
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
  return callOrderApi('assignRider', {
    orderId,
    name: normalizedName,
    phone: normalizedPhone,
  });
}

export function getOrderConsoleConfig() {
  return callOrderApi('getOrderConsoleConfig');
}

export function savePickupLocation({ address, phone }) {
  return callOrderApi('savePickupLocation', { address, phone });
}

export function registerPushSubscription(subscription, userAgent) {
  return callOrderApi('registerPushSubscription', {
    auth: subscription.keys.auth,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    userAgent,
  });
}

export function removePushSubscription(endpoint) {
  return callOrderApi('removePushSubscription', { endpoint });
}

export function subscribeToOrderEvents(onEvent) {
  const channel = supabase.channel('hospital-order-events');
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'order_events' },
    onEvent,
  );
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
