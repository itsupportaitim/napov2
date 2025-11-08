import { runOriginAnalysisWithRetry, quickRetryAnalyze, completeRetryAnalyze } from '../services/originAnalysisWithRetry.js';

/**
 * Test the retry pipeline with full automation
 *
 * Usage:
 *   node src/test/testRetryPipeline.js [origin] [mode] [maxRetries]
 *
 * Examples:
 *   node src/test/testRetryPipeline.js HERO2                    # Default: 6 retries
 *   node src/test/testRetryPipeline.js HERO2 quick              # Quick mode
 *   node src/test/testRetryPipeline.js HERO2 complete           # Save to file
 *   node src/test/testRetryPipeline.js HERO2 custom 10          # Custom retries
 */

async function main() {
  const args = process.argv.slice(2);
  const origin = args[0] || 'HERO2';
  const mode = args[1] || 'quick';
  const maxRetries = parseInt(args[2]) || 6;

  console.log(`Starting retry analysis pipeline for: ${origin}`);
  console.log(`Mode: ${mode}`);
  console.log(`Max retries: ${maxRetries}\n`);

  try {
    let result;

    switch (mode) {
      case 'complete':
        // Run with retries and save to file
        result = await completeRetryAnalyze(origin);
        break;

      case 'custom':
        // Custom configuration
        result = await runOriginAnalysisWithRetry(origin, {
          maxRetries,
          verbose: true,
          retryFailedIndividually: true,
          saveProcessedToFile: false
        });
        break;

      case 'no-individual':
        // Retry entire origin only, no individual retries
        result = await runOriginAnalysisWithRetry(origin, {
          maxRetries,
          verbose: true,
          retryFailedIndividually: false,
          saveProcessedToFile: false
        });
        break;

      case 'quick':
      default:
        // Quick mode with default settings
        result = await quickRetryAnalyze(origin);
        break;
    }

    // Final output
    console.log('✅ Retry pipeline completed!');
    console.log('\nFinal Statistics:');
    console.log(`  Origin:            ${result.summary.origin}`);
    console.log(`  Total attempts:    ${result.summary.retryMetadata.totalAttempts}/${result.summary.retryMetadata.maxRetries}`);
    console.log(`  Execution time:    ${result.summary.retryMetadata.totalExecutionTime}`);
    console.log(`  Companies total:   ${result.summary.totalCompanies}`);
    console.log(`  Successful:        ${result.summary.successful} (${result.summary.successRate})`);
    console.log(`  Failed:            ${result.summary.failed}`);

    if (result.summary.processingStats) {
      console.log(`\nData Processing:`);
      console.log(`  Logs processed:    ${result.summary.processingStats.totalLogsProcessed.toLocaleString()}`);
      console.log(`  Logs filtered:     ${result.summary.processingStats.totalLogsRemoved.toLocaleString()}`);
      console.log(`  Logs remaining:    ${result.summary.processingStats.remainingLogs.toLocaleString()}`);
    }

    if (result.summary.failed === 0) {
      console.log('\n🎉 All companies processed successfully!');
    } else {
      console.log(`\n⚠️  ${result.summary.failed} companies still failed after all retries.`);
    }

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();
