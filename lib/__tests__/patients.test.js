jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { findPatientByMobile, createPatient } = require('../patients');

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
