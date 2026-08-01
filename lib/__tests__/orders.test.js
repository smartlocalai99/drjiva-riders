jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
    rpc: jest.fn(),
  },
}));

const { supabase } = require('../../utils/supabaseClient');
const {
  assignRider,
  getOrder,
  getOrderConsoleConfig,
  listOrders,
  registerPushSubscription,
  removePushSubscription,
  savePickupLocation,
  subscribeToOrderEvents,
  updateOrderStatus,
  verifyAccessCode,
} = require('../orders');

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls the protected order RPCs with stable argument names', async () => {
  supabase.rpc
    .mockResolvedValueOnce({ data: true, error: null })
    .mockResolvedValueOnce({ data: [{ id: 'order-1' }], error: null })
    .mockResolvedValueOnce({ data: { id: 'order-1' }, error: null })
    .mockResolvedValueOnce({ data: { id: 'order-1', status: 'shared' }, error: null })
    .mockResolvedValueOnce({
      data: { id: 'order-1', riderName: 'Ravi', status: 'assigned' },
      error: null,
    })
    .mockResolvedValueOnce({ data: { hospital: { id: 'hospital-1' } }, error: null })
    .mockResolvedValueOnce({ data: { id: 'hospital-1' }, error: null });

  await expect(verifyAccessCode('DRJIVA-CODE')).resolves.toBe(true);
  await expect(listOrders('DRJIVA-CODE', 'active')).resolves.toEqual([{ id: 'order-1' }]);
  await expect(getOrder('DRJIVA-CODE', 'order-1')).resolves.toEqual({ id: 'order-1' });
  await expect(updateOrderStatus('DRJIVA-CODE', 'order-1', 'shared')).resolves.toEqual({
    id: 'order-1',
    status: 'shared',
  });
  await expect(
    assignRider('DRJIVA-CODE', 'order-1', {
      name: ' Ravi ',
      phone: '+91 98765 43210',
    }),
  ).resolves.toEqual({
    id: 'order-1',
    riderName: 'Ravi',
    status: 'assigned',
  });
  await expect(getOrderConsoleConfig('DRJIVA-CODE')).resolves.toEqual({
    hospital: { id: 'hospital-1' },
  });
  await expect(
    savePickupLocation('DRJIVA-CODE', {
      address: 'Railway Station Road, Kadapa',
      phone: '9876543210',
    }),
  ).resolves.toEqual({ id: 'hospital-1' });

  expect(supabase.rpc.mock.calls).toEqual([
    ['verify_order_dashboard_access', { p_access_code: 'DRJIVA-CODE' }],
    ['list_hospital_orders', { p_access_code: 'DRJIVA-CODE', p_filter: 'active' }],
    ['get_hospital_order', { p_access_code: 'DRJIVA-CODE', p_order_id: 'order-1' }],
    [
      'update_hospital_order_status',
      { p_access_code: 'DRJIVA-CODE', p_order_id: 'order-1', p_status: 'shared' },
    ],
    [
      'assign_order_rider',
      {
        p_access_code: 'DRJIVA-CODE',
        p_order_id: 'order-1',
        p_rider_name: 'Ravi',
        p_rider_phone: '9876543210',
      },
    ],
    ['get_order_console_config', { p_access_code: 'DRJIVA-CODE' }],
    [
      'update_order_pickup_location',
      {
        p_access_code: 'DRJIVA-CODE',
        p_address: 'Railway Station Road, Kadapa',
        p_phone: '9876543210',
      },
    ],
  ]);
});

it('serializes and removes browser push subscriptions', async () => {
  supabase.rpc
    .mockResolvedValueOnce({ data: 'subscription-1', error: null })
    .mockResolvedValueOnce({ data: true, error: null });
  const subscription = {
    endpoint: 'https://push.example/subscription',
    keys: { auth: 'auth-secret', p256dh: 'public-key-material' },
  };

  await expect(
    registerPushSubscription('DRJIVA-CODE', subscription, 'Browser UA'),
  ).resolves.toBe('subscription-1');
  await expect(
    removePushSubscription('DRJIVA-CODE', subscription.endpoint),
  ).resolves.toBe(true);

  expect(supabase.rpc.mock.calls).toEqual([
    [
      'register_order_push_subscription',
      {
        p_access_code: 'DRJIVA-CODE',
        p_auth: 'auth-secret',
        p_endpoint: 'https://push.example/subscription',
        p_p256dh: 'public-key-material',
        p_user_agent: 'Browser UA',
      },
    ],
    [
      'remove_order_push_subscription',
      { p_access_code: 'DRJIVA-CODE', p_endpoint: 'https://push.example/subscription' },
    ],
  ]);
});

it('throws database errors instead of returning stale order data', async () => {
  supabase.rpc.mockResolvedValue({ data: null, error: new Error('Invalid hospital access code.') });
  await expect(listOrders('wrong', 'active')).rejects.toThrow('Invalid hospital access code.');
});

it('subscribes only to non-sensitive order event inserts and cleans up the channel', () => {
  const subscribe = jest.fn();
  const on = jest.fn().mockReturnValue({ subscribe });
  const channel = { on, subscribe };
  supabase.channel.mockReturnValue(channel);
  const onEvent = jest.fn();

  const cleanup = subscribeToOrderEvents(onEvent);

  expect(supabase.channel).toHaveBeenCalledWith('hospital-order-events');
  expect(on).toHaveBeenCalledWith(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'order_events' },
    onEvent,
  );
  expect(subscribe).toHaveBeenCalledTimes(1);
  cleanup();
  expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
});
