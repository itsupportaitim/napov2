/**
 * Smart Analyze Results Processor
 * Production-ready data processing pipeline for smart analyze results
 */

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

/**
 * Remove duplicate companies based on companyId or companyName
 * @param {Array} results - Array of company results
 * @returns {Array} Filtered array without duplicates
 */
function removeDuplicateCompanies(results) {
  if (!results || results.length === 0) return results;

  const uniqueCompanies = new Map();

  results.forEach(company => {
    const key = company.companyId || company.companyName;
    if (!uniqueCompanies.has(key)) {
      uniqueCompanies.set(key, company);
    }
  });

  return Array.from(uniqueCompanies.values());
}

/**
 * Remove duplicate drivers within each company and merge their logs
 * @param {Array} results - Array of company results
 */
function removeDuplicateDrivers(results) {
  if (!results) return;

  results.forEach(company => {
    if (!company.data) return;

    const uniqueDrivers = new Map();

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
  });
}

/**
 * Filter out specific error messages from logs and track statistics
 * @param {Array} results - Array of company results
 * @param {Object} stats - Statistics object to update
 */
function filterErrorMessages(results, stats) {
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

/**
 * Remove drivers that have no logs after filtering
 * @param {Array} results - Array of company results
 */
function removeEmptyDrivers(results) {
  if (!results) return;

  results.forEach(company => {
    if (!company.data) return;

    company.data = company.data.filter(driver => {
      return driver.logs && driver.logs.length > 0;
    });
  });
}

/**
 * Process smart analyze results through all filters
 * @param {Object} data - Raw data from smartAnalyzeForOrigin
 * @param {Object} options - Processing options
 * @param {boolean} options.verbose - Enable detailed console logging (default: true)
 * @returns {Object} Processed data with statistics
 */
export function processSmartAnalyzeResults(data, options = {}) {
  const { verbose = true } = options;

  if (verbose) {
    console.log('\n' + '='.repeat(80));
    console.log('SMART ANALYZE RESULTS PROCESSOR');
    console.log('='.repeat(80));
  }

  // Initialize statistics
  const stats = {
    totalLogsProcessed: 0,
    totalLogsRemoved: 0,
    warningsRemoved: {},
    companiesProcessed: 0,
    driversProcessed: 0
  };

  // Initialize warning counters
  ERROR_FILTERS.forEach(filter => {
    stats.warningsRemoved[filter.key] = 0;
  });

  // FILTER 1: Remove duplicate companies
  if (verbose) console.log('\n[1/4] Removing duplicate companies...');

  const beforeSuccessful = data.successfulResults?.length || 0;
  const beforeFailed = data.failedResults?.length || 0;
  const beforeAll = data.allResults?.length || 0;

  if (data.successfulResults) {
    data.successfulResults = removeDuplicateCompanies(data.successfulResults);
  }
  if (data.allResults) {
    data.allResults = removeDuplicateCompanies(data.allResults);
  }
  if (data.failedResults) {
    data.failedResults = removeDuplicateCompanies(data.failedResults);
  }

  const duplicateCompaniesRemoved = (beforeSuccessful + beforeFailed + beforeAll) -
    ((data.successfulResults?.length || 0) + (data.failedResults?.length || 0) + (data.allResults?.length || 0));

  if (verbose && duplicateCompaniesRemoved > 0) {
    console.log(`  → Removed ${duplicateCompaniesRemoved} duplicate companies`);
  }
  if (verbose) console.log('✓ Duplicate removal complete');

  // FILTER 2: Remove duplicate drivers
  if (verbose) console.log('\n[2/4] Removing duplicate drivers...');
  removeDuplicateDrivers(data.successfulResults);
  removeDuplicateDrivers(data.allResults);
  removeDuplicateDrivers(data.failedResults);
  if (verbose) console.log('✓ Duplicate driver removal complete');

  // FILTER 3: Filter error messages
  if (verbose) console.log('\n[3/4] Filtering error messages...');
  filterErrorMessages(data.successfulResults, stats);
  filterErrorMessages(data.allResults, stats);
  filterErrorMessages(data.failedResults, stats);

  if (verbose) {
    console.log('  Filters applied:');
    ERROR_FILTERS.forEach(filter => {
      const count = stats.warningsRemoved[filter.key];
      if (count > 0) {
        console.log(`    • ${filter.name}: ${count.toLocaleString()} removed`);
      }
    });
  }
  if (verbose) console.log('✓ Error filtering complete');

  // FILTER 4: Remove empty drivers
  if (verbose) console.log('\n[4/4] Cleaning up empty entries...');
  removeEmptyDrivers(data.successfulResults);
  removeEmptyDrivers(data.allResults);
  removeEmptyDrivers(data.failedResults);
  if (verbose) console.log('✓ Cleanup complete');

  // Update summary
  if (data.summary) {
    data.summary.processedAt = new Date().toISOString();
    data.summary.filtersApplied = ERROR_FILTERS.map(f => f.name);
    data.summary.processingStats = {
      totalLogsProcessed: stats.totalLogsProcessed,
      totalLogsRemoved: stats.totalLogsRemoved,
      remainingLogs: stats.totalLogsProcessed - stats.totalLogsRemoved,
      companiesProcessed: stats.companiesProcessed,
      driversProcessed: stats.driversProcessed,
      warningsRemoved: stats.warningsRemoved
    };
  }

  // Final statistics
  if (verbose) {
    console.log('\n' + '='.repeat(80));
    console.log('PROCESSING SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total logs processed:     ${stats.totalLogsProcessed.toLocaleString()}`);
    console.log(`Total logs removed:       ${stats.totalLogsRemoved.toLocaleString()}`);
    console.log(`Remaining logs:           ${(stats.totalLogsProcessed - stats.totalLogsRemoved).toLocaleString()}`);
    console.log(`Companies processed:      ${stats.companiesProcessed}`);
    console.log(`Drivers processed:        ${stats.driversProcessed}`);
    console.log('='.repeat(80) + '\n');
  }

  return data;
}
