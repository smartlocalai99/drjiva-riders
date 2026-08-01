jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { listHospitals, createHospital, updateHospital } = require('../hospitals');

describe('listHospitals', () => {
  it('returns hospitals ordered by name', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'h1', name: 'Alpha' }], error: null });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    const result = await listHospitals();

    expect(supabase.from).toHaveBeenCalledWith('hospitals');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('name');
    expect(result).toEqual([{ id: 'h1', name: 'Alpha' }]);
  });

  it('throws when supabase returns an error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: new Error('network down') });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    await expect(listHospitals()).rejects.toThrow('network down');
  });
});

describe('createHospital', () => {
  it('inserts a hospital with nulled optional fields', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'h2', name: 'Beta' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const result = await createHospital({ name: 'Beta' });

    expect(insert).toHaveBeenCalledWith({ name: 'Beta', code: null, address: null, phone: null });
    expect(result.name).toBe('Beta');
  });
});

describe('updateHospital', () => {
  it('updates a hospital by id', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'h1', name: 'Alpha Updated' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ update });

    const result = await updateHospital('h1', { name: 'Alpha Updated', code: 'A', address: null, phone: null });

    expect(update).toHaveBeenCalledWith({ name: 'Alpha Updated', code: 'A', address: null, phone: null });
    expect(eq).toHaveBeenCalledWith('id', 'h1');
    expect(result.name).toBe('Alpha Updated');
  });
});
