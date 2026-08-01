jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { getDashboardStats } = require('../dashboard');

describe('getDashboardStats', () => {
  it('returns counts for patients, medicines, hospitals, and dispenses', async () => {
    const counts = { patients: 10, medicines: 20, hospitals: 3, dispenses: 45 };
    supabase.from.mockImplementation((table) => ({
      select: jest.fn().mockResolvedValue({ count: counts[table], error: null }),
    }));

    const result = await getDashboardStats();

    expect(result).toEqual(counts);
    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(supabase.from).toHaveBeenCalledWith('medicines');
    expect(supabase.from).toHaveBeenCalledWith('hospitals');
    expect(supabase.from).toHaveBeenCalledWith('dispenses');
  });

  it('throws if any count query fails', async () => {
    supabase.from.mockImplementation((table) => ({
      select: jest.fn().mockResolvedValue(
        table === 'medicines' ? { count: null, error: new Error('boom') } : { count: 1, error: null }
      ),
    }));

    await expect(getDashboardStats()).rejects.toThrow('boom');
  });
});
