jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { createDispense } = require('../dispenses');

describe('createDispense', () => {
  it('creates the dispense row then inserts its items', async () => {
    const dispenseSingle = jest.fn().mockResolvedValue({ data: { id: 'd1' }, error: null });
    const dispenseSelect = jest.fn().mockReturnValue({ single: dispenseSingle });
    const dispenseInsert = jest.fn().mockReturnValue({ select: dispenseSelect });

    const itemsInsert = jest.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === 'dispenses') return { insert: dispenseInsert };
      if (table === 'dispense_items') return { insert: itemsInsert };
      throw new Error(`unexpected table ${table}`);
    });

    const result = await createDispense({
      patientId: 'p1',
      hospitalId: 'h1',
      staffId: 's1',
      items: [{ medicineId: 'm1', timing: ['morning'], foodInstruction: 'after_food', quantity: '1 tablet', durationDays: 5 }],
    });

    expect(dispenseInsert).toHaveBeenCalledWith({ patient_id: 'p1', hospital_id: 'h1', staff_id: 's1', notes: null });
    expect(itemsInsert).toHaveBeenCalledWith([
      { dispense_id: 'd1', medicine_id: 'm1', timing: ['morning'], food_instruction: 'after_food', quantity: '1 tablet', duration_days: 5 },
    ]);
    expect(result).toEqual({ id: 'd1' });
  });

  it('throws if the items insert fails, without swallowing the error', async () => {
    const dispenseSingle = jest.fn().mockResolvedValue({ data: { id: 'd1' }, error: null });
    const dispenseSelect = jest.fn().mockReturnValue({ single: dispenseSingle });
    const dispenseInsert = jest.fn().mockReturnValue({ select: dispenseSelect });
    const itemsInsert = jest.fn().mockResolvedValue({ error: new Error('items insert failed') });

    supabase.from.mockImplementation((table) => {
      if (table === 'dispenses') return { insert: dispenseInsert };
      if (table === 'dispense_items') return { insert: itemsInsert };
    });

    await expect(
      createDispense({ patientId: 'p1', hospitalId: 'h1', staffId: 's1', items: [{ medicineId: 'm1', timing: ['morning'], foodInstruction: 'after_food', quantity: '1', durationDays: 5 }] })
    ).rejects.toThrow('items insert failed');
  });
});
