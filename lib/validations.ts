import { z } from 'zod';

export const CreateBookingSchema = z.object({
  centreId: z.string().uuid('Invalid centre ID'),
  commodityId: z.string().uuid('Invalid commodity ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  slotWindow: z.string().min(1, 'Slot window is required'),
  quantity: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)]).optional().nullable(),
});

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['booked', 'checked_in', 'weighed', 'quality_checked', 'accepted', 'rejected', 'paid', 'cancelled']),
  actual_weight_quintals: z.union([z.number().positive(), z.string()]).optional().nullable(),
  quality_grade: z.string().optional().nullable(),
  quality_notes: z.string().optional().nullable(),
  accepted_quantity_quintals: z.union([z.number().positive(), z.string()]).optional().nullable(),
});

export const CreateGrievanceSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  issueType: z.string().min(1, 'Issue type is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
});

export const UpdatePaymentStatusSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
  status: z.enum(['pending', 'initiated', 'paid', 'failed']),
});

export function validateBody<T>(schema: z.ZodSchema<T>, body: any): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errorMessages = (result.error.issues || []).map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    return { success: false, error: errorMessages };
  }
  return { success: true, data: result.data };
}
