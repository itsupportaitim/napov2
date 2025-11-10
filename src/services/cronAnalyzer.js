import cron from "node-cron";
import axios from "axios";
import { quickRetryAnalyze } from "./originAnalysisWithRetry.js";
import { heroOrigins } from "../mock/heroOrigins.js";

/**
 * Analyzes all origins and sends results to webhook
 */
async function analyzeAllOrigins() {
  console.log("\n" + "=".repeat(80));
  console.log(`[CRON] Starting scheduled analysis for all origins`);
  console.log(`[CRON] Time: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < heroOrigins.length; i++) {
    const origin = heroOrigins[i];
    console.log(`\n[CRON] Processing ${i + 1}/${heroOrigins.length}: ${origin.origin}`);

    try {
      const analysisResult = await quickRetryAnalyze(origin.origin);

      results.push({
        origin: origin.origin,
        success: true,
        timestamp: new Date().toISOString(),
        data: analysisResult
      });

      console.log(`[CRON] ✓ ${origin.origin} completed successfully`);
    } catch (error) {
      console.error(`[CRON] ✗ ${origin.origin} failed:`, error.message);

      results.push({
        origin: origin.origin,
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }

    // Add delay between origins to avoid rate limiting
    if (i < heroOrigins.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

  const summary = {
    totalOrigins: heroOrigins.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    executionTime: `${executionTime}s`,
    timestamp: new Date().toISOString()
  };

  console.log("\n" + "=".repeat(80));
  console.log(`[CRON] Analysis complete: ${summary.successful}/${summary.totalOrigins} successful in ${executionTime}s`);
  console.log("=".repeat(80));

  return {
    summary,
    results
  };
}

/**
 * Sends results to webhook endpoint
 */
async function sendToWebhook(data, webhookUrl) {
  if (!webhookUrl) {
    console.warn("[CRON] No webhook URL configured, skipping webhook send");
    return { sent: false, reason: "No webhook URL configured" };
  }

  try {
    console.log(`[CRON] Sending results to webhook: ${webhookUrl}`);

    const response = await axios.post(webhookUrl, data, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 30000 // 30 second timeout
    });

    console.log(`[CRON] ✓ Webhook sent successfully (status: ${response.status})`);

    return {
      sent: true,
      status: response.status,
      response: response.data
    };
  } catch (error) {
    console.error(`[CRON] ✗ Webhook failed:`, error.message);

    return {
      sent: false,
      error: error.message,
      status: error.response?.status
    };
  }
}

/**
 * Main cron job function
 */
async function runCronJob(webhookUrl) {
  try {
    // Analyze all origins
    const data = await analyzeAllOrigins();

    // Send to webhook
    const webhookResult = await sendToWebhook(data, webhookUrl);

    // Log final status
    if (webhookResult.sent) {
      console.log(`[CRON] Job completed successfully and sent to webhook`);
    } else {
      console.log(`[CRON] Job completed but webhook send failed: ${webhookResult.reason || webhookResult.error}`);
    }
  } catch (error) {
    console.error(`[CRON] Critical error in cron job:`, error.message);
  }
}

// /**
//  * Starts the cron scheduler
//  * @param {Object} options - Configuration options
//  * @param {string} options.schedule - Cron schedule expression (default: "0 */2 * * *" = every 2 hours)
//  * @param {string} options.webhookUrl - Webhook URL to send results to
//  * @param {boolean} options.enabled - Enable/disable cron job (default: true)
//  * @param {boolean} options.runOnStart - Run immediately on start (default: false)
//  */
export function startCronScheduler(options = {}) {
  const {
    schedule = "0 */2 * * *", // Every 2 hours by default
    webhookUrl,
    enabled = true,
    runOnStart = false
  } = options;

  if (!enabled) {
    console.log("[CRON] Cron scheduler is disabled");
    return null;
  }

  if (!webhookUrl) {
    console.warn("[CRON] Warning: No webhook URL provided. Results will not be sent anywhere.");
  }

  console.log("\n" + "=".repeat(80));
  console.log(`[CRON] Scheduler initialized`);
  console.log(`[CRON] Schedule: ${schedule} (every 2 hours)`);
  console.log(`[CRON] Webhook URL: ${webhookUrl || "Not configured"}`);
  console.log(`[CRON] Run on start: ${runOnStart}`);
  console.log("=".repeat(80) + "\n");

  // Validate cron expression
  if (!cron.validate(schedule)) {
    console.error(`[CRON] Invalid cron schedule: ${schedule}`);
    return null;
  }

  // Run immediately if requested
  if (runOnStart) {
    console.log("[CRON] Running initial analysis...");
    runCronJob(webhookUrl).catch(error => {
      console.error("[CRON] Error in initial run:", error);
    });
  }

  // Schedule the cron job
  const task = cron.schedule(schedule, () => {
    runCronJob(webhookUrl);
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  console.log("[CRON] Cron job scheduled successfully");

  return task;
}

// Export individual functions for testing
export { analyzeAllOrigins, sendToWebhook, runCronJob };
