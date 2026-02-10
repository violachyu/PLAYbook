
import { z } from "zod";

// --- Zod Schemas for Validation ---

export const TransportDetailSchema = z.object({
  mode: z.enum(["walk", "bus", "train", "car", "flight"]),
  duration: z.string(), // e.g., "15m"
  instruction: z.string(), // e.g., "Take Line 4 towards X"
}).nullable();

export const ItineraryStepSchema = z.object({
  time_range: z.string(), // e.g., "10:00 - 11:30"
  location_name: z.string(),
  category: z.enum(["transit", "activity", "meal", "lodging"]),
  description: z.string(), // Short, punchy tech-style description
  rationale: z.string(), // Why is this here?
  transport_detail: TransportDetailSchema,
});

export const ItineraryDaySchema = z.object({
  day_number: z.number(),
  date: z.string(), // YYYY-MM-DD
  steps: z.array(ItineraryStepSchema),
});

export const UserInputSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  transportMode: z.enum(["public", "car", "walk"]),
  intensity: z.enum(["relaxed", "moderate", "power"]),
});

// --- TypeScript Interfaces ---

export type TransportDetail = z.infer<typeof TransportDetailSchema>;
export type ItineraryStep = z.infer<typeof ItineraryStepSchema>;
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;
export type UserInput = z.infer<typeof UserInputSchema>;
