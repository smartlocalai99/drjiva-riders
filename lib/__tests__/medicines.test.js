jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { createMedicine, updateMedicine } = require('../medicines');

describe('createMedicine', () => {
  it('inserts a medicine with a price and nulled optional fields', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'm1', name: 'Paracetamol', price: 12.5 }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const result = await createMedicine({ name: 'Paracetamol', price: 12.5 });

    expect(insert).toHaveBeenCalledWith({ name: 'Paracetamol', image_url: null, category: null, price: 12.5 });
    expect(result.price).toBe(12.5);
  });

  it('defaults price to null when not given', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'm2', name: 'Vitamin C' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    await createMedicine({ name: 'Vitamin C' });

    expect(insert).toHaveBeenCalledWith({ name: 'Vitamin C', image_url: null, category: null, price: null });
  });
});

describe('updateMedicine', () => {
  it('only patches the fields provided', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'm1', price: 15 }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ update });

    const result = await updateMedicine('m1', { price: 15 });

    expect(update).toHaveBeenCalledWith({ price: 15 });
    expect(eq).toHaveBeenCalledWith('id', 'm1');
    expect(result.price).toBe(15);
  });
});
