
import { GoogleGenAI } from "@google/genai";

// Ensure API key is present in the environment
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("Missing API_KEY environment variable. Gemini features will fail.");
}

// Initialize the client
// Note: We use the 'new GoogleGenAI({ apiKey })' syntax as per SDK requirements.
export const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key_for_build" });
