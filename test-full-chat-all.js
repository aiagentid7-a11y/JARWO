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
  console.log("Total employees to compact:", employees.length);
  const compactEmployees = employees.map((e) => ({
    id: e.id,
    nik: e.nik || "-",
    n: e.name,
    p: e.position,
    d: e.department,
    s: e.status,
    l: e.isLocal ? "Lokal" : "Non-Lokal",
    a: e.age || "-"
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
    const start = Date.now();
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
    console.log("Response took ms:", Date.now() - start);
    console.log("Success! Text:", response.text);
  } catch (err) {
    console.error("CRITICAL ALL CHAT ERROR:", err);
  }
}

test();
