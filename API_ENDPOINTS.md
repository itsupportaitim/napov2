# API Endpoints Reference

## ⭐ RECOMMENDED: Retry Endpoints

These endpoints automatically retry failed companies until success or max attempts reached.

### 1. Complete Analysis with Auto-Retry (RECOMMENDED)
**Endpoint:** `GET /api/analyze-retry/:origin`

**Description:** Runs the full analysis pipeline with automatic retries. Keeps retrying the entire origin until all companies succeed or max retries reached. Then retries failed companies individually. **This is the recommended endpoint for production.**

**Query Parameters:**
- `maxRetries`: number (default: 6) - Maximum retry attempts
- `individualRetry`: boolean (default: true) - Retry failed companies individually after max retries

**Example:**
```bash
curl http://localhost:3000/api/analyze-retry/HERO2
curl http://localhost:3000/api/analyze-retry/HERO2?maxRetries=10
```

**Response:**
```json
{
  "success": true,
  "executionTime": "720.50s",
  "data": {
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
        "totalExecutionTime": "720.50s"
      },
      "processingStats": { ... }
    },
    "successfulResults": [...],
    "failedResults": [],
    "allResults": [...]
  }
}
```

---

### 2. Custom Retry Analysis (Advanced)
**Endpoint:** `POST /api/analyze-retry/:origin`

**Description:** Runs analysis with custom retry options.

**Body Parameters:**
- `maxRetries`: number (default: 6)
- `verbose`: boolean (default: false)
- `retryFailedIndividually`: boolean (default: true)
- `saveProcessedToFile`: boolean (default: false)

**Example:**
```bash
curl -X POST http://localhost:3000/api/analyze-retry/HERO2 \
  -H "Content-Type: application/json" \
  -d '{
    "maxRetries": 10,
    "retryFailedIndividually": true,
    "saveProcessedToFile": true
  }'
```

---

## Origin Analysis Pipeline Endpoints

### 1. Quick Analysis (In-Memory)
**Endpoint:** `GET /api/analyze/:origin`

**Description:** Runs the full analysis pipeline in-memory. No files are saved. Perfect for production use.

**Example:**
```bash
curl http://localhost:3000/api/analyze/HERO2
```

**Response:**
```json
{
  "success": true,
  "executionTime": "120.10s",
  "data": {
    "summary": {
      "origin": "HERO2",
      "totalCompanies": 23,
      "successful": 11,
      "failed": 12,
      "successRate": "47.83%",
      "processingStats": {
        "totalLogsProcessed": 1007,
        "totalLogsRemoved": 1003,
        "remainingLogs": 4,
        "companiesProcessed": 22,
        "driversProcessed": 32
      }
    },
    "successfulResults": [...],
    "failedResults": [...],
    "allResults": [...]
  }
}
```

---

### 2. Custom Analysis (Advanced)
**Endpoint:** `POST /api/analyze/:origin`

**Description:** Runs analysis with custom options. Can save files and trigger cleanup.

**Body Parameters:**
- `verbose`: boolean (default: false) - Enable console logging
- `saveRawToFile`: boolean (default: false) - Save unprocessed results
- `saveProcessedToFile`: boolean (default: false) - Save processed results
- `outputDir`: string (default: "./results") - Output directory
- `cleanupOldFiles`: boolean (default: false) - Auto-cleanup after analysis

**Example:**
```bash
curl -X POST http://localhost:3000/api/analyze/HERO2 \
  -H "Content-Type: application/json" \
  -d '{
    "saveProcessedToFile": true,
    "cleanupOldFiles": true
  }'
```

**Response:**
```json
{
  "success": true,
  "executionTime": "120.50s",
  "data": { ... },
  "cleanup": {
    "filesScanned": 10,
    "filesDeleted": 5,
    "spaceFreed": 52428800,
    "errors": []
  }
}
```

---

### 3. Preview Cleanup
**Endpoint:** `GET /api/cleanup`

**Description:** Preview what files would be deleted without actually deleting them.

**Query Parameters:**
- `maxAgeHours`: number (default: 24) - Maximum age of files to keep

