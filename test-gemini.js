import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("No API key found!");
    return;
  }

  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Halo, apa kabar? Sebutkan namamu.",
    });
    console.log("Success! Response text:", response.text);
  } catch (err) {
    console.error("Error calling Gemini API:", err);
  }
}

test();
