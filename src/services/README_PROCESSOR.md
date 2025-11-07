# Smart Analyze Results Processor

A comprehensive pipeline to process and clean smart analyze results JSON files.

## Features

1. **Remove Duplicate Companies** - Deduplicates companies based on `companyId`
2. **Remove Duplicate Drivers** - Merges duplicate drivers within companies
3. **Filter Error Messages** - Removes unwanted error/warning messages
4. **Clean Empty Entries** - Removes drivers with no logs after filtering

## Usage

### Basic Usage

```bash
node src/services/processSmartAnalyzeResults.js <input-file>
```

This will create a file with `_processed.json` suffix.

### Custom Output File

```bash
node src/services/processSmartAnalyzeResults.js <input-file> <output-file>
```

### Examples

```bash
# Process HERO2 results
node src/services/processSmartAnalyzeResults.js src/services/results/HERO2_smart_analyze_2025-11-07T21-02-08-898Z.json

# Process with custom output name
node src/services/processSmartAnalyzeResults.js src/services/results/HERO2_smart_analyze_2025-11-07T21-02-08-898Z.json src/services/results/HERO2_FINAL.json
```

## Current Filters

The processor currently filters out:
- `SEQUENTIAL ID BREAK WARNING` - Removes all sequential ID break warnings

## Adding New Filters

To add more filters, edit `processSmartAnalyzeResults.js` and add to the `ERROR_FILTERS` array:

```javascript
const ERROR_FILTERS = [
  {
    name: 'SEQUENTIAL ID BREAK WARNING',
    match: (errorMessage) => errorMessage && errorMessage.trim() === 'SEQUENTIAL ID BREAK WARNING',
    key: 'sequentialIdBreak'
  },
  // Add your new filter here:
  {
    name: 'LOCATION ERROR',
    match: (errorMessage) => errorMessage && errorMessage.includes('LOCATION ERROR'),
    key: 'locationError'
  }
];
```

## Output

The processor:
- Prints detailed progress and statistics
- Shows how many errors of each type were removed
- Provides final summary of logs processed vs removed
- Adds metadata to the output JSON (`processedAt` and `filtersApplied`)

### Sample Output

```
================================================================================
SMART ANALYZE RESULTS PROCESSOR
================================================================================
Input:  C:\...\HERO2_smart_analyze_2025-11-07T21-02-08-898Z.json
Output: C:\...\HERO2_smart_analyze_2025-11-07T21-02-08-898Z_processed.json
================================================================================

[1/5] Reading input file...
✓ File loaded (5.98 MB)

[2/5] Removing duplicate companies...
✓ Duplicate removal complete

[3/5] Removing duplicate drivers...
  → Removed 1 duplicate drivers
✓ Duplicate driver removal complete

[4/5] Filtering error messages...
  Filters applied:
    • SEQUENTIAL ID BREAK WARNING: 26,014 removed
✓ Error filtering complete

[5/5] Cleaning up empty entries...
✓ Cleanup complete

[FINAL] Writing processed file...
✓ File written: 1.73 MB

================================================================================
PROCESSING SUMMARY
================================================================================
Total logs processed:     35,386
Total logs removed:       26,014
Remaining logs:           9,372
Companies processed:      46
Drivers processed:        362
================================================================================
```

## File Structure

The processor works with JSON files in this format:

```json
{
  "summary": { ... },
  "successfulResults": [ ... ],
  "allResults": [ ... ],
  "failedResults": [ ... ]
}
```

It processes all three result arrays: `successfulResults`, `allResults`, and `failedResults`.
