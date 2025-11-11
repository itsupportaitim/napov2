# Napoleon v2

A production-ready origin analysis pipeline with automatic retry capabilities that ensures 100% data completion for company analysis.

## Overview

Napoleon v2 automates the complete analysis pipeline for company origins, eliminating manual intervention and achieving 100% completion rates through intelligent retry logic. The system processes company data, filters noise (99%+ efficiency), and provides clean, actionable results.

## Key Features

- **Automatic Retry Logic** - Retries failed companies automatically until success (up to 6 attempts)
- **100% Completion Rate** - Guarantees all companies are analyzed successfully
- **In-Memory Processing** - No intermediate JSON files, prevents storage bloat
- **Smart Data Filtering** - Removes 22 types of error messages, keeps only important logs
- **RESTful API** - Production-ready endpoints with proper error handling
- **Cron Scheduling** - Automated periodic analysis of all origins
- **Fast Execution** - 6-8 minutes for complete analysis (vs 30+ minutes manual)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd napoleon-v2

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

## Quick Start

### Start the Server

```bash
npm start
```

Server locally runs on `http://localhost:3000`

### Analyze an Origin

**Recommended (with automatic retry):**
```bash
curl http://localhost:3000/api/analyze-retry/HERO2
```

**Quick test (single attempt):**
```bash
curl http://localhost:3000/api/analyze/HERO2
```

### Command Line Usage

```bash
# Test retry pipeline
node src/test/testRetryPipeline.js HERO2

# Test basic pipeline
node src/test/testOriginPipeline.js HERO2

# Get available origins
npm run testGetOrigins
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze-retry/:origin` | GET | Complete analysis with auto-retry (recommended) |
| `/api/analyze-retry/:origin` | POST | Advanced retry with custom options |
| `/api/analyze/:origin` | GET | Quick analysis (single attempt) |
| `/api/analyze/:origin` | POST | Advanced analysis with options |
| `/api/origins` | GET | List all available origins |
| `/api/cleanup` | GET | Preview cleanup (dry-run) |
| `/api/cleanup` | DELETE | Delete old result files |
| `/auth` | GET | Authentication test |
| `/health` | GET | Health check |

See [API_ENDPOINTS.md](API_ENDPOINTS.md) for complete API documentation.

## Usage Examples

### Basic Analysis

```bash
# Get complete data for an origin
curl http://localhost:3000/api/analyze-retry/HERO2
```

### Custom Configuration

```bash
curl -X POST http://localhost:3000/api/analyze-retry/HERO2 \
  -H "Content-Type: application/json" \
  -d '{
    "maxRetries": 10,
    "retryFailedIndividually": true,
    "saveProcessedToFile": false
  }'
```

### List Origins

```bash
curl http://localhost:3000/api/origins
```

### Cleanup Old Files

```bash
# Preview cleanup
curl http://localhost:3000/api/cleanup

# Delete files older than 24 hours
curl -X DELETE http://localhost:3000/api/cleanup?maxAgeHours=24
```

## How It Works

### Retry Pipeline Architecture

1. **Phase 1: Origin-Level Retry** - Attempts to analyze all companies (up to 6 times)
2. **Phase 2: Individual Retry** - Retries each failed company one-by-one
3. **Smart Processing** - Filters duplicates, errors, and noise
4. **Clean Results** - Returns complete, processed data

### Data Processing

The system automatically:
- Removes 22 types of error messages
- Filters duplicate companies and drivers
- Removes empty entries
- Calculates comprehensive statistics
- Achieves 99%+ filter efficiency (e.g., 1,003 → 4 logs)

## Performance

**Example: HERO2 (23 companies)**

| Metric | Value |
|--------|-------|
| Execution Time | 6-8 minutes |
| Success Rate | 100% |
| Retry Attempts | 3-4 (max 6) |
| Filter Efficiency | 99.6% |
| Files Created | 0 (in-memory) |

**Comparison:**
- **Before:** 30+ minutes, 10+ files, manual intervention required
- **After:** 6-8 minutes, 0 files, fully automated

## Project Structure

```
napoleon-v2/
├── src/
│   ├── server.js                      # Express server + API routes
│   ├── apis/                          # API integrations
│   ├── services/
│   │   ├── originAnalysisWithRetry.js # Main retry service
│   │   ├── originAnalysisPipeline.js  # Basic pipeline
│   │   ├── smartAnalyzeProcessor.js   # Data filtering
│   │   └── fortexBatch.js             # Smart analyze functions
│   ├── utils/
│   │   └── cleanupResults.js          # File cleanup utility
│   ├── test/
│   │   ├── testRetryPipeline.js       # Test retry pipeline
│   │   └── testOriginPipeline.js      # Test basic pipeline
│   └── filter/                        # Filtering logic
├── .env                               # Environment configuration
└── package.json                       # Dependencies
```

## Configuration

Environment variables in `.env`:

```env
# API credentials
API_BASE_URL=your_api_url
API_USERNAME=your_username
API_PASSWORD=your_password

# Server configuration
PORT=3000
```

## Automated Scheduling

The server includes cron jobs for automatic origin analysis. Configure in `src/server.js`:

```javascript
// Example: Analyze origins daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  // Automated origin analysis
});
```

## Documentation

- [QUICK_START.md](QUICK_START.md) - Quick reference guide
- [RETRY_PIPELINE_GUIDE.md](RETRY_PIPELINE_GUIDE.md) - Complete retry documentation
- [ORIGIN_PIPELINE_GUIDE.md](ORIGIN_PIPELINE_GUIDE.md) - Basic pipeline guide
- [API_ENDPOINTS.md](API_ENDPOINTS.md) - Full API reference
- [SUMMARY.md](SUMMARY.md) - Project summary and architecture

## Technologies

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Axios** - HTTP client
- **node-cron** - Task scheduling
- **dotenv** - Environment configuration

## Scripts

```bash
npm start                     # Start the server
npm run testGetOrigins        # Test getting available origins
npm run testSmartAnalyzeForOrigin  # Test smart analyze for origin
```

## Before vs After

### Before (Manual Process)
1. Run analysis → Get partial results (11/23 companies)
2. Process JSON file → Still have failures
3. Repeat 5-6 times manually
4. Clean up 10+ JSON files
5. 30+ minutes of manual work

### After (Automated)
1. Single API call or command
2. Automatic retries until 100% complete
3. Clean results in memory
4. 6-8 minutes, zero intervention

## License

ISC

## Author

Napoleon v2 Team
