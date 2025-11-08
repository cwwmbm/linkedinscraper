# NestJS Backend Structure Overview

## 1. Directory Structure

```
linkedin-scraper-nest/
├── src/
│   ├── ai/                          # AI/ML module for LLM integrations
│   │   ├── services/
│   │   │   ├── openrouter.service.ts      # OpenRouter API client
│   │   │   ├── job-analyzer.service.ts    # Job analysis using LLM
│   │   │   ├── cover-letter.service.ts    # Cover letter generation
│   │   │   ├── resume-tailor.service.ts   # Resume tailoring
│   │   │   └── pdf-reader.service.ts      # PDF extraction for resumes
│   │   ├── dto/
│   │   │   ├── job-analysis.dto.ts
│   │   │   ├── cover-letter.dto.ts
│   │   │   └── resume.dto.ts
│   │   └── ai.module.ts
│   ├── scraper/                     # LinkedIn scraping module
│   │   ├── services/
│   │   │   ├── linkedin-scraper.service.ts # Main scraping logic
│   │   │   ├── job-filter.service.ts       # Job filtering rules
│   │   │   ├── page-parser.service.ts      # HTML parsing
│   │   │   └── url-builder.service.ts      # Search URL construction
│   │   ├── dto/
│   │   │   └── scrape-single.dto.ts
│   │   ├── scraper.controller.ts
│   │   ├── scraper.service.ts
│   │   └── scraper.module.ts
│   ├── jobs/                        # Jobs CRUD module
│   │   ├── services/
│   │   │   └── manual-job-creator.service.ts # AI-assisted job creation
│   │   ├── entities/
│   │   │   ├── job.entity.ts       # Main Job model
│   │   │   └── filtered-job.entity.ts # Filtered/rejected jobs
│   │   ├── dto/
│   │   │   ├── create-job.dto.ts
│   │   │   ├── create-manual-job.dto.ts
│   │   │   ├── update-job.dto.ts
│   │   │   └── job-query.dto.ts
│   │   ├── jobs.controller.ts
│   │   ├── jobs.service.ts
│   │   └── jobs.module.ts
│   ├── queue/                       # Job queue (BullMQ) module
│   │   ├── processors/
│   │   │   ├── scraper.processor.ts  # Scraping job processor
│   │   │   ├── analysis.processor.ts # Analysis job processor
│   │   │   └── export.processor.ts   # Export job processor
│   │   ├── queue.service.ts
│   │   └── queue.module.ts
│   ├── database/                    # Database setup (TypeORM + SQLite)
│   │   └── database.module.ts
│   ├── config/                      # Configuration module
│   │   ├── configuration.ts         # Main config factory
│   │   ├── validation.schema.ts
│   │   ├── config.controller.ts
│   │   └── config.module.ts
│   ├── files/                       # File export/backup module
│   │   ├── services/
│   │   │   ├── export.service.ts    # CSV/JSON export
│   │   │   └── backup.service.ts    # Database backup
│   │   ├── dto/
│   │   │   └── export-jobs.dto.ts
│   │   └── files.module.ts
│   ├── health/                      # Health check module
│   │   ├── indicators/
│   │   │   └── redis.health.ts
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   ├── cli/                         # CLI commands
│   │   ├── commands/
│   │   │   ├── scrape.command.ts
│   │   │   ├── analyze.command.ts
│   │   │   ├── export.command.ts
│   │   │   └── ...
│   │   ├── cli.module.ts
│   │   └── cli.ts (entrypoint)
│   ├── logger/                      # Winston logger module
│   │   └── logger.module.ts
│   ├── app.module.ts                # Root application module
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts                      # Bootstrap file
├── test/
│   └── jest-e2e.json
└── package.json
```

## 2. Main Modules, Services, and Controllers

### AI Module
**Purpose**: Integration with OpenRouter API for LLM operations

