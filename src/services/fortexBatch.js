import { smartAnalyze } from "../apis/fortex.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes smart analyze for all companies in a specific origin with parallel processing
 * @param {string} origin - The origin name (e.g., "HERO", "HERO2", "HERO3", etc.)
 * @param {Object} options - Optional configuration
 * @param {boolean} options.saveToFile - Whether to save results to a JSON file (default: false)
 * @param {string} options.outputDir - Directory to save results (default: "./results")
 * @param {boolean} options.verbose - Enable detailed console logging (default: true)
 * @returns {Promise<Object>} Aggregated results with success/failure statistics
 */
async function smartAnalyzeForOrigin(origin, options = {}) {
  const { saveToFile = false, outputDir = "./results", verbose = true } = options;

  try {
    if (verbose) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Starting Smart Analyze for Origin: ${origin}`);
      console.log(`${'='.repeat(80)}\n`);
    }

    // Read the auth response file
    const authFilePath = path.join(__dirname, "../../authEndpointResponse.json");
    const authData = JSON.parse(await fs.readFile(authFilePath, "utf-8"));

    // Find the specific origin
    const originData = authData.results.find((result) => result.origin === origin);

    if (!originData) {
      throw new Error(
        `Origin "${origin}" not found. Available origins: ${authData.results
          .map((r) => r.origin)
          .join(", ")}`
      );
    }

    const companies = originData.companies;

    if (verbose) {
      console.log(`Found ${companies.length} companies in ${origin}`);
      console.log(
        `Estimated completion time: ${Math.ceil((companies.length * 30) / 60)} - ${Math.ceil(
          (companies.length * 40) / 60
        )} minutes\n`
      );
    }

    // Track start time
    const startTime = Date.now();

    if (verbose) {
      console.log(`Launching ${companies.length} parallel requests...\n`);
    }

    // Progress tracking
    let completedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    // Execute all smartAnalyze calls in parallel
    // Promise.all() waits for ALL promises to complete, not just the first one
    const promises = companies.map((company, index) => {
      return smartAnalyze(origin, company.id)
        .then((data) => {
          completedCount++;
          successCount++;
          if (verbose) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(
              `[${completedCount}/${companies.length}] ✓ ${company.name} (${company.id}) - ${elapsed}s`
            );
          }
          return {
            status: "success",
            companyName: company.name,
            companyId: company.id,
            data: data,
          };
        })
        .catch((error) => {
          completedCount++;
          failedCount++;
          if (verbose) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(
              `[${completedCount}/${companies.length}] ✗ ${company.name} (${company.id}) - ${elapsed}s - ${error.message}`
            );
          }
          return {
            status: "failed",
            companyName: company.name,
            companyId: company.id,
            error: error.message,
            errorDetails: error.response?.data || null,
          };
        });
    });

    // IMPORTANT: Promise.all() waits for ALL promises to complete
    // Even if one company takes 20s and another takes 40s, this will wait for all 40s
    if (verbose) {
      console.log(`Waiting for all ${companies.length} companies to complete...\n`);
    }

    const results = await Promise.all(promises);

    if (verbose) {
      console.log(`\nAll ${companies.length} companies have finished processing.`);
    }

    // Calculate execution time
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Aggregate results
    const successResults = results.filter((r) => r.status === "success");
    const failedResults = results.filter((r) => r.status === "failed");

    // Prepare summary
    const summary = {
      origin: origin,
      totalCompanies: companies.length,
      successful: successResults.length,
      failed: failedResults.length,
      successRate: `${((successResults.length / companies.length) * 100).toFixed(2)}%`,
      executionTime: `${executionTime}s`,
      averageTimePerCompany: `${(executionTime / companies.length).toFixed(2)}s`,
    };

    // Log results
    if (verbose) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Final Summary for ${origin}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Total Companies: ${summary.totalCompanies}`);
      console.log(`Successful: ${summary.successful} (${summary.successRate})`);
      console.log(`Failed: ${summary.failed}`);
      console.log(`Total Execution Time: ${summary.executionTime}`);
      console.log(`Average Time per Company: ${summary.averageTimePerCompany}`);
      console.log(`${'='.repeat(80)}\n`);

      if (failedResults.length > 0) {
        console.log(`Failed Companies Summary (${failedResults.length}):`);
        console.log(`${'-'.repeat(80)}`);
        failedResults.forEach((result, index) => {
          console.log(`${index + 1}. ${result.companyName} (${result.companyId})`);
          console.log(`   Error: ${result.error}`);
        });
        console.log(`\n`);
      }
    }

    // Save to file if requested
    if (saveToFile) {
      try {
        const outputDirPath = path.join(__dirname, outputDir);
        await fs.mkdir(outputDirPath, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const outputFile = path.join(
          outputDirPath,
          `${origin}_smart_analyze_${timestamp}.json`
        );

        const outputData = {
          summary: summary,
          successfulResults: successResults,
          failedResults: failedResults,
          allResults: results,
        };

        await fs.writeFile(outputFile, JSON.stringify(outputData, null, 2));

        if (verbose) {
          console.log(`Results saved to: ${outputFile}\n`);
        }
      } catch (saveError) {
        console.error(`Warning: Failed to save results to file:`, saveError.message);
      }
    }

    // Return comprehensive data structure
    return {
      summary: summary,
      successfulResults: successResults,
      failedResults: failedResults,
      allResults: results,
    };
  } catch (error) {
    console.error(`\nCritical Error in smartAnalyzeForOrigin:`, error.message);
    throw error;
  }
}

