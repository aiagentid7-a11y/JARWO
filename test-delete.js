import fs from "fs";
import path from "path";

const EMPLOYEES_FILE = path.join(process.cwd(), "data", "employees.json");

function loadEmployees() {
  const content = fs.readFileSync(EMPLOYEES_FILE, "utf-8");
  return JSON.parse(content);
}

function saveEmployees(employees) {
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(employees, null, 2), "utf-8");
}

function test() {
  try {
    const employees = loadEmployees();
    console.log("Original employee count:", employees.length);
    
    // Add two dummy employees
    const dummy1 = { id: "emp_dummy_1", globalNo: 9991, name: "Dummy One", department: "MANAGEMENT", isLocal: true, age: "30", birthDate: "1996-01-01", startDate: "2026-01-01", status: "PKWT", education: "S1" };
    const dummy2 = { id: "emp_dummy_2", globalNo: 9992, name: "Dummy Two", department: "MANAGEMENT", isLocal: true, age: "30", birthDate: "1996-01-01", startDate: "2026-01-01", status: "PKWT", education: "S1" };
    
    employees.push(dummy1, dummy2);
    saveEmployees(employees);
    
    let updated = loadEmployees();
    console.log("After adding dummies, count:", updated.length);
    
    // Now simulate bulk delete
    const idsToDelete = ["emp_dummy_1", "emp_dummy_2"];
    updated = updated.filter(e => !idsToDelete.includes(e.id));
    saveEmployees(updated);
    
    const finalEmps = loadEmployees();
    console.log("After bulk delete, count:", finalEmps.length);
    
    if (finalEmps.some(e => idsToDelete.includes(e.id))) {
      console.error("FAIL: Dummies still exist!");
    } else {
      console.log("SUCCESS: Dummies deleted successfully!");
    }
  } catch (err) {
    console.error("Error in test:", err);
  }
}

test();
