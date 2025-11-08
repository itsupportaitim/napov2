import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean up old result files from the results directory
 * @param {Object} options - Cleanup options
 * @param {string} options.resultsDir - Results directory path (default: "../../results")
 * @param {number} options.maxAgeHours - Maximum age of files to keep in hours (default: 24)
 * @param {boolean} options.dryRun - If true, only list files without deleting (default: false)
 * @param {boolean} options.verbose - Enable detailed logging (default: true)
 * @param {string} options.pattern - File pattern to match (default: all JSON files)
 * @returns {Promise<Object>} Cleanup statistics
 */
export async function cleanupResultFiles(options = {}) {
  const {
    resultsDir = '../../results',
    maxAgeHours = 24,
    dryRun = false,
    verbose = true,
    pattern = null
  } = options;

  try {
    const resultsDirPath = path.join(__dirname, resultsDir);

    // Check if directory exists
    try {
      await fs.access(resultsDirPath);
    } catch (error) {
      if (verbose) {
        console.log(`Results directory does not exist: ${resultsDirPath}`);
      }
      return {
        filesScanned: 0,
        filesDeleted: 0,
        spaceFreed: 0,
        errors: []
      };
    }

    // Read directory
    const files = await fs.readdir(resultsDirPath);
    const jsonFiles = files.filter(file => {
      if (!file.endsWith('.json')) return false;
      if (pattern) {
        return file.includes(pattern);
      }
      return true;
    });

    if (verbose) {
      console.log('\n' + '='.repeat(80));
      console.log('RESULTS CLEANUP UTILITY');
      console.log('='.repeat(80));
      console.log(`Directory: ${resultsDirPath}`);
      console.log(`Max age: ${maxAgeHours} hours`);
      console.log(`Pattern: ${pattern || 'all JSON files'}`);
      console.log(`Mode: ${dryRun ? 'DRY RUN (no files will be deleted)' : 'DELETE MODE'}`);
      console.log('='.repeat(80) + '\n');
    }

    const stats = {
      filesScanned: jsonFiles.length,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: []
    };

    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    const filesToDelete = [];

    // Check each file
    for (const file of jsonFiles) {
      const filePath = path.join(resultsDirPath, file);

      try {
        const stat = await fs.stat(filePath);
        const ageMs = now - stat.mtimeMs;

        if (ageMs > maxAgeMs) {
          filesToDelete.push({
            name: file,
            path: filePath,
            size: stat.size,
            ageHours: (ageMs / (60 * 60 * 1000)).toFixed(1)
          });
        }
      } catch (error) {
        stats.errors.push({
          file,
          error: error.message
        });
      }
    }

    // Display files to be deleted
    if (verbose && filesToDelete.length > 0) {
      console.log(`Found ${filesToDelete.length} files older than ${maxAgeHours} hours:\n`);

      filesToDelete.forEach((file, index) => {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   Age: ${file.ageHours}h | Size: ${sizeMB} MB`);
      });
      console.log();
    }

    // Delete files (unless dry run)
    if (!dryRun && filesToDelete.length > 0) {
      if (verbose) {
        console.log('Deleting files...\n');
      }

      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          stats.filesDeleted++;
          stats.spaceFreed += file.size;

          if (verbose) {
            console.log(`✓ Deleted: ${file.name}`);
          }
        } catch (error) {
          stats.errors.push({
            file: file.name,
            error: error.message
          });
          if (verbose) {
            console.log(`✗ Failed to delete: ${file.name} - ${error.message}`);
          }
        }
      }
    }

    // Summary
    if (verbose) {
      console.log('\n' + '='.repeat(80));
      console.log('CLEANUP SUMMARY');
      console.log('='.repeat(80));
      console.log(`Files scanned:       ${stats.filesScanned}`);
      console.log(`Files deleted:       ${stats.filesDeleted}`);
      console.log(`Space freed:         ${(stats.spaceFreed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Errors:              ${stats.errors.length}`);
      if (dryRun && filesToDelete.length > 0) {
        console.log(`\nNote: This was a dry run. Run with dryRun: false to actually delete files.`);
      }
      console.log('='.repeat(80) + '\n');
    }

    return stats;

  } catch (error) {
    console.error('Cleanup failed:', error.message);
    throw error;
  }
}

/**
 * Clean up all JSON files in the results directory
 * @returns {Promise<Object>} Cleanup statistics
 */
export async function cleanupAllResults() {
  return cleanupResultFiles({
    maxAgeHours: 0, // Delete all files regardless of age
    verbose: true,
    dryRun: false
  });
}

/**
 * Clean up only old files (24+ hours)
 * @returns {Promise<Object>} Cleanup statistics
 */
export async function cleanupOldResults() {
  return cleanupResultFiles({
    maxAgeHours: 24,
    verbose: true,
    dryRun: false
  });
}

/**
 * Preview what would be deleted without actually deleting
 * @param {number} maxAgeHours - Maximum age threshold
 * @returns {Promise<Object>} Cleanup statistics
 */
export async function previewCleanup(maxAgeHours = 24) {
  return cleanupResultFiles({
    maxAgeHours,
    verbose: true,
    dryRun: true
  });
}
