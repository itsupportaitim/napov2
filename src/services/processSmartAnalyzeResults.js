import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process smart analyze results through multiple filters
 * Usage: node src/services/processSmartAnalyzeResults.js <input-file> [output-file]
 */

// Get input/output files from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node src/services/processSmartAnalyzeResults.js <input-file> [output-file]');
  console.error('Example: node src/services/processSmartAnalyzeResults.js src/services/results/HERO2_smart_analyze_2025-11-07T21-02-08-898Z.json');
  process.exit(1);
}

const inputFile = path.resolve(args[0]);
const outputFile = args[1]
  ? path.resolve(args[1])
  : inputFile.replace('.json', '_processed.json');

console.log('='.repeat(80));
console.log('SMART ANALYZE RESULTS PROCESSOR');
console.log('='.repeat(80));
console.log(`Input:  ${inputFile}`);
console.log(`Output: ${outputFile}`);
console.log('='.repeat(80));

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

// Read input file
console.log('\n[1/5] Reading input file...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
console.log(`✓ File loaded (${(fs.statSync(inputFile).size / 1024 / 1024).toFixed(2)} MB)`);

// Statistics
let stats = {
  totalLogsProcessed: 0,
  totalLogsRemoved: 0,
  warningsRemoved: {
    sequentialIdBreak: 0,
    // Add more warning types here
  },
  companiesProcessed: 0,
  driversProcessed: 0
};

/**
 * FILTER 1: Remove duplicate companies
 */
console.log('\n[2/5] Removing duplicate companies...');
function removeDuplicateCompanies(results) {
  if (!results || results.length === 0) return results;

  const originalCount = results.length;
  const uniqueCompanies = new Map();

  results.forEach(company => {
    const key = company.companyId || company.companyName;
    if (!uniqueCompanies.has(key)) {
      uniqueCompanies.set(key, company);
    }
  });

  const unique = Array.from(uniqueCompanies.values());
  const duplicatesRemoved = originalCount - unique.length;

  if (duplicatesRemoved > 0) {
    console.log(`  → Removed ${duplicatesRemoved} duplicate companies`);
  }

  return unique;
}

// Apply to all result arrays
if (data.successfulResults) {
  data.successfulResults = removeDuplicateCompanies(data.successfulResults);
}
if (data.allResults) {
  data.allResults = removeDuplicateCompanies(data.allResults);
}
if (data.failedResults) {
  data.failedResults = removeDuplicateCompanies(data.failedResults);
}
console.log('✓ Duplicate removal complete');

/**
 * FILTER 2: Remove duplicate drivers within companies
 */
console.log('\n[3/5] Removing duplicate drivers...');
function removeDuplicateDrivers(results) {
  if (!results) return;

  let totalDuplicates = 0;

  results.forEach(company => {
    if (!company.data) return;

    const uniqueDrivers = new Map();
    const originalCount = company.data.length;

    company.data.forEach(driver => {
      const key = driver.driverName || driver.driverId;
      if (!uniqueDrivers.has(key)) {
        uniqueDrivers.set(key, driver);
      } else {
        // Merge logs from duplicate driver
        const existing = uniqueDrivers.get(key);
        if (driver.logs && existing.logs) {
          existing.logs = [...existing.logs, ...driver.logs];
        }
      }
    });

    company.data = Array.from(uniqueDrivers.values());
    const removed = originalCount - company.data.length;
    if (removed > 0) {
      totalDuplicates += removed;
    }
  });

  if (totalDuplicates > 0) {
    console.log(`  → Removed ${totalDuplicates} duplicate drivers`);
  }
}

removeDuplicateDrivers(data.successfulResults);
removeDuplicateDrivers(data.allResults);
removeDuplicateDrivers(data.failedResults);
console.log('✓ Duplicate driver removal complete');

/**
 * FILTER 3: Filter out specific error messages
 */
console.log('\n[4/5] Filtering error messages...');

const ERROR_FILTERS = [
  {
    name: 'SEQUENTIAL ID BREAK WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'SEQUENTIAL ID BREAK WARNING',
    key: 'sequentialIdBreak'
  },
  {
    name: 'ENGINE HOURS HAVE CHANGED AFTER SHUT DOWN WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'ENGINE HOURS HAVE CHANGED AFTER SHUT DOWN WARNING',
    key: 'engineHoursAfterShutdown'
  },
  {
    name: 'ODOMETER ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'ODOMETER ERROR',
    key: 'odometerError'
  },
  {
    name: 'DIAGNOSTIC EVENT',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'DIAGNOSTIC EVENT',
    key: 'diagnosticEvent'
  },
  { 
    name: 'LOCATION CHANGED ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'LOCATION CHANGED ERROR',
    key: 'locationChangedError'
  },
  { 
    name: 'INCORRECT INTERMEDIATE PLACEMENT ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'INCORRECT INTERMEDIATE PLACEMENT ERROR',
    key: 'incorrectIntermediatePlacementError'
  },
  { 
    name: 'ENGINE HOURS WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'ENGINE HOURS WARNING',
    key: 'engineHoursWarning'
  },
  { 
    name: 'NO SHUT DOWN ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'NO SHUT DOWN ERROR',
    key: 'noShutdownError'
  },
  { 
    name: 'EXCESSIVE LOG IN WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'EXCESSIVE LOG IN WARNING',
    key: 'excessiveLogInWarning'
  },
  { 
    name: 'EXCESSIVE LOG OUT WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'EXCESSIVE LOG OUT WARNING',
    key: 'excessiveLogOutWarning'
  },
  { 
    name: 'TWO IDENTICAL STATUSES ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'TWO IDENTICAL STATUSES ERROR',
    key: 'twoIdenticalStatusesError'
  },
  { 
    name: 'DRIVING ORIGIN WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'DRIVING ORIGIN WARNING',
    key: 'drivingOriginWarning'
  },
  { 
    name: 'NO DATA IN ODOMETER OR ENGINE HOURS ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'NO DATA IN ODOMETER OR ENGINE HOURS ERROR',
    key: 'noDataInOdometerOrEngineHours'
  },
  { 
    name: 'LOCATION ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'LOCATION ERROR',
    key: 'locationError'
  },
  { 
    name: 'LOCATION DID NOT CHANGE WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'LOCATION DID NOT CHANGE WARNING',
    key: 'locationDidNotChangeWarning'
  },
  { 
    name: 'MISSING INTERMEDIATE ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'MISSING INTERMEDIATE ERROR',
    key: 'missingIntermediateError'
  },
  {
    name: 'INCORRECT STATUS PLACEMENT ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'INCORRECT STATUS PLACEMENT ERROR',
    key: 'incorrectStatusPlacementError'
  },
  {
    name: 'THE SPEED WAS MUCH HIGHER THAN THE SPEED LIMIT IN',
    match: (errorMessage) => errorMessage && errorMessage.trim().startsWith('THE SPEED WAS MUCH HIGHER THAN THE SPEED LIMIT IN'),
    key: 'speedMuchHigherThanLimit'
  },
  {
    name: 'THE SPEED WAS HIGHER THAN THE SPEED',
    match: (errorMessage) => errorMessage && errorMessage.trim().startsWith('THE SPEED WAS HIGHER THAN THE SPEED'),
    key: 'speedHigherThanLimit'
  },
  {
    name: 'EVENT HAS MANUAL LOCATION',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'EVENT HAS MANUAL LOCATION',
    key: 'eventHasManualLocation'
  },
  {
    name: 'NO POWER UP ERROR',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'NO POWER UP ERROR',
    key: 'noPowerUpError'
  },
  {
    name: 'UNIDENTIFIED DRIVER EVENT',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'UNIDENTIFIED DRIVER EVENT',
    key: 'unidentifiedDriverEvent'
  },
];

function filterErrorMessages(results) {
  if (!results) return;

  results.forEach(company => {
    if (!company.data) return;

    stats.companiesProcessed++;

    company.data.forEach(driver => {
      if (!driver.logs || !Array.isArray(driver.logs)) return;

      stats.driversProcessed++;
      const originalLength = driver.logs.length;
      stats.totalLogsProcessed += originalLength;

      // Apply all filters
      driver.logs = driver.logs.filter(log => {
        // Check each filter
        for (const filter of ERROR_FILTERS) {
          if (filter.match(log.errorMessage)) {
            stats.warningsRemoved[filter.key]++;
            stats.totalLogsRemoved++;
            return false; // Remove this log
          }
        }
        return true; // Keep this log
      });
    });
  });
}

// Apply filters to all result arrays
// filterErrorMessages(data.successfulResults);
filterErrorMessages(data.allResults);
// filterErrorMessages(data.failedResults);

// Display filter statistics
console.log('  Filters applied:');
ERROR_FILTERS.forEach(filter => {
  const count = stats.warningsRemoved[filter.key];
  if (count > 0) {
    console.log(`    • ${filter.name}: ${count.toLocaleString()} removed`);
  }
});
console.log('✓ Error filtering complete');

/**
 * FILTER 4: Remove empty drivers (drivers with no logs after filtering)
 */
console.log('\n[5/5] Cleaning up empty entries...');

function removeEmptyDrivers(results) {
  if (!results) return;

  let emptyDriversRemoved = 0;

  results.forEach(company => {
    if (!company.data) return;

    const originalCount = company.data.length;
    company.data = company.data.filter(driver => {
      return driver.logs && driver.logs.length > 0;
    });

    emptyDriversRemoved += (originalCount - company.data.length);
  });

  if (emptyDriversRemoved > 0) {
    console.log(`  → Removed ${emptyDriversRemoved} drivers with no logs`);
  }
}

removeEmptyDrivers(data.successfulResults);
removeEmptyDrivers(data.allResults);
removeEmptyDrivers(data.failedResults);
console.log('✓ Cleanup complete');

// Update summary statistics
if (data.summary) {
  data.summary.processedAt = new Date().toISOString();
  data.summary.filtersApplied = ERROR_FILTERS.map(f => f.name);
}

// Write output file
console.log('\n[FINAL] Writing processed file...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

const outputSize = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
console.log(`✓ File written: ${outputSize} MB`);

// Final statistics
console.log('\n' + '='.repeat(80));
console.log('PROCESSING SUMMARY');
console.log('='.repeat(80));
console.log(`Total logs processed:     ${stats.totalLogsProcessed.toLocaleString()}`);
console.log(`Total logs removed:       ${stats.totalLogsRemoved.toLocaleString()}`);
console.log(`Remaining logs:           ${(stats.totalLogsProcessed - stats.totalLogsRemoved).toLocaleString()}`);
console.log(`Companies processed:      ${stats.companiesProcessed}`);
console.log(`Drivers processed:        ${stats.driversProcessed}`);
console.log('='.repeat(80));
console.log(`\n✓ Processing complete! Output saved to:\n  ${outputFile}\n`);
