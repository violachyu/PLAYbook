
'use server';

import { ai } from "../lib/gemini";
import { Type, Schema } from "@google/genai";
import { 
  ItineraryDay, 
  ItineraryDaySchema, 
  UserInput, 
  UserInputSchema 
} from "../types/itinerary";

// --- System Instructions ---
const SYSTEM_INSTRUCTION = `
You are PLAYbook, an intelligent travel logistician.
Your goal is to generate structured travel itineraries in strict JSON format.

Style Guide:
- Descriptions: Short, punchy, tech-noir style. Max 15 words.
- Rationale: Strategic reasoning (e.g., "Optimized for minimal walking", "Avoids peak crowd").
- Transport: Be specific with lines, modes, and durations.
- Precision: Ensure time ranges are contiguous.
`;

// --- Schema Definition for Gemini ---
const ITINERARY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    day_number: { type: Type.INTEGER },
    date: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time_range: { type: Type.STRING },
          location_name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["transit", "activity", "meal", "lodging"] },
          description: { type: Type.STRING },
          rationale: { type: Type.STRING },
          transport_detail: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              mode: { type: Type.STRING, enum: ["walk", "bus", "train", "car", "flight"] },
              duration: { type: Type.STRING },
              instruction: { type: Type.STRING }
            },
            required: ["mode", "duration", "instruction"]
          }
        },
        required: ["time_range", "location_name", "category", "description", "rationale"]
      }
    }
  },
  required: ["day_number", "date", "steps"]
};

/**
 * Action A: Initialize Trip (Day 1)
 * Handles the logic of moving from Origin -> Destination and setting up the first day.
 */
export async function initializeTrip(formData: UserInput): Promise<ItineraryDay> {
  // Validate input
  const input = UserInputSchema.parse(formData);

  const prompt = `
    Generate Day 1 of a trip.
    
    Constraints:
    - Origin: ${input.origin}
    - Destination: ${input.destination}
    - Date: ${input.startDate}
    - Transport Preference: ${input.transportMode}
    - Intensity: ${input.intensity}

    Day 1 Logic:
    1. Start with the transit from ${input.origin} to ${input.destination}. Estimate realistic travel time.
    2. Arrival at destination (Station/Airport).
    3. Check-in at a generic "Central Hotel" or "Airbnb".
    4. First activity should be low-stress (orientation/meal) near the accommodation.
    
    Output strictly in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ITINERARY_SCHEMA,
        temperature: 0.2, // Low temperature for consistent formatting
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const data = JSON.parse(text);
    // Validate against our Zod schema to ensure type safety
    return ItineraryDaySchema.parse(data);

  } catch (error) {
    console.error("Error generating Day 1:", error);
    throw new Error("Failed to generate itinerary for Day 1.");
  }
}

/**
 * Action B: Generate Next Day (Day N)
 * Generates a subsequent day based on context from previous days.
 */
export async function generateNextDay(prevDaysContext: ItineraryDay[], config: UserInput): Promise<ItineraryDay> {
  if (prevDaysContext.length === 0) {
    throw new Error("No previous context provided. Use initializeTrip for Day 1.");
  }

  const lastDay = prevDaysContext[prevDaysContext.length - 1];
  const nextDayNumber = lastDay.day_number + 1;
  
  // Calculate next date
  const nextDateObj = new Date(lastDay.date);
  nextDateObj.setDate(nextDateObj.getDate() + 1);
  const nextDateString = nextDateObj.toISOString().split('T')[0];

  // Extract visited places to avoid duplicates
  const visitedPlaces = prevDaysContext
    .flatMap(day => day.steps.map(s => s.location_name))
    .join(", ");

  const prompt = `
    Generate Day ${nextDayNumber} of a trip to ${config.destination}.
    
    Constraints:
    - Date: ${nextDateString}
    - Pace: ${config.intensity}
    - Mode: ${config.transportMode}
    
    Context:
    - Previously Visited (DO NOT REPEAT): ${visitedPlaces}
    
    Day ${nextDayNumber} Logic:
    1. Start at "User Accommodation".
    2. Focus on a specific neighborhood or theme not yet covered.
    3. End the day with a dinner recommendation.
    
    Output strictly in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ITINERARY_SCHEMA,
        temperature: 0.3, // Slightly higher for creativity in activities
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const data = JSON.parse(text);
    return ItineraryDaySchema.parse(data);

  } catch (error) {
    console.error(`Error generating Day ${nextDayNumber}:`, error);
    throw new Error(`Failed to generate itinerary for Day ${nextDayNumber}.`);
  }
}
