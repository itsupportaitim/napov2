# Origin Analysis Pipeline - Production Guide

## Overview

The origin analysis pipeline combines the two-step manual process into a single, production-ready automated pipeline that processes data in-memory without generating intermediate JSON files.

## What Changed?

### Before (Manual Process)
```bash
# Step 1: Generate raw results to JSON file
node src/test/testSmartAnalyzeForOrigin.js

# Step 2: Process the JSON file
node src/services/processSmartAnalyzeResults.js src/services/results/HERO2_smart_analyze.json
```

### After (Automated Pipeline)
```bash
# Single command - everything in-memory
node src/test/testOriginPipeline.js HERO2
```

## Key Benefits

1. **In-Memory Processing**: No intermediate JSON files generated (unless explicitly requested)
2. **Production Ready**: Clean, modular code with error handling
3. **Automatic Cleanup**: Optional cleanup of old result files
4. **Flexible Options**: Choose when to save files
5. **Better Performance**: Eliminates disk I/O overhead

## Usage

### Quick Analysis (In-Memory Only)
```bash
node src/test/testOriginPipeline.js HERO2
```
- Runs the full pipeline
- Processes everything in-memory
- No files created
- Returns processed results

### Save Processed Results
```bash
node src/test/testOriginPipeline.js HERO2 save
```
- Runs the pipeline
- Saves only the final processed results
- No intermediate files

### Full Mode with Cleanup
```bash
node src/test/testOriginPipeline.js HERO2 full
```
- Runs the pipeline
- Saves processed results
- Automatically deletes old result files (24+ hours)

### Preview Cleanup
```bash
node src/test/testOriginPipeline.js HERO2 preview
```
- Shows what files would be deleted
- Doesn't actually delete anything

## Programmatic Usage

### Option 1: Quick Analysis
```javascript
import { quickAnalyze } from './src/services/originAnalysisPipeline.js';

const result = await quickAnalyze('HERO2');
console.log(result.summary);
```

### Option 2: Custom Configuration
```javascript
import { runOriginAnalysisPipeline } from './src/services/originAnalysisPipeline.js';

const result = await runOriginAnalysisPipeline('HERO2', {
  verbose: true,              // Show detailed logs
  saveRawToFile: false,       // Don't save raw results
  saveProcessedToFile: true,  // Save processed results
  outputDir: './results'      // Output directory
});
```

### Option 3: Manual Cleanup
```javascript
import { cleanupOldResults } from './src/utils/cleanupResults.js';

// Delete files older than 24 hours
await cleanupOldResults();

// Or configure custom cleanup
import { cleanupResultFiles } from './src/utils/cleanupResults.js';

await cleanupResultFiles({
  maxAgeHours: 48,    // Files older than 48 hours
  dryRun: false,      // Actually delete (true = preview only)
  verbose: true       // Show details
});
```

## API Endpoint Integration

To integrate this as an API endpoint, here's a simple example:

```javascript
import express from 'express';
import { runOriginAnalysisPipeline } from './src/services/originAnalysisPipeline.js';
import { cleanupOldResults } from './src/utils/cleanupResults.js';

const app = express();

app.get('/api/analyze/:origin', async (req, res) => {
  try {
    const { origin } = req.params;

    // Run pipeline (in-memory, no files)
    const result = await runOriginAnalysisPipeline(origin, {
      verbose: false,           // Disable console logs for API
      saveRawToFile: false,
      saveProcessedToFile: false
    });

    // Optionally cleanup old files
    await cleanupOldResults();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000);
```

## File Structure

```
src/
├── services/
│   ├── fortexBatch.js              # Original smart analyze functions
│   ├── smartAnalyzeProcessor.js    # NEW: Processing logic (extracted)
│   └── originAnalysisPipeline.js   # NEW: Full pipeline orchestration
├── utils/
│   └── cleanupResults.js           # NEW: Result file cleanup utility
└── test/
    └── testOriginPipeline.js       # NEW: Test runner for pipeline
```

## Processing Pipeline Details

The pipeline performs these operations automatically:

1. **Smart Analyze** (Phase 1)
   - Fetches data for all companies in the origin
   - Parallel processing for speed
   - Handles failures gracefully

2. **Data Processing** (Phase 2)
   - Remove duplicate companies
   - Remove duplicate drivers (merge logs)
   - Filter out 22 types of error messages
   - Remove empty drivers

3. **Results**
   - Comprehensive statistics
   - Processed, clean data
   - Ready for further use

## Migration Guide

### For Existing Code

If you have code using the old two-step process:

**Before:**
```javascript
// Step 1
const rawResults = await smartAnalyzeForOrigin('HERO2', {
  saveToFile: true
});

// Step 2 - manual file processing
// (had to run separate script)
```

**After:**
```javascript
import { quickAnalyze } from './src/services/originAnalysisPipeline.js';

const processedResults = await quickAnalyze('HERO2');
// That's it! Results are processed and ready to use
```

## Best Practices

1. **For Development**: Use `quick` mode to avoid creating files
2. **For Production API**: Use in-memory processing (no files)
3. **For Debugging**: Use `save` mode to inspect results
4. **For Storage Management**: Use `full` mode with automatic cleanup

## Performance

- **In-Memory**: ~120 seconds for HERO2 (23 companies)
- **With File Save**: +1-2 seconds for writing
- **99.6% Filter Efficiency**: Removes ~1000 irrelevant logs, keeps ~4 important ones

## Troubleshooting

### "Results directory not found"
This is normal if you've never saved files. The directory is created automatically when needed.

### "Timeout errors"
Some companies may timeout - this is expected and handled gracefully. The pipeline continues with successful companies.

### Old JSON files accumulating
Run cleanup: `node src/test/testOriginPipeline.js HERO2 full`
