import { smartAnalyzeForOrigin } from '../services/fortexBatch.js';

// Test smartAnalyzeForOrigin with HERO2
console.log('Starting test for HERO2 origin...\n');

try {
  const result = await smartAnalyzeForOrigin('HERO2', {
    verbose: true,
    saveToFile: true,
    outputDir: './results'
  });

  console.log('\nTest completed successfully!');
  console.log('Final result:', {
    origin: result.summary.origin,
    total: result.summary.totalCompanies,
    successful: result.summary.successful,
    failed: result.summary.failed,
    successRate: result.summary.successRate,
    executionTime: result.summary.executionTime
  });
} catch (error) {
  console.error('\nTest failed with error:', error.message);
  process.exit(1);
}
