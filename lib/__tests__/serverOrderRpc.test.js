const { callProtectedOrderRpc } = require('../server/orderRpc');

describe('callProtectedOrderRpc', () => {
  it('adds the server credential to the protected Supabase RPC request', async () => {
    const request = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'order-1' }],
    });

    const result = await callProtectedOrderRpc(
      'list_hospital_orders',
      { p_filter: 'active', p_access_code: 'browser-value' },
      {
        NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        ORDER_DASHBOARD_ACCESS_CODE: 'server-only-code',
      },
      request,
    );

    expect(result).toEqual([{ id: 'order-1' }]);
    expect(request).toHaveBeenCalledWith(
      'https://project.supabase.co/rest/v1/rpc/list_hospital_orders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          p_filter: 'active',
          p_access_code: 'server-only-code',
        }),
      }),
    );
  });

  it('fails clearly when the server credential is missing', async () => {
    await expect(
      callProtectedOrderRpc(
        'list_hospital_orders',
        { p_filter: 'active' },
        {
          NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        },
        jest.fn(),
      ),
    ).rejects.toThrow('Order service is not configured.');
  });
});

