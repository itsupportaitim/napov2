import { smartAnalyzeForOrigin } from './fortexBatch.js';
import { processSmartAnalyzeResults } from './smartAnalyzeProcessor.js';

/**
 * Full pipeline for origin analysis
 * Executes smart analyze for an origin and processes the results in-memory
 *
 * @param {string} origin - The origin name (e.g., "HERO2", "HERO3", etc.)
 * @param {Object} options - Pipeline options
 * @param {boolean} options.verbose - Enable detailed console logging (default: true)
 * @param {boolean} options.saveRawToFile - Save unprocessed results to file (default: false)
 * @param {boolean} options.saveProcessedToFile - Save processed results to file (default: false)
 * @param {string} options.outputDir - Directory to save results (default: "./results")
 * @returns {Promise<Object>} Processed results with full statistics
 */
export async function runOriginAnalysisPipeline(origin, options = {}) {
  const {
    verbose = true,
    saveRawToFile = false,
    saveProcessedToFile = false,
    outputDir = './results'
  } = options;

  try {
    const startTime = Date.now();

    if (verbose) {
      console.log('\n' + '═'.repeat(80));
      console.log(`ORIGIN ANALYSIS PIPELINE: ${origin}`);
      console.log('═'.repeat(80));
      console.log('Phase 1: Smart Analyze');
      console.log('═'.repeat(80));
    }

    // PHASE 1: Execute smart analyze (in-memory)
    const rawResults = await smartAnalyzeForOrigin(origin, {
      verbose,
      saveToFile: saveRawToFile,
      outputDir
    });

    if (verbose) {
      console.log('\n' + '═'.repeat(80));
      console.log('Phase 2: Data Processing & Filtering');
      console.log('═'.repeat(80));
    }

    // PHASE 2: Process results (in-memory)
    const processedResults = processSmartAnalyzeResults(rawResults, { verbose });

    // Calculate total pipeline execution time
    const totalExecutionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Add pipeline metadata to summary
    if (processedResults.summary) {
      processedResults.summary.pipelineExecutionTime = `${totalExecutionTime}s`;
      processedResults.summary.pipelineCompleted = new Date().toISOString();
    }

    // Optionally save processed results to file
    if (saveProcessedToFile) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const outputDirPath = path.join(__dirname, outputDir);
      await fs.mkdir(outputDirPath, { recursive: true });

      const outputFile = path.join(
        outputDirPath,
        `${origin}_processed.json`
      );

      await fs.writeFile(outputFile, JSON.stringify(processedResults, null, 2));

      if (verbose) {
        const fileSize = (await fs.stat(outputFile)).size;
        console.log(`\n✓ Processed results saved to: ${outputFile}`);
        console.log(`  File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      }
    }

    // Final summary
    if (verbose) {
      console.log('\n' + '═'.repeat(80));
      console.log('PIPELINE COMPLETED');
      console.log('═'.repeat(80));
      console.log(`Origin:                   ${origin}`);
      console.log(`Total execution time:     ${totalExecutionTime}s`);
      console.log(`Companies analyzed:       ${processedResults.summary.totalCompanies}`);
      console.log(`Successful:               ${processedResults.summary.successful}`);
      console.log(`Failed:                   ${processedResults.summary.failed}`);

      if (processedResults.summary.processingStats) {
        const stats = processedResults.summary.processingStats;
        console.log(`Logs processed:           ${stats.totalLogsProcessed.toLocaleString()}`);
        console.log(`Logs filtered out:        ${stats.totalLogsRemoved.toLocaleString()}`);
        console.log(`Remaining logs:           ${stats.remainingLogs.toLocaleString()}`);
        console.log(`Filter efficiency:        ${((stats.totalLogsRemoved / stats.totalLogsProcessed) * 100).toFixed(2)}% removed`);
      }

      console.log('═'.repeat(80) + '\n');
    }

    return processedResults;

  } catch (error) {
    console.error(`\n❌ Pipeline failed for origin ${origin}:`, error.message);
    throw error;
  }
}

/**
 * Convenience function for quick analysis with default settings
 * @param {string} origin - The origin name
 * @returns {Promise<Object>} Processed results
 */
export async function quickAnalyze(origin) {
  return runOriginAnalysisPipeline(origin, {
    verbose: true,
    saveRawToFile: false,
    saveProcessedToFile: false
  });
}

/**
 * Run analysis and save results to files
 * @param {string} origin - The origin name
 * @returns {Promise<Object>} Processed results
 */
export async function analyzeAndSave(origin) {
  return runOriginAnalysisPipeline(origin, {
    verbose: true,
    saveRawToFile: false,
    saveProcessedToFile: true
  });
}
