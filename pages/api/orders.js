import { callProtectedOrderRpc } from '../../lib/server/orderRpc';

const ORDER_STATUSES = new Set([
  'shared',
  'assigned',
  'collected',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);
const ORDER_FILTERS = new Set(['active', 'delivered', 'cancelled', 'all']);

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

const OPERATIONS = {
  listOrders(input) {
    const filter = input.filter ?? 'active';
    if (!ORDER_FILTERS.has(filter)) throw new Error('Invalid order filter.');
    return ['list_hospital_orders', { p_filter: filter }];
  },
  getOrder(input) {
    return [
      'get_hospital_order',
      { p_order_id: requiredString(input.orderId, 'Order id') },
    ];
  },
  updateOrderStatus(input) {
    const status = requiredString(input.status, 'Order status');
    if (!ORDER_STATUSES.has(status)) throw new Error('Invalid order status.');
    return [
      'update_hospital_order_status',
      {
        p_order_id: requiredString(input.orderId, 'Order id'),
        p_status: status,
      },
    ];
  },
  assignRider(input) {
    return [
      'assign_order_rider',
      {
        p_order_id: requiredString(input.orderId, 'Order id'),
        p_rider_name: requiredString(input.name, 'Rider name'),
        p_rider_phone: requiredString(input.phone, 'Rider phone'),
      },
    ];
  },
  getOrderConsoleConfig() {
    return ['get_order_console_config', {}];
  },
  savePickupLocation(input) {
    return [
      'update_order_pickup_location',
      {
        p_address: requiredString(input.address, 'Pickup address'),
        p_phone: typeof input.phone === 'string' ? input.phone.trim() : '',
      },
    ];
  },
  registerPushSubscription(input) {
    return [
      'register_order_push_subscription',
      {
        p_endpoint: requiredString(input.endpoint, 'Push endpoint'),
        p_p256dh: requiredString(input.p256dh, 'Push public key'),
        p_auth: requiredString(input.auth, 'Push authentication key'),
        p_user_agent:
          typeof input.userAgent === 'string' ? input.userAgent : '',
      },
    ];
  },
  removePushSubscription(input) {
    return [
      'remove_order_push_subscription',
      { p_endpoint: requiredString(input.endpoint, 'Push endpoint') },
    ];
  },
};

export function createOrdersApiHandler(callRpc = callProtectedOrderRpc) {
  return async function ordersApiHandler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return response.status(405).json({ error: 'Method not allowed.' });
    }

    const operation = request.body?.operation;
    const buildRequest = OPERATIONS[operation];
    if (!buildRequest) {
      return response.status(400).json({ error: 'Unsupported order operation.' });
    }

    let rpcRequest;
    try {
      rpcRequest = buildRequest(request.body?.input ?? {});
    } catch (cause) {
      return response.status(400).json({
        error: cause instanceof Error ? cause.message : 'Invalid order request.',
      });
    }

    try {
      const data = await callRpc(...rpcRequest);
      return response.status(200).json({ data });
    } catch (cause) {
      return response.status(503).json({
        error:
          cause instanceof Error ? cause.message : 'Order service request failed.',
      });
    }
  };
}

export default createOrdersApiHandler();

