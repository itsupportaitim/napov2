import { runOriginAnalysisPipeline, quickAnalyze, analyzeAndSave } from '../services/originAnalysisPipeline.js';
import { cleanupOldResults, previewCleanup } from '../utils/cleanupResults.js';

/**
 * Test the full origin analysis pipeline
 * This replaces the manual two-step process with a single automated pipeline
 *
 * Usage:
 *   node src/test/testOriginPipeline.js [origin] [mode]
 *
 * Examples:
 *   node src/test/testOriginPipeline.js HERO2           # Quick analysis (default)
 *   node src/test/testOriginPipeline.js HERO2 save      # Analyze and save to file
 *   node src/test/testOriginPipeline.js HERO2 cleanup   # Analyze and cleanup old files
 */

async function main() {
  const args = process.argv.slice(2);
  const origin = args[0] || 'HERO2';
  const mode = args[1] || 'quick';

  console.log(`Starting origin analysis pipeline for: ${origin}`);
  console.log(`Mode: ${mode}\n`);

  try {
    let result;

    switch (mode) {
      case 'save':
        // Run pipeline and save processed results to file
        result = await analyzeAndSave(origin);
        break;

      case 'cleanup':
        // Run pipeline, then cleanup old result files
        result = await quickAnalyze(origin);
        console.log('\nCleaning up old result files...');
        await cleanupOldResults();
        break;

      case 'preview':
        // Preview cleanup without deleting
        await previewCleanup(24);
        return;

      case 'full':
        // Full pipeline with custom options
        result = await runOriginAnalysisPipeline(origin, {
          verbose: true,
          saveRawToFile: false,
          saveProcessedToFile: true,
          outputDir: './results'
        });

        // Cleanup old files after saving new ones
        console.log('\nCleaning up old result files...');
        await cleanupOldResults();
        break;

      case 'quick':
      default:
        // Quick in-memory analysis (no files saved)
        result = await quickAnalyze(origin);
        break;
    }

    // Display final summary
    if (result) {
      console.log('✅ Pipeline completed successfully!');
      console.log('\nYou can access the results in the returned object:');
      console.log('  - result.summary: Overall statistics');
      console.log('  - result.successfulResults: Companies with successful analysis');
      console.log('  - result.failedResults: Companies that failed');
      console.log('  - result.allResults: All company results');
    }

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();
