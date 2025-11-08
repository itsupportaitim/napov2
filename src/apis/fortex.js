import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

/**
 * Fetches smart analyze data for a specific company and origin
 * @param {string} origin - The Hero origin (e.g., "HERO", "HERO2", "HERO3", etc.)
 * @param {string} companyId - The company ID (e.g., "Company:8VvGSxT2el")
 * @param {string} accessToken - The Hero access token for authentication
 * @returns {Promise<Object>} The smart analyze data
 */

const fortexAuth = process.env.FORTEX_AUTH;

async function smartAnalyze(origin, companyId) {
  try {
    const url = `https://api.fortex-hero.us/monitoring/smart-analyze/${origin}/${companyId}`;

    console.log(`Fetching smart analyze data for ${companyId} from ${origin}...`);

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `${fortexAuth}`,
      },
      timeout: 120000, // 120 second timeout
    });

    console.log(`Smart analyze data received for ${companyId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching smart analyze data for ${companyId} from ${origin}:`, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

export { smartAnalyze };
