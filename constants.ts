
import { ItineraryItem, TripConfig } from "./types";

export const MOCK_DAY_1: ItineraryItem[] = [
  {
    id: "mock-1",
    stop_name: "Arrival at Union Station",
    arrival_time: "10:30",
    transport_method: "Amtrak Pacific Surfliner",
    transit_duration: "2h 45m",
    cost_estimate: "$35.00",
    rationale: "Arriving from San Diego. The train drops you right in the center.",
    type: "arrival",
    duration: "15m",
    geo_context: "Downtown",
    coordinates: { lat: 34.0562, lng: -118.2365 },
    rating: 4.2,
    opening_hours: "04:00 - 01:00",
    photos: ["https://picsum.photos/200/200?random=1", "https://picsum.photos/200/200?random=2"]
  },
  {
    id: "mock-2",
    stop_name: "The Hoxton Hotel",
    arrival_time: "11:00",
    transport_method: "Rideshare",
    transit_duration: "10 mins",
    cost_estimate: "$12.00",
    rationale: "Drop bags off immediately. Early check-in requested.",
    type: "start",
    duration: "30m",
    geo_context: "Broadway",
    coordinates: { lat: 34.0423, lng: -118.2587 },
    rating: 4.6,
    opening_hours: "24 Hours",
    photos: ["https://picsum.photos/200/200?random=3"]
  },
  {
    id: "mock-3",
    stop_name: "Grand Central Market",
    arrival_time: "11:45",
    transport_method: "Walk",
    transit_duration: "5 mins",
    cost_estimate: "$0.00",
    rationale: "Perfect time for lunch before the crowds peak at 12:30.",
    type: "visit",
    duration: "1h 30m",
    geo_context: "Downtown",
    coordinates: { lat: 34.0506, lng: -118.2488 },
    rating: 4.8,
    opening_hours: "08:00 - 21:00",
    photos: ["https://picsum.photos/200/200?random=4", "https://picsum.photos/200/200?random=5"]
  },
  {
    id: "mock-4",
    stop_name: "The Last Bookstore",
    arrival_time: "13:30",
    transport_method: "Walk",
    transit_duration: "10 mins",
    cost_estimate: "$0.00",
    rationale: "Iconic spot nearby. Fits the 'Relaxed' pace criteria.",
    type: "visit",
    duration: "1h",
    geo_context: "Historic Core",
    coordinates: { lat: 34.0478, lng: -118.2503 },
    rating: 4.7,
    opening_hours: "11:00 - 20:00",
    photos: ["https://picsum.photos/200/200?random=6"]
  }
];

export const SYSTEM_INSTRUCTION = `
You are PLAYbook, an intelligent travel logistician.
Your goal is to generate a single day's itinerary based on a larger Trip Configuration.

**Inputs provided:**
1. Trip Configuration (Origin, Destination, Intensity, Mode).
2. Day Number (e.g., Day 1 of 3).
3. Previous Context (List of places already visited in previous days to avoid duplicates).

**Logic Rules:**
1. **Day 1 (Smart Arrival):** 
   - The first item MUST describe the travel from the **Origin** to the **Destination**. 
   - Provide realistic transit options (Flight/Train/Drive) for that leg.
   - The second item should be checking into a hotel or dropping bags at a central hub.
2. **Day 2+ (Context Aware):**
   - Start the day from a logical central point (e.g., "Hotel" or "City Center").
   - DO NOT repeat stops found in the 'Previous Context' list.
3. **Pace Intensity:**
   - 'Relaxed': ~3-4 hours of activity, generous gaps.
   - 'Moderate': ~5-6 hours, steady pace.
   - 'Power': ~8+ hours, tight logistics.
4. **Transport Clarity:**
   - Use the user's preferred 'Mode' where possible, but prioritize logic (e.g., don't walk 5 miles).
   - Be specific: "Take Blue Line", "Uber", "Walk via 5th Ave".
   - ALWAYS include 'transit_duration' estimate.
5. **Geospatial Accuracy:**
   - You MUST provide accurate Latitude/Longitude for every stop.
6. **Rich Data:**
   - Include 'rating' (float 1-5), 'opening_hours' (string), and 'transit_duration' (string).

Return strictly a JSON array of objects.
`;
