jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
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
} = require('../orders');

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
});

afterAll(() => {
  delete global.fetch;
});

function respondWith(data) {
  return Promise.resolve({
    ok: true,
    json: async () => ({ data }),
  });
}

it('sends protected order operations to the same-origin API without an access code', async () => {
  global.fetch
    .mockImplementationOnce(() => respondWith([{ id: 'order-1' }]))
    .mockImplementationOnce(() => respondWith({ id: 'order-1' }))
    .mockImplementationOnce(() => respondWith({ id: 'order-1', status: 'shared' }))
    .mockImplementationOnce(() =>
      respondWith({ id: 'order-1', riderName: 'Ravi', status: 'assigned' }),
    )
    .mockImplementationOnce(() => respondWith({ hospital: { id: 'hospital-1' } }))
    .mockImplementationOnce(() => respondWith({ id: 'hospital-1' }));

  await expect(listOrders('active')).resolves.toEqual([{ id: 'order-1' }]);
  await expect(getOrder('order-1')).resolves.toEqual({ id: 'order-1' });
  await expect(updateOrderStatus('order-1', 'shared')).resolves.toMatchObject({
    status: 'shared',
  });
  await expect(
    assignRider('order-1', { name: ' Ravi ', phone: '+91 98765 43210' }),
  ).resolves.toMatchObject({ riderName: 'Ravi' });
  await expect(getOrderConsoleConfig()).resolves.toMatchObject({
    hospital: { id: 'hospital-1' },
  });
  await expect(
    savePickupLocation({
      address: 'Railway Station Road, Kadapa',
      phone: '9876543210',
    }),
  ).resolves.toEqual({ id: 'hospital-1' });

  expect(global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body))).toEqual([
    { operation: 'listOrders', input: { filter: 'active' } },
    { operation: 'getOrder', input: { orderId: 'order-1' } },
    {
      operation: 'updateOrderStatus',
      input: { orderId: 'order-1', status: 'shared' },
    },
    {
      operation: 'assignRider',
      input: { orderId: 'order-1', name: 'Ravi', phone: '9876543210' },
    },
    { operation: 'getOrderConsoleConfig', input: {} },
    {
      operation: 'savePickupLocation',
      input: {
        address: 'Railway Station Road, Kadapa',
        phone: '9876543210',
      },
    },
  ]);
  expect(global.fetch).toHaveBeenCalledWith(
    '/api/orders',
    expect.objectContaining({ method: 'POST' }),
  );
});

it('serializes and removes browser push subscriptions through the protected API', async () => {
  global.fetch
    .mockImplementationOnce(() => respondWith('subscription-1'))
    .mockImplementationOnce(() => respondWith(true));
  const subscription = {
    endpoint: 'https://push.example/subscription',
    keys: { auth: 'auth-secret', p256dh: 'public-key-material' },
  };

  await expect(registerPushSubscription(subscription, 'Browser UA')).resolves.toBe(
    'subscription-1',
  );
  await expect(removePushSubscription(subscription.endpoint)).resolves.toBe(true);

  expect(global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body))).toEqual([
    {
      operation: 'registerPushSubscription',
      input: {
        auth: 'auth-secret',
        endpoint: 'https://push.example/subscription',
        p256dh: 'public-key-material',
        userAgent: 'Browser UA',
      },
    },
    {
      operation: 'removePushSubscription',
      input: { endpoint: 'https://push.example/subscription' },
    },
  ]);
});

it('throws API errors instead of returning stale order data', async () => {
  global.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Order service is not configured.' }),
  });

  await expect(listOrders('active')).rejects.toThrow(
    'Order service is not configured.',
  );
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