**Services**:
- `OpenrouterService`: Raw API client to OpenRouter (https://openrouter.ai/api/v1/chat/completions)
  - Handles different operation types with separate API keys:
    - job_analysis
    - cover_letter
    - resume
    - page_scraper
  
- `JobAnalyzerService`: Analyzes jobs against config questions
  - Fetches job from DB
  - Calls OpenRouter for each analysis question
  - Stores metadata in Job entity
  
- `CoverLetterService`: 2-pass AI-driven cover letter generation
  - Pass 1: Senior coach (15+ years) creates initial draft
  - Pass 2: Junior coach improves formality and quality
  - Uses resume PDF + job description
  
- `ResumeTailorService`: Tailors resume to job requirements
  - Identifies key responsibilities
  - Highlights relevant experience
  
- `PdfReaderService`: Extracts text from PDF resumes

### Scraper Module
**Purpose**: LinkedIn job scraping and filtering

**Services**:
- `LinkedInScraperService`: Main scraping orchestrator
  - Fetches search result pages
  - Parses job cards with Cheerio (HTML parsing)
  - Fetches individual job descriptions
  - Deduplicates jobs
  - Database deduplication
  - Applies initial filters before description fetch
  
- `JobFilterService`: Multi-criteria job filtering
  - Title exclude/include filters
  - Company exclude filters
  - Country/location filters
  - Description keyword filters
  - Language detection (using franc library)
  
- `UrlBuilderService`: LinkedIn search URL construction
  - Builds search queries with filters
  - Handles pagination (rounds, pages)
  - Manages timespan and other parameters
  
- `PageParserService`: AI-based single page parsing
  - Uses AI to extract job info from URL

**Controller**: `ScraperController`
- `POST /scraper/jobs` - Queue full scraping
- `POST /scraper/jobs/single` - Queue single page scrape
- `POST /scraper/refilter` - Reapply filters
- `POST /scraper/retry-failed` - Retry failed descriptions
- `GET /scraper/jobs/:jobId` - Get job status

### Jobs Module
**Purpose**: CRUD operations and job management

**Entities**:
- `Job`: Main job entity (SQLite)
  - id, title, company, location, date, job_url, job_description
  - Status flags: applied, hidden, interview, rejected, blocked
  - AI fields: cover_letter, resume, metadata, notes
  - date_loaded

- `FilteredJob`: Rejected jobs (mirror of Job entity)

**Services**:
- `JobsService`: CRUD + querying
  - findAll() with filtering, search, pagination, sorting
  - findOne(), create(), update(), patch(), remove()
  - getStats() - counts by status

- `ManualJobCreatorService`: AI-assisted job creation
  - User provides job description + optional fields
  - AI extracts missing title/company/location
  - Auto-queues analysis after creation

**Controller**: `JobsController`
- `GET /jobs` - List with filtering/pagination
- `GET /jobs/stats` - Statistics
- `GET /jobs/:id` - Get single job
- `POST /jobs` - Create job
- `POST /jobs/manual` - Create with AI extraction
- `PUT /jobs/:id` - Full update
- `PATCH /jobs/:id` - Partial update with mutual exclusivity
- `DELETE /jobs/:id` - Delete job
- `POST /jobs/:id/analysis` - Queue analysis
- `POST /jobs/:id/cover-letter` - Generate cover letter
- `GET /jobs/:id/cover-letter` - Get cover letter
- `POST /jobs/:id/resume` - Tailor resume
- `GET /jobs/:id/resume` - Get tailored resume

### Queue Module
**Purpose**: Background job processing using BullMQ + Redis

**Service**: `QueueService`
- Queue management for 3 queues: scraper, analysis, export
- Job methods:
  - addScrapeAllJob()
  - addScrapeSingleJob(url)
  - addRefilterJob()
  - addRetryFailedJob()
  - addAnalyzeSingleJob(jobId, model)
  - addAnalyzeBatchJob(mode)
  - addExportJob(format, filter)
  - addBackupJob()
- getJobStatus(jobId) - Get status across all queues
- getQueueJobs(queueName, status) - Get jobs by status
- cleanQueue(queueName, status) - Clean up completed/failed jobs

**Processors**:
- `ScraperProcessor`: Handles scraping jobs
- `AnalysisProcessor`: Handles analysis jobs (single & batch)
- `ExportProcessor`: Handles export & backup jobs

**Config**:
- Redis connection: localhost:6379 (configurable)
- Default job options:
  - 3 retry attempts with exponential backoff
  - Keep last 100 completed, 200 failed jobs

### Database Module
**Purpose**: SQLite database setup with TypeORM

- Type: SQLite
- DB path: configurable (default: ./data/my_database.db)
- Synchronize: false (manual schema management)
- Logging: disabled

### Config Module
**Purpose**: Configuration management (JSON + environment variables)

**Configuration source hierarchy**:
1. Environment variables (highest priority)
2. config.json file (backward compatibility)
3. Hardcoded defaults

**Config sections**:
- database: path, table names
- ai: API keys & models for 4 operation types
- files: resume path
- scraper: headers, proxies, search queries, timespan, pagination
- filters: exclude lists, keywords, languages
- app: port, nodeEnv

### Other Modules
- `HealthModule`: Health checks (Redis status)
- `FilesModule`: Export to CSV/JSON, database backup
- `LoggerModule`: Winston logging
- `CliModule`: Command-line interface commands

## 3. External API Calls

### OpenRouter API (https://openrouter.ai/api/v1/chat/completions)
**Calls made from**:
- `OpenrouterService.callAPI()`
  - Called by: JobAnalyzerService, CoverLetterService, ResumeTailorService, PageParserService
  
**Request format**:
```typescript
{
  "model": string,
  "messages": [{ "role": "user", "content": prompt }]
}
```

**Headers**: Authorization: Bearer {apiKey}, Content-Type: application/json

**Operations** (each with separate API key):
1. job_analysis - Analyze job against questions
2. cover_letter - Generate cover letters
3. resume - Tailor resumes
4. page_scraper - Extract job info from URLs

### LinkedIn (via HTTP requests)
**Calls made from**:
- `LinkedInScraperService.fetchWithRetry()` via HttpService
  - Search result pages: https://www.linkedin.com/jobs/search/...
  - Job detail pages: https://www.linkedin.com/jobs/view/{jobPostingId}/
  
**Retry logic**: 3 retries with exponential backoff (1s → 2s → 4s)

**Headers**: Configurable via config.json (user-agent, proxies, etc.)

## 4. Database Calls

### TypeORM Repositories
**Job Repository** (InjectRepository(Job)):
- findOne() - Get job by ID or job_url
- findOneBy() - Query by fields
- save() - Insert or update
- createQueryBuilder() - Complex queries with filtering

**FilteredJob Repository** (InjectRepository(FilteredJob)):
- Same operations as Job

### Common Query Patterns:

**JobsService.findAll()**:
```typescript
createQueryBuilder('job')
  .andWhere('job.hidden = 0') // Exclude hidden by default
  .andWhere('job.applied = 1') // Filter by status
  .andWhere('LOWER(job.title) LIKE :search') // Full-text search
  .orderBy('job.id', 'DESC')
  .skip(offset).take(limit)
  .getCount() / .getMany()
```

**LinkedInScraperService**:
- findOne({ where: { job_url } }) - Check for duplicates
- save(jobsArray) - Bulk insert
- Separate tables: jobs (passed filters) vs filtered_jobs (rejected)

**JobAnalyzerService**:
- findOne({ where: { id } }) - Get job for analysis
- save(job) - Store metadata/cover_letter/resume

## 5. Existing Test Setup

### Framework: Jest
**Jest configuration** (in package.json):
```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

**E2E Jest config** (test/jest-e2e.json):
```json
{
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testEnvironment": "node"
}
```

### Existing Test Files
Found 9 existing test spec files:
1. `app.controller.spec.ts` - Basic app controller test
2. `scraper.controller.spec.ts` - Basic controller test
3. `scraper.service.spec.ts` - Basic service test
4. `queue.service.spec.ts` - Basic queue service test
5. `openrouter.service.spec.ts` - Basic service test
6. `job-analyzer.service.spec.ts` - Basic service test
7. `cover-letter.service.spec.ts` - Basic service test
8. `resume-tailor.service.spec.ts` - Basic service test
9. `pdf-reader.service.spec.ts` - Basic service test

**Pattern observed**: Most tests are minimal "smoke" tests
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ServiceName],
    }).compile();
    service = module.get<ServiceName>(ServiceName);
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## 6. Testing Framework Configuration

### Main Test Setup
- **Framework**: Jest 30.0.0
- **TypeScript Support**: ts-jest 29.2.5
- **NestJS Testing**: @nestjs/testing 11.0.1
- **HTTP Testing**: supertest 7.0.0

### Available Test Commands
```bash
npm test              # Run all unit tests
npm run test:watch   # Watch mode
npm run test:cov     # Coverage report
npm run test:debug   # Debug mode
npm run test:e2e     # E2E tests
```

### Test Dependencies Configured
- `@nestjs/testing` - NestJS test module utilities
- `jest` - Test runner
- `ts-jest` - TypeScript Jest support
- `supertest` - HTTP assertion library
- `@types/jest` - Jest type definitions

## Key Dependencies for Testing

### Core Framework
- NestJS 11.0.1 (core, common, platform-express, config, typeorm)
- TypeORM 0.3.27 (database ORM)
- BullMQ 5.61.0 (job queue)

### External Services
- axios 1.12.2 (HTTP client)
- @nestjs/axios (Axios integration)

### Data Processing
- cheerio 1.1.2 (HTML parsing)
- pdf-parse 1.1.1 (PDF extraction)
- franc 6.2.0 (language detection)

### Validation & Transform
- class-validator 0.14.2
- class-transformer 0.5.1

### Logging
- winston 3.18.3
- nest-winston 1.10.2

### Database
- sqlite3 5.1.7
- typeorm 0.3.27

## Test Coverage Recommendations

### High Priority (Most Complex)
1. **LinkedInScraperService** - Complex HTML parsing, retry logic, duplicates
2. **JobFilterService** - Multi-criteria filtering with language detection
3. **JobAnalyzerService** - LLM integration, database updates
4. **QueueService & Processors** - Background job processing, retries

### Medium Priority
1. **OpenrouterService** - API error handling, operation types
2. **CoverLetterService** - 2-pass generation, file I/O
3. **ResumeTailorService** - Resume tailoring logic
4. **JobsService** - Complex queries, filtering, pagination

### Lower Priority (Straightforward)
1. **UrlBuilderService** - URL construction
2. **PageParserService** - Basic parsing
3. **JobsController** - HTTP routing, DTOs
4. **ExportService, BackupService** - File operations

## Configuration for Testing

### Environment Variables Needed
- `JOB_ANALYSIS_API_KEY` - OpenRouter API key
- `COVER_LETTER_API_KEY` - OpenRouter API key
- `RESUME_API_KEY` - OpenRouter API key
- `PAGE_SCRAPER_API_KEY` - OpenRouter API key
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `DB_PATH` - SQLite database path

### Test Database Strategy
- Use in-memory SQLite for unit tests: `database: ':memory:'`
- Use separate test database for E2E tests
- Mock Redis for unit tests (BullMQ offers mocking)
- Mock external API calls with jest.mock()

