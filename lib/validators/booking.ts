import { z } from "zod";

export const staffIdSchema = z.union([z.literal("any"), z.string().uuid()]);

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  staffId: staffIdSchema,
  startsAt: z.string().datetime(),
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const availabilityQuerySchema = z.object({
  staffId: staffIdSchema,
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
