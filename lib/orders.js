import { supabase } from '../utils/supabaseClient';

async function callRpc(name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
}

export async function verifyAccessCode(accessCode) {
  return Boolean(
    await callRpc('verify_order_dashboard_access', {
      p_access_code: accessCode,
    }),
  );
}

export async function listOrders(accessCode, filter = 'active') {
  const data = await callRpc('list_hospital_orders', {
    p_access_code: accessCode,
    p_filter: filter,
  });
  return Array.isArray(data) ? data : [];
}

export function getOrder(accessCode, orderId) {
  return callRpc('get_hospital_order', {
    p_access_code: accessCode,
    p_order_id: orderId,
  });
}

export function updateOrderStatus(accessCode, orderId, status) {
  return callRpc('update_hospital_order_status', {
    p_access_code: accessCode,
    p_order_id: orderId,
    p_status: status,
  });
}

export function getOrderConsoleConfig(accessCode) {
  return callRpc('get_order_console_config', {
    p_access_code: accessCode,
  });
}

export function savePickupLocation(accessCode, { address, phone }) {
  return callRpc('update_order_pickup_location', {
    p_access_code: accessCode,
    p_address: address,
    p_phone: phone,
  });
}

export function registerPushSubscription(
  accessCode,
  subscription,
  userAgent,
) {
  return callRpc('register_order_push_subscription', {
    p_access_code: accessCode,
    p_auth: subscription.keys.auth,
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.keys.p256dh,
    p_user_agent: userAgent,
  });
}

export function removePushSubscription(accessCode, endpoint) {
  return callRpc('remove_order_push_subscription', {
    p_access_code: accessCode,
    p_endpoint: endpoint,
  });
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
