const { createOrdersApiHandler } = require('../../pages/api/orders');

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    setHeader: jest.fn(),
  };
}

describe('orders API', () => {
  it('maps a browser operation to a fixed protected RPC without accepting a code', async () => {
    const callRpc = jest.fn().mockResolvedValue([{ id: 'order-1' }]);
    const handler = createOrdersApiHandler(callRpc);
    const response = createResponse();

    await handler(
      {
        method: 'POST',
        body: {
          operation: 'listOrders',
          input: { filter: 'active', accessCode: 'browser-code' },
        },
      },
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual({ data: [{ id: 'order-1' }] });
    expect(callRpc).toHaveBeenCalledWith('list_hospital_orders', {
      p_filter: 'active',
    });
  });

  it('rejects unknown operations without calling Supabase', async () => {
    const callRpc = jest.fn();
    const handler = createOrdersApiHandler(callRpc);
    const response = createResponse();

    await handler(
      { method: 'POST', body: { operation: 'runAnyRpc', input: {} } },
      response,
    );

    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual({ error: 'Unsupported order operation.' });
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('rejects non-POST requests', async () => {
    const handler = createOrdersApiHandler(jest.fn());
    const response = createResponse();

    await handler({ method: 'GET' }, response);

    expect(response.statusCode).toBe(405);
    expect(response.payload).toEqual({ error: 'Method not allowed.' });
  });
});

