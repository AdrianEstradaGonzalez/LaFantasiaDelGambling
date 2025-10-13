import { z } from 'zod';

export const updatePlayerPriceSchema = z.object({
  price: z.number().int().min(1).max(250),
});

export const playerQuerySchema = z.object({
  position: z.string().optional(),
  teamId: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  search: z.string().optional(),
});

export type UpdatePlayerPriceInput = z.infer<typeof updatePlayerPriceSchema>;
export type PlayerQueryInput = z.infer<typeof playerQuerySchema>;
