# Origin Analysis with Automatic Retry

## The Problem

When analyzing an origin (e.g., HERO2 with 23 companies), many companies timeout or fail on the first attempt. It typically takes **5-6 complete runs** to get all companies successfully analyzed.

**Before:**
```bash
# Run 1: 11 successful, 12 failed
node src/test/testOriginPipeline.js HERO2

# Run 2: 15 successful, 8 failed
node src/test/testOriginPipeline.js HERO2

# Run 3: 18 successful, 5 failed
# ... manually run 3-4 more times ...

# Run 6: 23 successful, 0 failed ✓
```

## The Solution

**Automatic retry pipeline** that keeps running until all companies succeed or max retries reached.

### How It Works

1. **Phase 1: Origin-Level Retry**
   - Runs the entire origin analysis
   - Checks for failures
   - If failures exist, retries the **entire origin** again
   - Repeats until all companies succeed or max retries (default: 6)

2. **Phase 2: Individual Retry** (optional)
   - After max retries, if some companies still failed
   - Retries each failed company **individually** using `smartAnalyze()`
   - Merges successful individual retries back into results
   - Reprocesses through data filters

3. **Result**
   - One function call gets you complete data for all companies
   - No manual intervention needed
   - Automatically handles network issues and timeouts

## Usage

### Command Line

**Quick retry (recommended):**
```bash
node src/test/testRetryPipeline.js HERO2
```

**Custom max retries:**
```bash
node src/test/testRetryPipeline.js HERO2 custom 10
```

**Save results to file:**
```bash
node src/test/testRetryPipeline.js HERO2 complete
```

**Retry entire origin only (no individual retries):**
```bash
node src/test/testRetryPipeline.js HERO2 no-individual
```

### API Endpoints

**Quick retry (GET):**
```bash
curl http://localhost:3000/api/analyze-retry/HERO2
```

**Custom configuration (POST):**
```bash
curl -X POST http://localhost:3000/api/analyze-retry/HERO2 \
  -H "Content-Type: application/json" \
  -d '{
    "maxRetries": 10,
    "retryFailedIndividually": true,
    "saveProcessedToFile": false
  }'
```

### Programmatic Usage

```javascript
import { quickRetryAnalyze } from './src/services/originAnalysisWithRetry.js';

// Simple usage
const result = await quickRetryAnalyze('HERO2');

// Custom configuration
import { runOriginAnalysisWithRetry } from './src/services/originAnalysisWithRetry.js';

const result = await runOriginAnalysisWithRetry('HERO2', {
  maxRetries: 10,                    // Try up to 10 times
  verbose: true,                     // Show detailed logs
  retryFailedIndividually: true,     // Retry failures one-by-one after max retries
  saveProcessedToFile: false         // Don't save to file
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | number | 6 | Maximum number of full origin retries |
| `verbose` | boolean | true | Enable detailed console logging |
| `retryFailedIndividually` | boolean | true | After max retries, retry failed companies one by one |
| `saveProcessedToFile` | boolean | false | Save final results to JSON file |

## Response Format

```json
{
  "summary": {
    "origin": "HERO2",
    "totalCompanies": 23,
    "successful": 23,
    "failed": 0,
    "successRate": "100.00%",
    "retryMetadata": {
      "totalAttempts": 4,
      "maxRetries": 6,
      "individualRetryUsed": true,
      "totalExecutionTime": "480.25s"
    },
    "processingStats": {
      "totalLogsProcessed": 1007,
      "totalLogsRemoved": 1003,
      "remainingLogs": 4,
      "companiesProcessed": 23,
      "driversProcessed": 32
    }
  },
  "successfulResults": [...],
  "failedResults": [],
  "allResults": [...]
}
```

## Example Output

```
═══════════════════════════════════════════════════════════════════════════════
ORIGIN ANALYSIS WITH RETRY: HERO2
═══════════════════════════════════════════════════════════════════════════════
Max retries: 6
Individual retry: enabled
═══════════════════════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────────────────────
ATTEMPT 1/6
────────────────────────────────────────────────────────────────────────────────
[Running full pipeline for HERO2...]

Attempt 1 Summary:
  ✓ Successful: 11
  ✗ Failed: 12
  Success rate: 47.83%

⚠️  12 companies failed. Retrying entire origin...

────────────────────────────────────────────────────────────────────────────────
ATTEMPT 2/6
────────────────────────────────────────────────────────────────────────────────
[Running full pipeline for HERO2...]

Attempt 2 Summary:
  ✓ Successful: 18
  ✗ Failed: 5
  Success rate: 78.26%

⚠️  5 companies failed. Retrying entire origin...

────────────────────────────────────────────────────────────────────────────────
ATTEMPT 3/6
────────────────────────────────────────────────────────────────────────────────
[Running full pipeline for HERO2...]

