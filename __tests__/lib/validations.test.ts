import {
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  validateBody,
} from '@/lib/validations';

describe('Zod Validations', () => {
  it('validates a correct CreateBooking payload', () => {
    const payload = {
      centreId: '123e4567-e89b-12d3-a456-426614174000',
      commodityId: '123e4567-e89b-12d3-a456-426614174001',
      date: '2026-10-15',
      slotWindow: '10:00-12:00',
      quantity: 50,
    };
    const result = validateBody(CreateBookingSchema, payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(50);
    }
  });

  it('fails CreateBooking payload with invalid date format', () => {
    const payload = {
      centreId: '123e4567-e89b-12d3-a456-426614174000',
      commodityId: '123e4567-e89b-12d3-a456-426614174001',
      date: '10-15-2026', // Incorrect format
      slotWindow: '10:00-12:00',
    };
    const result = validateBody(CreateBookingSchema, payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Date must be YYYY-MM-DD');
    }
  });

  it('validates UpdateBookingStatus payload correctly', () => {
    const payload = {
      status: 'accepted',
      actual_weight_quintals: 45.5,
      quality_grade: 'A',
    };
    const result = validateBody(UpdateBookingStatusSchema, payload);
    expect(result.success).toBe(true);
  });

  it('fails UpdateBookingStatus payload with invalid status', () => {
    const payload = {
      status: 'unknown_status',
    };
    const result = validateBody(UpdateBookingStatusSchema, payload);
    expect(result.success).toBe(false);
  });
});
