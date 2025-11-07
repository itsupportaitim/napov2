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

function getCompanies() {}



export { authHero, getCompanies };