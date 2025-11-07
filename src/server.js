import express from "express";
import dotenv from "dotenv";
import { authHero, getCompanies } from "./apis/hero.js";
import { heroOrigins } from "./mock/heroOrigins.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Authentication endpoint with pipeline to get companies from all origins
app.get("/auth", async (_req, res) => {
  try {
    const results = [];
    let processedCount = 0;

    console.log(`Starting to process ${heroOrigins.length} origins...`);

    // Loop through all hero origins
    for (const origin of heroOrigins) {
      try {
        console.log(`\n[${processedCount + 1}/${heroOrigins.length}] Processing origin: ${origin.origin}`);

        // Step 1: Authenticate and get token for this origin
        console.log(`  - Authenticating ${origin.email}...`);
        const authData = await authHero(
          origin.email,
          origin.password,
          null
        );

        const token = authData.accessToken || authData.token;
        console.log(`  - Token received: ${token.substring(0, 20)}...`);

        // Add a small delay before fetching companies
        await delay(500);

        // Step 2: Use the token to get companies
        console.log(`  - Fetching companies...`);
        const companies = await getCompanies(token);
        console.log(`  - Found ${companies.length} companies`);

        // Add to results with origin info
        results.push({
          origin: origin.origin,
          companies: companies.map(company => ({
            name: company.name,
            id: company.companyId
          })),
          companiesCount: companies.length
        });

        processedCount++;

        // Add delay between processing different origins
        if (processedCount < heroOrigins.length) {
          console.log(`  - Waiting before next origin...`);
          await delay(1000);
        }
      } catch (originError) {
        // If one origin fails, continue with others but log the error
        console.error(`  - ERROR for ${origin.origin}:`, originError.message);
        if (originError.response) {
          console.error(`  - Response status:`, originError.response.status);
          console.error(`  - Response data:`, originError.response.data);
        }
        results.push({
          origin: origin.origin,
          error: originError.message,
          companies: [],
          companiesCount: 0
        });
        processedCount++;
      }
    }

    console.log(`\nCompleted processing all ${processedCount} origins`);

    res.json({
      success: true,
      totalOrigins: heroOrigins.length,
      results: results
    });
  } catch (error) {
    console.error("Critical error in /auth endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Process failed"
    });
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Authentication endpoint: GET http://localhost:${PORT}/auth`);
});




