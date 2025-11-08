import { runOriginAnalysisPipeline } from './originAnalysisPipeline.js';
import { smartAnalyze } from '../apis/fortex.js';

/**
 * Run origin analysis with automatic retries until all companies succeed
 *
 * @param {string} origin - The origin name
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of full origin retries (default: 6)
 * @param {boolean} options.verbose - Enable detailed logging (default: true)
 * @param {boolean} options.retryFailedIndividually - After max retries, retry failed companies one by one (default: true)
 * @param {boolean} options.saveProcessedToFile - Save final results to file (default: false)
 * @returns {Promise<Object>} Final processed results with all companies
 */
export async function runOriginAnalysisWithRetry(origin, options = {}) {
  const {
    maxRetries = 6,
    verbose = true,
    retryFailedIndividually = true,
    saveProcessedToFile = false
  } = options;

  if (verbose) {
    console.log('\n' + '═'.repeat(80));
    console.log(`ORIGIN ANALYSIS WITH RETRY: ${origin}`);
    console.log('═'.repeat(80));
    console.log(`Max retries: ${maxRetries}`);
    console.log(`Individual retry: ${retryFailedIndividually ? 'enabled' : 'disabled'}`);
    console.log('═'.repeat(80) + '\n');
  }

  const startTime = Date.now();
  let bestResult = null;
  let attempt = 0;

  // Phase 1: Retry entire origin until no failures or max retries
  while (attempt < maxRetries) {
    attempt++;

    if (verbose) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`ATTEMPT ${attempt}/${maxRetries}`);
      console.log(`${'─'.repeat(80)}\n`);
    }

    try {
      const result = await runOriginAnalysisPipeline(origin, {
        verbose,
        saveRawToFile: false,
        saveProcessedToFile: false
      });

      // Keep track of best result (most successful companies)
      if (!bestResult || result.summary.successful > bestResult.summary.successful) {
        bestResult = result;
      }

      const failedCount = result.summary.failed;

      if (verbose) {
        console.log(`\nAttempt ${attempt} Summary:`);
        console.log(`  ✓ Successful: ${result.summary.successful}`);
        console.log(`  ✗ Failed: ${failedCount}`);
        console.log(`  Success rate: ${result.summary.successRate}`);
      }

      // If no failures, we're done!
      if (failedCount === 0) {
        if (verbose) {
          console.log(`\n🎉 All companies successful on attempt ${attempt}!`);
        }
        break;
      }

      if (verbose && attempt < maxRetries) {
        console.log(`\n⚠️  ${failedCount} companies failed. Retrying entire origin...`);
        await delay(2000); // Small delay before retry
      }

    } catch (error) {
      console.error(`Attempt ${attempt} failed with error:`, error.message);
      if (!bestResult) {
        throw error; // If first attempt fails completely, throw
      }
    }
  }

  // Phase 2: Individual retry for remaining failures (if enabled)
  if (retryFailedIndividually && bestResult.summary.failed > 0) {
    if (verbose) {
      console.log('\n' + '═'.repeat(80));
      console.log(`INDIVIDUAL RETRY PHASE`);
      console.log('═'.repeat(80));
      console.log(`Retrying ${bestResult.summary.failed} failed companies individually...\n`);
    }

    const failedCompanies = bestResult.failedResults;
    const individualRetries = [];

    for (let i = 0; i < failedCompanies.length; i++) {
      const company = failedCompanies[i];

      if (verbose) {
        console.log(`[${i + 1}/${failedCompanies.length}] Retrying ${company.companyName} (${company.companyId})...`);
      }

      try {
        const data = await smartAnalyze(origin, company.companyId);

        individualRetries.push({
          status: 'success',
          companyName: company.companyName,
          companyId: company.companyId,
          data: data
        });

        if (verbose) {
          console.log(`  ✓ Success`);
        }

      } catch (error) {
        if (verbose) {
          console.log(`  ✗ Still failed: ${error.message}`);
        }
        individualRetries.push({
          status: 'failed',
          companyName: company.companyName,
          companyId: company.companyId,
          error: error.message
        });
      }

      // Small delay between individual retries
      if (i < failedCompanies.length - 1) {
        await delay(1000);
      }
    }

    // Merge individual successes back into bestResult
    const newSuccesses = individualRetries.filter(r => r.status === 'success');
    const stillFailed = individualRetries.filter(r => r.status === 'failed');

    if (newSuccesses.length > 0) {
      if (verbose) {
        console.log(`\n✓ Recovered ${newSuccesses.length} companies through individual retry`);
      }

      // Add new successes to successful results
      bestResult.successfulResults.push(...newSuccesses);

      // Update failed results to only include still-failed companies
      bestResult.failedResults = stillFailed;

      // Update all results
      bestResult.allResults = [
        ...bestResult.successfulResults,
        ...bestResult.failedResults
      ];

      // Reprocess the merged data through filters
      const { processSmartAnalyzeResults } = await import('./smartAnalyzeProcessor.js');
      bestResult = processSmartAnalyzeResults(bestResult, { verbose });

      // Update summary
      bestResult.summary.successful = bestResult.successfulResults.length;
      bestResult.summary.failed = bestResult.failedResults.length;
      bestResult.summary.totalCompanies = bestResult.allResults.length;
      bestResult.summary.successRate = `${((bestResult.summary.successful / bestResult.summary.totalCompanies) * 100).toFixed(2)}%`;
    }
  }

  // Calculate total execution time
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Add retry metadata to summary
  bestResult.summary.retryMetadata = {
    totalAttempts: attempt,
    maxRetries,
    individualRetryUsed: retryFailedIndividually,
    totalExecutionTime: `${totalTime}s`
  };

  // Save to file if requested
  if (saveProcessedToFile) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const outputDir = path.join(__dirname, './results');
    await fs.mkdir(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `${origin}_complete.json`);
    await fs.writeFile(outputFile, JSON.stringify(bestResult, null, 2));

    if (verbose) {
      console.log(`\n✓ Results saved to: ${outputFile}`);
    }
  }

  // Final summary
  if (verbose) {
    console.log('\n' + '═'.repeat(80));
    console.log('FINAL SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Origin:                ${origin}`);
    console.log(`Total attempts:        ${attempt}/${maxRetries}`);
    console.log(`Total execution time:  ${totalTime}s`);
    console.log(`Companies total:       ${bestResult.summary.totalCompanies}`);
    console.log(`Companies successful:  ${bestResult.summary.successful}`);
    console.log(`Companies failed:      ${bestResult.summary.failed}`);
    console.log(`Success rate:          ${bestResult.summary.successRate}`);

    if (bestResult.summary.processingStats) {
      const stats = bestResult.summary.processingStats;
      console.log(`Logs processed:        ${stats.totalLogsProcessed.toLocaleString()}`);
      console.log(`Logs filtered:         ${stats.totalLogsRemoved.toLocaleString()}`);
      console.log(`Logs remaining:        ${stats.remainingLogs.toLocaleString()}`);
    }

    if (bestResult.summary.failed > 0) {
      console.log(`\n⚠️  WARNING: ${bestResult.summary.failed} companies still failed after all retries:`);
      bestResult.failedResults.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.companyName} - ${company.error}`);
      });
    } else {
      console.log(`\n🎉 SUCCESS: All companies processed successfully!`);
    }

    console.log('═'.repeat(80) + '\n');
  }

  return bestResult;
}

/**
 * Helper function to add delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Quick retry analysis with default settings
 */
export async function quickRetryAnalyze(origin) {
  return runOriginAnalysisWithRetry(origin, {
    maxRetries: 6,
    verbose: true,
    retryFailedIndividually: true,
    saveProcessedToFile: false
  });
}

/**
 * Complete analysis with retries and save to file
 */
export async function completeRetryAnalyze(origin) {
  return runOriginAnalysisWithRetry(origin, {
    maxRetries: 6,
    verbose: true,
    retryFailedIndividually: true,
    saveProcessedToFile: true
  });
}
