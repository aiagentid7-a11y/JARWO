import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const EMPLOYEES_FILE = path.join(process.cwd(), "data", "employees.json");

function loadEmployees() {
  const content = fs.readFileSync(EMPLOYEES_FILE, "utf-8");
  return JSON.parse(content);
}

async function test() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });

  const employees = loadEmployees();
  const compactEmployees = employees.slice(0, 10).map((e) => ({
    id: e.id,
    nik: e.nik,
    n: e.name,
    p: e.position,
    d: e.department,
  }));

  const systemInstruction = `Anda adalah AI Super Admin Agent.
Berikut adalah data lengkap karyawan aktif saat ini:
${JSON.stringify(compactEmployees)}`;

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

  const contents = [{
    role: "user",
    parts: [{ text: "Siapa saja karyawan yang jabatannya KTT?" }]
  }];

  try {
    let response = await ai.models.generateContent({
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

    console.log("Success 1! Text:", response.text);
    console.log("Function calls:", response.functionCalls);

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      const { name, args, id } = functionCall;

      const toolResult = { success: true, message: "Checked" };

      // Try appending model turn and tool response
      contents.push(response.candidates[0].content);
      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name,
            response: toolResult,
            id
          }
        }]
      });

      response = await ai.models.generateContent({
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

      console.log("Success 2! Text after function response:", response.text);
    }
  } catch (err) {
    console.error("CRITICAL CHAT ERROR:", err);
  }
}

test();
