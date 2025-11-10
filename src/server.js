import express from "express";
import dotenv from "dotenv";
import { authHero, getCompanies } from "./apis/hero.js";
import { heroOrigins } from "./mock/heroOrigins.js";
import { runOriginAnalysisPipeline, quickAnalyze } from "./services/originAnalysisPipeline.js";
import { cleanupResultFiles, cleanupOldResults } from "./utils/cleanupResults.js";
import { runOriginAnalysisWithRetry, quickRetryAnalyze } from "./services/originAnalysisWithRetry.js";
import { startCronScheduler } from "./services/cronAnalyzer.js";

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

// ============================================================================
// ORIGIN ANALYSIS PIPELINE ENDPOINTS
// ============================================================================

/**
 * GET /api/analyze/:origin
 * Quick analysis - processes everything in-memory, returns results
 * No files saved, optimal for production use
 *
 * Example: GET /api/analyze/HERO2
 */
app.get("/api/analyze/:origin", async (req, res) => {
  const { origin } = req.params;

  try {
    console.log(`\n[API] Starting quick analysis for origin: ${origin}`);
    const startTime = Date.now();

    // Run pipeline in-memory (no files saved)
    const result = await quickAnalyze(origin);

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[API] Analysis completed in ${executionTime}s`);

    res.json({
      success: true,
      executionTime: `${executionTime}s`,
      data: result
    });
  } catch (error) {
    console.error(`[API] Analysis failed for ${origin}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      origin
    });
  }
});

/**
 * POST /api/analyze/:origin
 * Advanced analysis with custom options
 *
 * Body options:
 * - verbose: boolean (default: false for API)
 * - saveRawToFile: boolean (default: false)
 * - saveProcessedToFile: boolean (default: false)
 * - outputDir: string (default: "./results")
 * - cleanupOldFiles: boolean (default: false)
 *
 * Example: POST /api/analyze/HERO2
 * Body: { "saveProcessedToFile": true, "cleanupOldFiles": true }
 */
app.post("/api/analyze/:origin", async (req, res) => {
  const { origin } = req.params;
  const options = req.body || {};

  try {
    console.log(`\n[API] Starting custom analysis for origin: ${origin}`);
    console.log(`[API] Options:`, options);
    const startTime = Date.now();

    // Run pipeline with custom options (verbose disabled for API by default)
    const result = await runOriginAnalysisPipeline(origin, {
      verbose: options.verbose || false,
      saveRawToFile: options.saveRawToFile || false,
      saveProcessedToFile: options.saveProcessedToFile || false,
      outputDir: options.outputDir || './results'
    });

    // Optional cleanup of old files
    let cleanupStats = null;
    if (options.cleanupOldFiles) {
      console.log(`[API] Cleaning up old result files...`);
      cleanupStats = await cleanupOldResults();
    }

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[API] Analysis completed in ${executionTime}s`);

    res.json({
      success: true,
      executionTime: `${executionTime}s`,
      data: result,
      cleanup: cleanupStats
    });
  } catch (error) {
    console.error(`[API] Analysis failed for ${origin}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      origin
    });
  }
});

/**
 * GET /api/cleanup
 * Preview what files would be cleaned up (dry run)
 *
 * Query params:
 * - maxAgeHours: number (default: 24)
 *
 * Example: GET /api/cleanup?maxAgeHours=48
 */
