import { GoogleGenAI, Type } from "@google/genai";
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

  const message = "Siapa saja karyawan yang jabatannya KTT?";
  const chatHistory = [];

  const addEmployeeDeclaration = {
    name: "add_employee",
    description: "Menambahkan karyawan baru ke dalam database One For All.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        position: { type: Type.STRING },
        department: { type: Type.STRING },
      },
      required: ["name", "position", "department"]
    }
  };

  const systemInstruction = "Anda adalah AI HR Agent.";
  const contents = [{
    role: "user",
    parts: [{ text: message }]
  }];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
        tools: [{
          functionDeclarations: [addEmployeeDeclaration]
        }]
      },
    });
    console.log("Success! Response text:", response.text);
  } catch (err) {
    console.error("Error calling Gemini API in chat:", err);
  }
}

test();