/**
 * Executes smart analyze for multiple origins sequentially
 * @param {string[]} origins - Array of origin names to process
 * @param {Object} options - Optional configuration passed to smartAnalyzeForOrigin
 * @returns {Promise<Array>} Results for all origins
 */
async function smartAnalyzeForMultipleOrigins(origins, options = {}) {
  const { verbose = true } = options;
  const allOriginResults = [];

  for (const origin of origins) {
    try {
      const result = await smartAnalyzeForOrigin(origin, options);
      allOriginResults.push({
        origin,
        success: true,
        result,
      });
    } catch (error) {
      allOriginResults.push({
        origin,
        success: false,
        error: error.message,
      });
    }
  }

  // Print overall summary
  if (verbose) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Overall Summary - Multiple Origins`);
    console.log(`${'='.repeat(80)}`);
    allOriginResults.forEach((result) => {
      if (result.success) {
        console.log(
          `${result.origin}: ${result.result.summary.successful}/${result.result.summary.totalCompanies} successful (${result.result.summary.successRate})`
        );
      } else {
        console.log(`${result.origin}: FAILED - ${result.error}`);
      }
    });
    console.log(`${'='.repeat(80)}\n`);
  }

  return allOriginResults;
}

/**
 * Executes smart analyze for all available origins
 * @param {Object} options - Optional configuration
 * @returns {Promise<Array>} Results for all origins
 */
async function smartAnalyzeForAllOrigins(options = {}) {
  try {
    // Read the auth response file to get all origins
    const authFilePath = path.join(__dirname, "../../authEndpointResponse.json");
    const authData = JSON.parse(await fs.readFile(authFilePath, "utf-8"));

    const allOrigins = authData.results.map((result) => result.origin);

    return await smartAnalyzeForMultipleOrigins(allOrigins, options);
  } catch (error) {
    console.error(`Error reading origins data:`, error.message);
    throw error;
  }
}

/**
 * Gets available origins from the auth data file
 * @returns {Promise<Array>} Array of origin names with company counts
 */
async function getAvailableOrigins() {
  try {
    const authFilePath = path.join(__dirname, "../../authEndpointResponse.json");
    const authData = JSON.parse(await fs.readFile(authFilePath, "utf-8"));

    return authData.results.map((result) => ({
      origin: result.origin,
      companiesCount: result.companiesCount,
      companies: result.companies,
    }));
  } catch (error) {
    console.error(`Error reading origins data:`, error.message);
    throw error;
  }
}

export {
  smartAnalyzeForOrigin,
  smartAnalyzeForMultipleOrigins,
  smartAnalyzeForAllOrigins,
  getAvailableOrigins,
};