app.get("/api/cleanup", async (req, res) => {
  try {
    const maxAgeHours = parseInt(req.query.maxAgeHours) || 24;
    console.log(`\n[API] Previewing cleanup (files older than ${maxAgeHours}h)...`);

    const stats = await cleanupResultFiles({
      maxAgeHours,
      dryRun: true,
      verbose: false
    });

    res.json({
      success: true,
      preview: true,
      stats
    });
  } catch (error) {
    console.error(`[API] Cleanup preview failed:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/cleanup
 * Actually delete old result files
 *
 * Query params:
 * - maxAgeHours: number (default: 24)
 *
 * Example: DELETE /api/cleanup?maxAgeHours=48
 */
app.delete("/api/cleanup", async (req, res) => {
  try {
    const maxAgeHours = parseInt(req.query.maxAgeHours) || 24;
    console.log(`\n[API] Cleaning up files older than ${maxAgeHours}h...`);

    const stats = await cleanupResultFiles({
      maxAgeHours,
      dryRun: false,
      verbose: false
    });

    console.log(`[API] Cleanup complete: ${stats.filesDeleted} files deleted, ${(stats.spaceFreed / 1024 / 1024).toFixed(2)} MB freed`);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error(`[API] Cleanup failed:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/origins
 * Get list of available origins
 */
app.get("/api/origins", (_req, res) => {
  try {
    const origins = heroOrigins.map(origin => ({
      name: origin.origin,
      email: origin.email
    }));

    res.json({
      success: true,
      count: origins.length,
      origins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RETRY ENDPOINTS (RECOMMENDED FOR PRODUCTION)
// ============================================================================

/**
 * GET /api/analyze-retry/:origin
 * Complete analysis with automatic retries until all companies succeed
 * This is the RECOMMENDED endpoint for production use
 *
 * Query params:
 * - maxRetries: number (default: 6) - Maximum retry attempts
 * - individualRetry: boolean (default: true) - Retry failed companies individually after max retries
 *
 * Example: GET /api/analyze-retry/HERO2?maxRetries=6
 */
app.get("/api/analyze-retry/:origin", async (req, res) => {
  const { origin } = req.params;
  const maxRetries = parseInt(req.query.maxRetries) || 6;
  const individualRetry = req.query.individualRetry !== 'false';

  try {
    console.log(`\n[API] Starting retry analysis for origin: ${origin}`);
    console.log(`[API] Max retries: ${maxRetries}, Individual retry: ${individualRetry}`);
    const startTime = Date.now();

    const result = await runOriginAnalysisWithRetry(origin, {
      maxRetries,
      verbose: false, // Disable verbose for API
      retryFailedIndividually: individualRetry,
      saveProcessedToFile: false
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[API] Retry analysis completed in ${executionTime}s`);
    console.log(`[API] Final result: ${result.summary.successful}/${result.summary.totalCompanies} successful (${result.summary.successRate})`);

    res.json({
      success: true,
      executionTime: `${executionTime}s`,
      data: result
    });
  } catch (error) {
    console.error(`[API] Retry analysis failed for ${origin}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      origin
    });
  }
});

/**
 * POST /api/analyze-retry/:origin
 * Advanced retry analysis with full options
 *
 * Body options:
 * - maxRetries: number (default: 6)
 * - verbose: boolean (default: false)
 * - retryFailedIndividually: boolean (default: true)
 * - saveProcessedToFile: boolean (default: false)
 *
 * Example: POST /api/analyze-retry/HERO2
 * Body: { "maxRetries": 10, "saveProcessedToFile": true }
 */
app.post("/api/analyze-retry/:origin", async (req, res) => {
  const { origin } = req.params;
  const options = req.body || {};

  try {
    console.log(`\n[API] Starting custom retry analysis for origin: ${origin}`);
    console.log(`[API] Options:`, options);
    const startTime = Date.now();

    const result = await runOriginAnalysisWithRetry(origin, {
      maxRetries: options.maxRetries || 6,
      verbose: options.verbose || false,
      retryFailedIndividually: options.retryFailedIndividually !== false,
      saveProcessedToFile: options.saveProcessedToFile || false
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[API] Retry analysis completed in ${executionTime}s`);
    console.log(`[API] Final result: ${result.summary.successful}/${result.summary.totalCompanies} successful`);

    res.json({
      success: true,
      executionTime: `${executionTime}s`,
      data: result
    });
  } catch (error) {
    console.error(`[API] Retry analysis failed for ${origin}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      origin
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`${'='.repeat(80)}`);
  console.log('\nAvailable Endpoints:');
  console.log(`  Auth:          GET  http://localhost:${PORT}/auth`);
  console.log(`  Health:        GET  http://localhost:${PORT}/health`);
  console.log(`  Origins:       GET  http://localhost:${PORT}/api/origins`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`  ⭐ RECOMMENDED (with auto-retry):`);
  console.log(`  Analyze+Retry: GET  http://localhost:${PORT}/api/analyze-retry/:origin`);
  console.log(`  Analyze+Retry: POST http://localhost:${PORT}/api/analyze-retry/:origin`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`  Basic (single attempt):`);
  console.log(`  Analyze:       GET  http://localhost:${PORT}/api/analyze/:origin`);
  console.log(`  Analyze:       POST http://localhost:${PORT}/api/analyze/:origin`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`  Cleanup:       GET  http://localhost:${PORT}/api/cleanup`);
  console.log(`  Cleanup:       DEL  http://localhost:${PORT}/api/cleanup`);
  console.log(`${'='.repeat(80)}\n`);

  // Initialize cron scheduler
  startCronScheduler({
    schedule: process.env.CRON_SCHEDULE || "0 */2 * * *",
    webhookUrl: process.env.CRON_WEBHOOK_URL,
    enabled: process.env.CRON_ENABLED === "true",
    runOnStart: process.env.CRON_RUN_ON_START === "true"
  });
});




