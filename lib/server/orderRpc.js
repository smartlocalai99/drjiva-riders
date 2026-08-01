const DEFAULT_SUPABASE_URL = 'https://jlvjnnltynebenflkcua.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_LXzMM6HjPlwUmbMQfqyYXw_QthfwjsU';

export async function callProtectedOrderRpc(
  name,
  params = {},
  env = process.env,
  request = fetch,
) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const accessCode = env.ORDER_DASHBOARD_ACCESS_CODE;

  if (!accessCode) {
    throw new Error('Order service is not configured.');
  }

  const response = await request(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...params,
      p_access_code: accessCode,
    }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Order service request failed.');
  }

  return payload;
}

