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
    });

    return response.data;
  } catch (error) {
    console.error("Error authenticating hero:", error);
    throw error;
  }
}

async function getCompanies(heroToken) {
  try {
    const response = await axios.get("https://backend.apexhos.com/companies", {
      params: {
        $limit: 20000,
        "$select[0]": "name",
        "$select[1]": "companyId"
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `${heroToken}`,
      },
    });

    // Filter out companies that start with "zzz" (case insensitive)
    const filteredCompanies = response.data.data.filter(company =>
      !company.name.toLowerCase().startsWith("zzz")
    );

    return filteredCompanies;
  } catch (error) {
    console.error("Error fetching companies:", error);
    throw error;
  }
}



export { authHero, getCompanies };