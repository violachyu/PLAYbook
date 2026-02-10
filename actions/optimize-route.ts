
'use server';

import { ai } from "../lib/gemini";
import { ItineraryItem } from "../types";
import { Type, Schema } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are a sophisticated Route Optimization Engine.
Input: An unordered list of travel stops.
Task: Reorder the stops to minimize total travel time/distance (Traveling Salesperson Problem) while strictly adhering to time window constraints.

**Critical Rules:**
1. **LOCKED START:** The first item in the list is the "Start Point". It MUST remain at index 0.
2. **TIME WINDOWS:** You MUST parse the "opening_hours" field.
   - If a venue closes early (e.g., "09:00 - 14:00"), it MUST be visited early in the sequence.
   - If a venue is open late (e.g., "18:00 - 02:00"), it MUST be visited late in the sequence.
   - If a venue is "24 Hours", it is flexible.
   - Verify that the estimated arrival time matches the opening hours.
3. **TSP LOGIC:** Minimize the geographic distance between consecutive stops.
4. **OUTPUT:** Return the EXACT list of IDs in the new sorted order.
`;

const OPTIMIZE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    sorted_ids: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of ID strings in the optimized order"
    }
  },
  required: ["sorted_ids"]
};

export async function optimizeRouteSequence(items: ItineraryItem[]): Promise<string[]> {
  if (items.length <= 2) return items.map(i => i.id);

  // We only send minimal data to save tokens and ensure focus on geography
  const simplifiedItems = items.map(item => ({
    id: item.id,
    name: item.stop_name,
    lat: item.coordinates.lat,
    lng: item.coordinates.lng,
    hours: item.opening_hours || "09:00 - 17:00" // Default assumption if missing
  }));

  const prompt = `
    Optimize this route starting from: ${simplifiedItems[0].name} (ID: ${simplifiedItems[0].id}).
    
    Stops to visit: 
    ${JSON.stringify(simplifiedItems)}
    
    Please reason about the opening hours and location coordinates to produce the most efficient and valid sequence.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: OPTIMIZE_SCHEMA,
        thinkingConfig: { thinkingBudget: 2048 }, // Enable reasoning for complex TSP + Time Window
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Optimization AI");

    const result = JSON.parse(text);
    return result.sorted_ids;

  } catch (error) {
    console.error("Optimization failed:", error);
    // Fallback: Return original order
    return items.map(i => i.id);
  }
}