**Example:**
```bash
curl http://localhost:3000/api/cleanup?maxAgeHours=48
```

**Response:**
```json
{
  "success": true,
  "preview": true,
  "stats": {
    "filesScanned": 15,
    "filesDeleted": 0,
    "spaceFreed": 0,
    "errors": []
  }
}
```

---

### 4. Delete Old Files
**Endpoint:** `DELETE /api/cleanup`

**Description:** Actually delete old result files.

**Query Parameters:**
- `maxAgeHours`: number (default: 24) - Delete files older than this

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/cleanup?maxAgeHours=24
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "filesScanned": 15,
    "filesDeleted": 8,
    "spaceFreed": 104857600,
    "errors": []
  }
}
```

---

### 5. List Available Origins
**Endpoint:** `GET /api/origins`

**Description:** Get a list of all available origins.

**Example:**
```bash
curl http://localhost:3000/api/origins
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "origins": [
    {
      "name": "HERO",
      "email": "hero@example.com"
    },
    {
      "name": "HERO2",
      "email": "hero2@example.com"
    }
  ]
}
```

---

## Other Endpoints

### Health Check
**Endpoint:** `GET /health`

**Example:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

### Authentication
**Endpoint:** `GET /auth`

**Description:** Authenticates all origins and retrieves company lists.

**Example:**
```bash
curl http://localhost:3000/auth
```

---

## Usage Examples

### Scenario 1: Production - Get Complete Data (RECOMMENDED)
```bash
# Get fully processed data with automatic retries
# This ensures all companies are analyzed successfully
curl http://localhost:3000/api/analyze-retry/HERO2 | jq '.data.summary'
```

### Scenario 2: Quick Analysis for Dashboard (Single Attempt)
```bash
# Get processed data for a specific origin (single attempt, may have failures)
curl http://localhost:3000/api/analyze/HERO2 | jq '.data.summary'
```

### Scenario 3: Custom Retries with File Save
```bash
# Run analysis with custom retry count and save results
curl -X POST http://localhost:3000/api/analyze-retry/HERO2 \
  -H "Content-Type: application/json" \
  -d '{
    "maxRetries": 10,
    "saveProcessedToFile": true
  }'
```

### Scenario 4: Storage Management
```bash
# Check what would be cleaned up
curl http://localhost:3000/api/cleanup?maxAgeHours=72

# Delete files older than 72 hours
curl -X DELETE http://localhost:3000/api/cleanup?maxAgeHours=72
```

### Scenario 5: Get Available Origins
```bash
# List all origins
curl http://localhost:3000/api/origins

# Then analyze a specific one with retries
curl http://localhost:3000/api/analyze-retry/HERO3
```

---

## Error Handling

All endpoints return error responses in this format:

```json
{
  "success": false,
  "error": "Error message here",
  "origin": "HERO2"
}
```

Common HTTP status codes:
- `200`: Success
- `500`: Server error (API failure, analysis error, etc.)

---

## Performance Notes

- **GET /api/analyze/:origin**: ~2 minutes for 23 companies
- **In-memory processing**: No disk I/O overhead
- **Filter efficiency**: ~99% of logs filtered out
- **Concurrent requests**: Safe to run multiple analyses in parallel

---

## Production Recommendations

1. **⭐ Use retry endpoints**: Use `GET /api/analyze-retry/:origin` for production to ensure complete data
2. **Default to in-memory**: Process everything in-memory (no files saved)
3. **Configure max retries**: Adjust `maxRetries` based on your network reliability (default: 6)
4. **Enable individual retry**: Keep `retryFailedIndividually: true` to maximize success rate
5. **Save only when needed**: Use `saveProcessedToFile: true` only for debugging
6. **Auto-cleanup**: Set up a cron job or use cleanup endpoints to prevent storage bloat
7. **Monitor retry stats**: Check `retryMetadata` in response to track retry efficiency

---

## Starting the Server

```bash
# Development
node src/server.js

# Production
NODE_ENV=production node src/server.js
```

The server will display all available endpoints on startup.