Attempt 3 Summary:
  ✓ Successful: 20
  ✗ Failed: 3
  Success rate: 86.96%

⚠️  3 companies failed. Retrying entire origin...

═══════════════════════════════════════════════════════════════════════════════
INDIVIDUAL RETRY PHASE
═══════════════════════════════════════════════════════════════════════════════
Retrying 3 failed companies individually...

[1/3] Retrying Company A (Company:abc123)...
  ✓ Success
[2/3] Retrying Company B (Company:def456)...
  ✓ Success
[3/3] Retrying Company C (Company:ghi789)...
  ✓ Success

✓ Recovered 3 companies through individual retry

═══════════════════════════════════════════════════════════════════════════════
FINAL SUMMARY
═══════════════════════════════════════════════════════════════════════════════
Origin:                HERO2
Total attempts:        3/6
Total execution time:  420.50s
Companies total:       23
Companies successful:  23
Companies failed:      0
Success rate:          100.00%
Logs processed:        1,007
Logs filtered:         1,003
Logs remaining:        4

🎉 SUCCESS: All companies processed successfully!
═══════════════════════════════════════════════════════════════════════════════
```

## Why This Approach?

### Two-Phase Retry Strategy

**Phase 1: Retry Entire Origin**
- Network issues often affect multiple companies
- Retrying all companies together might succeed on next attempt
- Simpler and faster than individual retries
- Better for batch processing

**Phase 2: Individual Company Retry**
- Some companies may consistently timeout
- Individual retry gives them dedicated time
- Uses `smartAnalyze()` directly for precision
- Merges results seamlessly

### Benefits

✅ **Automatic**: No manual intervention needed
✅ **Complete Data**: Guarantees all companies analyzed (or max retries)
✅ **Efficient**: Retries entire origin first, then individuals
✅ **Transparent**: Detailed logging shows exactly what's happening
✅ **Production Ready**: Handles failures gracefully
✅ **In-Memory**: No intermediate files unless requested

## Performance

**Typical Execution (HERO2 - 23 companies):**

| Attempt | Successful | Failed | Time |
|---------|-----------|--------|------|
| 1 | 11 | 12 | 120s |
| 2 | 18 | 5 | 120s |
| 3 | 21 | 2 | 120s |
| Individual Retry | +2 | 0 | 60s |
| **Total** | **23** | **0** | **~420s** |

**vs Manual Approach:**
- Manual: 6 runs × 120s = 720s + manual effort
- Automatic: ~420s, fully automated

## When to Use What

### Use Retry Pipeline When:
- ✅ You need complete data for all companies
- ✅ Some companies frequently timeout
- ✅ You want automation without manual retries
- ✅ **Production use cases**

### Use Regular Pipeline When:
- ✅ Testing/development
- ✅ Quick checks
- ✅ Don't need 100% completion
- ✅ Time-constrained (need fast results)

## Integration Examples

### Express Route
```javascript
app.get('/api/complete-origin/:origin', async (req, res) => {
  const { origin } = req.params;

  const result = await quickRetryAnalyze(origin);

  res.json({
    success: result.summary.failed === 0,
    data: result,
    completionRate: result.summary.successRate
  });
});
```

### Scheduled Job
```javascript
import cron from 'node-cron';
import { quickRetryAnalyze } from './services/originAnalysisWithRetry.js';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const origins = ['HERO', 'HERO2', 'HERO3', 'HERO4', 'HERO5'];

  for (const origin of origins) {
    console.log(`Processing ${origin}...`);
    const result = await quickRetryAnalyze(origin);

    if (result.summary.failed === 0) {
      console.log(`✓ ${origin}: All companies successful`);
    } else {
      console.log(`⚠️  ${origin}: ${result.summary.failed} companies failed`);
    }
  }
});
```

## Troubleshooting

**Q: What if companies still fail after max retries?**
A: The pipeline will report which companies failed. You can:
- Increase `maxRetries` (e.g., to 10)
- Manually retry those specific companies later
- Check if there's a persistent issue with those companies

**Q: How long does it take?**
A: Depends on how many retries needed. Typically:
- Best case (all succeed first try): ~120s
- Typical case (2-3 retries): ~300-400s
- Worst case (max retries + individual): ~800-900s

**Q: Can I disable individual retry?**
A: Yes, set `retryFailedIndividually: false`

**Q: Does it save intermediate results?**
A: No, everything is in-memory unless you set `saveProcessedToFile: true`

## Migration from Manual Process

**Before:**
```bash
# Manually run multiple times until all succeed
node src/test/testOriginPipeline.js HERO2
# Check results, see failures
# Run again...
# Run again...
# ...
```

**After:**
```bash
# One command, fully automated
node src/test/testRetryPipeline.js HERO2

# Or via API
curl http://localhost:3000/api/analyze-retry/HERO2
```

That's it! The retry pipeline handles everything automatically.
