jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { findPatientByMobile, createPatient, listPatients } = require('../patients');

describe('findPatientByMobile', () => {
  it('returns the patient row when found', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: '1', mobile: '9999999999' }, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    const result = await findPatientByMobile('9999999999');

    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('mobile', '9999999999');
    expect(result).toEqual({ id: '1', mobile: '9999999999' });
  });

  it('throws when supabase returns an error', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error('network down') });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    await expect(findPatientByMobile('9999999999')).rejects.toThrow('network down');
  });
});

describe('createPatient', () => {
  it('inserts a patient with nulled optional fields', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: '2', mobile: '8888888888', name: 'Lakshmi' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const result = await createPatient({ mobile: '8888888888', name: 'Lakshmi' });

    expect(insert).toHaveBeenCalledWith({ mobile: '8888888888', name: 'Lakshmi', age: null, gender: null });
    expect(result.name).toBe('Lakshmi');
  });
});

describe('listPatients', () => {
  it('lists patients ordered by newest first with no filter', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Lakshmi' }], error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    const result = await listPatients();

    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(50);
    expect(result).toEqual([{ id: '1', name: 'Lakshmi' }]);
  });

  it('filters by name or mobile when a query is given', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const or = jest.fn().mockReturnValue({ limit });
    const order = jest.fn().mockReturnValue({ or });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    await listPatients({ query: 'laksh', limit: 10 });

    expect(or).toHaveBeenCalledWith('name.ilike.%laksh%,mobile.ilike.%laksh%');
    expect(limit).toHaveBeenCalledWith(10);
  });
});
