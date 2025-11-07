import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function authHero(email, password, company, rCode = "hero", strategy = "local") {
  try {
    const response = await axios.post(`${process.env.HEROURL}/authentication`, {
      email,
      password,
      company,
      rCode,
      strategy,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    return response.data;
  } catch (error) {
    console.error("Error authenticating hero:", error.message);
    throw error;
  }
}

async function getCompanies(heroToken) {
  try {
    console.log(`    Making request to companies API with token: ${heroToken.substring(0, 20)}...`);
    const response = await axios.get("https://backend.apexhos.com/companies", {
      params: {
        $limit: 20000,
        // "$select[0]": "name",
        // "$select[1]": "_id"
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `${heroToken}`,
      },
      timeout: 60000, // 60 second timeout for large data
    });

    console.log(`    Response received, status: ${response.status}`);
    console.log(`    Raw data structure:`, typeof response.data);

    // Check if response.data.data exists
    if (!response.data || !response.data.data) {
      console.error("    Unexpected response structure:", response.data);
      throw new Error("Invalid response structure from companies API");
    }

    // Filter out companies that start with "zzz" or "TEST" (case insensitive)
    const filteredCompanies = response.data.data.filter(company => {
      const lowerName = company.name.toLowerCase();
      return !lowerName.startsWith("zzz") && !lowerName.startsWith("test");
    });

    console.log(`    Filtered ${filteredCompanies.length} companies (removed zzz and TEST companies)`);

    return filteredCompanies;
  } catch (error) {
    console.error("Error fetching companies:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data).substring(0, 200));
    }
    throw error;
  }
}



export { authHero, getCompanies };