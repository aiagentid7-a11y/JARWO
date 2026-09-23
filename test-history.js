import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });

  const chatHistory = [
    { role: "user", content: "Halo, saya admin baru bernama Budi." },
    { role: "assistant", content: "Halo Budi! Ada yang bisa saya bantu hari ini?" }
  ];
  const message = "Siapa nama saya?";

  const contents = [];

  if (chatHistory && Array.isArray(chatHistory)) {
    for (const h of chatHistory) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      });
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: "Anda adalah AI HR Agent.",
        temperature: 0.3
      }
    });
    console.log("Success! Response:", response.text);
  } catch (err) {
    console.error("CRITICAL HISTORY ERROR:", err);
  }
}

test();
