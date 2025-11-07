import { smartAnalyze } from "../apis/fortex.js";



function testFortexSmartAnalyzeForCompany() {
    console.log("Starting Fortex smart analyze test...");
 
smartAnalyze("HERO", "Company:0C_FB3lFsp").then(data => {
  console.log("Smart Analyze Data:", data);
}).catch(error => {
  console.error("Error:", error);
});
}


testFortexSmartAnalyzeForCompany();