
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ItineraryItem, TripConfig } from "../types";
import { SYSTEM_INSTRUCTION, MOCK_DAY_1 } from "../constants";

export const generateDayItinerary = async (
  dayNumber: number,
  config: TripConfig,
  previousStops: string[]
): Promise<ItineraryItem[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API Key. Using Mock Data.");
    // Simulate delay
    await new Promise(r => setTimeout(r, 1500));
    return MOCK_DAY_1.map(i => ({...i, dayNumber: 1, category: 'ACTIVITY'}));
  }

  const ai = new GoogleGenAI({ apiKey });

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        stop_name: { type: Type.STRING },
        arrival_time: { type: Type.STRING },
        transport_method: { type: Type.STRING },
        transit_duration: { type: Type.STRING },
        transit_steps: { 
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of 3-5 short bullet points for navigation (e.g. 'Exit B2', 'Transfer at Central')"
        },
        cost_estimate: { type: Type.STRING },
        rationale: { type: Type.STRING },
        type: { type: Type.STRING, enum: ["start", "visit", "transit", "end", "arrival"] },
        category: { type: Type.STRING, enum: ["LODGE", "DINE", "TOUR", "TRANSIT", "SHOP", "RELAX"], description: "Specific activity category" },
        duration: { type: Type.STRING },
        geo_context: { type: Type.STRING, description: "Neighborhood or Area name" },
        rating: { type: Type.NUMBER },
        opening_hours: { type: Type.STRING },
        photos: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "2-3 valid, public HTTP image URLs for this specific location (e.g. Wikimedia Commons). Do NOT use placeholders."
        },
        tactical_tips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Logistical warnings like 'Cash only', 'Book ahead', 'Security check'"
        },
        coordinates: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["lat", "lng"]
        }
      },
      required: ["stop_name", "arrival_time", "transport_method", "cost_estimate", "rationale", "type", "coordinates", "transit_steps", "category"]
    }
  };

  try {
    const contextPrompt = previousStops.length > 0 
      ? `DO NOT visit these places again: ${previousStops.join(", ")}.` 
      : "";

    const daySpecificPrompt = dayNumber === 1
      ? `Generating DAY 1. Start by traveling from ${config.origin} to ${config.destination}. Then proceed to hotel/initial exploration.`
      : `Generating DAY ${dayNumber}. Start from hotel/central hub in ${config.destination}. Explore new areas.`;

    const prompt = `
      Trip Config:
      - Destination: ${config.destination}
      - Pace: ${config.intensity}
      - Mode Preference: ${config.mode}
      
      ${daySpecificPrompt}
      ${contextPrompt}
      
      Ensure logical geographic flow and provide ACCURATE coordinates for mapping.
      For each item:
      1. Provide a rating (1-5) and typical opening hours.
      2. Provide 'transit_steps' describing how to get TO this location from the previous one (max 100 words, bullet points).
      3. Provide 'tactical_tips' for logistical warnings (e.g. "Cash only", "Long queues").
      4. Search for and provide 2-3 REAL image URLs for the location.
      5. Assign a concise Category (LODGE, DINE, TOUR, TRANSIT, SHOP).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");

    const items = JSON.parse(text) as ItineraryItem[];
    
    // Post-process to ensure photos exist (fallback if search failed to return array)
    return items.map((item, idx) => ({
      ...item,
      id: `${dayNumber}-${idx}-${Date.now()}`,
      dayNumber: dayNumber, // Assign day number here
      photos: (item.photos && item.photos.length > 0) ? item.photos : [
        `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`
      ]
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// New function to generate details for a dropped pin
export const generateItemFromCoordinates = async (
  lat: number,
  lng: number,
  config: TripConfig
): Promise<ItineraryItem> => {
    const apiKey = process.env.API_KEY;
    
    // Mock fallback if no key
    if (!apiKey) {
       return {
          id: `manual-${Date.now()}`,
          stop_name: "Selected Location",
          arrival_time: "TBD",
          transport_method: "Walk",
          transit_duration: "5 mins",
          cost_estimate: "Free",
          rationale: "Manually added location.",
          type: "visit",
          category: "TOUR",
          duration: "1h",
          coordinates: { lat, lng },
          rating: 4.5,
          opening_hours: "09:00 - 18:00",
          photos: ["https://picsum.photos/200/200?random=99"]
       };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        stop_name: { type: Type.STRING },
        transport_method: { type: Type.STRING },
        transit_duration: { type: Type.STRING },
        transit_steps: { 
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        cost_estimate: { type: Type.STRING },
        rationale: { type: Type.STRING },
        type: { type: Type.STRING, enum: ["visit"] },
        category: { type: Type.STRING, enum: ["LODGE", "DINE", "TOUR", "TRANSIT", "SHOP"] },
        duration: { type: Type.STRING },
        geo_context: { type: Type.STRING },
        rating: { type: Type.NUMBER },
        opening_hours: { type: Type.STRING },
        photos: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        tactical_tips: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
      },
      required: ["stop_name", "rationale", "rating", "geo_context"]
    };

    const prompt = `
      Identify the location at Lat: ${lat}, Lng: ${lng} in ${config.destination}.
      Context: This is a user-selected pin drop on a map.
      
      Fields:
      - stop_name: The name of the specific place.
      - geo_context: Neighborhood name.
      - rationale: What to do here.
      - category: LODGE, DINE, TOUR, etc.
      - tactical_tips: Logistical warnings.
      - photos: Search for 2-3 ACTUAL image URLs for this location.
      
      Mode: ${config.mode}.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    const partialItem = JSON.parse(text);

    return {
      ...partialItem,
      id: `manual-${Date.now()}`,
      arrival_time: "TBD", // User arranges this
      coordinates: { lat, lng },
      photos: (partialItem.photos && partialItem.photos.length > 0) ? partialItem.photos : [
        `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`
      ]
    };
};
