# NestJS Migration Plan: LinkedIn Scraper

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Proposed NestJS Architecture](#proposed-nestjs-architecture)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Module Specifications](#module-specifications)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Configuration Management](#configuration-management)
10. [Background Jobs & Scheduling](#background-jobs--scheduling)
11. [CLI Implementation](#cli-implementation)
12. [Migration Strategy](#migration-strategy)
13. [Testing Strategy](#testing-strategy)
14. [Deployment Guide](#deployment-guide)
15. [Challenges & Solutions](#challenges--solutions)

---

## Executive Summary

This document outlines the comprehensive plan to migrate the LinkedIn Job Scraper from a Python/Flask application to a modern NestJS microservice architecture using TypeScript.

### Current System
- **Backend**: Flask (Python)
- **Scraper**: Python with BeautifulSoup, requests
- **Database**: SQLite
- **AI Integration**: OpenRouter API
- **Interface**: REST API + CLI

### Target System
- **Backend**: NestJS (TypeScript)
- **Scraper**: Puppeteer/Cheerio
- **Database**: TypeORM + SQLite (PostgreSQL-ready)
- **Queue**: BullMQ + Redis
- **Interface**: REST API + CLI (nest-commander)

### Migration Timeline
**8 weeks** divided into phases with clear deliverables

---

## Current Architecture Analysis

### app.py - Flask REST API

#### Key Features
1. **Job Management** (17 endpoints with `/api` prefix)
   - CRUD operations for jobs
   - Status toggles (applied, interview, rejected, blocked, hidden) - **mutually exclusive**
   - Notes management (get/update endpoints)
   - Statistics dashboard (total, not_hidden, applied, interview, rejected, blocked)
   - Frontend configuration endpoint

2. **AI-Powered Features**
   - Job analysis with configurable questions
   - Cover letter generation (2-pass approach)
   - Resume tailoring
   - Single page parsing with AI

3. **Dependencies**
   - SQLite database via pandas/sqlite3
   - OpenRouter API (3 operation types: job_analysis, cover_letter, resume)
   - PDF reading (pdfminer)
   - JSON configuration

#### Endpoints Breakdown
```python
GET  /api/get_all_jobs                        # List visible jobs
GET  /api/get_all_jobs_including_hidden       # List all jobs
GET  /api/job_details/<job_id>                # Get single job
POST /api/hide_job/<job_id>                   # Hide job
POST /api/unhide_job/<job_id>                 # Unhide job
POST /api/mark_applied/<job_id>               # Toggle applied (clears interview/rejected/blocked)
POST /api/mark_interview/<job_id>             # Toggle interview (clears applied/rejected/blocked)
POST /api/mark_rejected/<job_id>              # Toggle rejected (clears applied/interview/blocked)
POST /api/mark_blocked/<job_id>               # Toggle blocked (clears applied/interview/rejected)
GET  /api/get_cover_letter/<job_id>           # Get existing cover letter
POST /api/get_CoverLetter/<job_id>            # Generate cover letter (2-pass approach)
POST /api/get_resume/<job_id>                 # Generate tailored resume
POST /api/analyze_job/<job_id>                # Analyze job with configurable questions
GET  /api/get_notes/<job_id>                  # Get job notes
PUT  /api/update_notes/<job_id>               # Update job notes
GET  /api/config                              # Get frontend config (analysis_questions)
GET  /api/get_job_stats                       # Get statistics (total, not_hidden, applied, etc.)
```

**Key Implementation Details:**
- All routes use `/api` prefix for better organization
- Status toggles (applied/interview/rejected/blocked) are **mutually exclusive**: setting one to 1 automatically clears the others
- Each status endpoint toggles between 0 and 1 (can be disabled)
- Database schema includes: `hidden`, `applied`, `interview`, `rejected`, `blocked`, `notes`, `cover_letter`, `resume`, `metadata` columns

### main.py - Scraper & CLI

#### Core Functionality
1. **Web Scraping**
   - LinkedIn job search scraping with pagination
   - Job card extraction (title, company, location, date, URL)
   - Job description extraction with retry logic
   - Single page scraping with AI parsing

2. **Filtering & Processing**
   - Title filtering (include/exclude)
   - Company filtering
   - Location/country filtering
   - Description keyword filtering
   - Language detection (langdetect)
   - Duplicate removal

3. **Database Management**
   - Schema verification and migration
   - Table creation (jobs, filtered_jobs)
   - Database backup with timestamps
   - CSV export

4. **AI Analysis**
   - Configurable analysis questions
   - Batch processing of jobs
   - Multiple analysis modes (not-analyzed, not-hidden, all)
   - Metadata storage as JSON

5. **CLI Commands**
```bash
python main.py --scrape                              # Scrape jobs
python main.py --analyze                             # Analyze unanalyzed jobs
python main.py --analyze --analyze-mode not-hidden   # Analyze visible jobs
python main.py --analyze --analyze-mode all          # Analyze all jobs
python main.py --scrape --analyze                    # Scrape + analyze
python main.py --scrape-single-page URL1 URL2        # Scrape specific URLs
python main.py --refilter                            # Reapply filters
python main.py --rescrape-failed                     # Retry failed scrapes
python main.py --export-csv                          # Export to CSV
python main.py --backup-db                           # Backup database
python main.py --full                                # Full pipeline
```

#### Scraping Workflow
1. Build search URLs from config queries
2. Fetch job cards from LinkedIn search results
3. Extract job metadata (title, company, location, date, URL)
4. Filter duplicates and irrelevant jobs
5. Fetch full job descriptions with retry mechanism
6. Apply final filters (description keywords, language)
7. Store in database (jobs table or filtered_jobs table)
8. Optionally run AI analysis on new jobs

---

## Proposed NestJS Architecture

### Architectural Principles
1. **Modular Design**: Separate concerns into focused modules
2. **Dependency Injection**: Loose coupling for testability
3. **Type Safety**: Full TypeScript typing
4. **Async Processing**: Background jobs for heavy tasks
5. **Scalability**: Horizontal scaling ready
6. **Maintainability**: Clear separation of layers

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                          │
│                    (NestJS HTTP Server)                     │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │ Jobs Module  │ │  Scraper  │ │ AI Module   │
    │              │ │  Module   │ │             │
    └───────┬──────┘ └─────┬─────┘ └──────┬──────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │  Database    │ │   Queue   │ │   Files     │
    │  (TypeORM)   │ │ (BullMQ)  │ │  Service    │
    └──────────────┘ └───────────┘ └─────────────┘
```

### Layer Architecture

```
┌─────────────────────────────────────────┐
│         Controllers (HTTP Layer)        │  ← REST API endpoints
├─────────────────────────────────────────┤
│         Services (Business Logic)       │  ← Core logic
├─────────────────────────────────────────┤
│     Repositories (Data Access Layer)    │  ← TypeORM
├─────────────────────────────────────────┤
│          Database (SQLite/PG)           │  ← Persistence
└─────────────────────────────────────────┘

           ┌──────────────────┐
           │  Queue Workers   │  ← Background jobs
           └──────────────────┘
```

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | ^10.0.0 | Application framework |
| TypeScript | ^5.1.0 | Type-safe language |
| Node.js | >=18.0.0 | Runtime environment |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| TypeORM | ^0.3.17 | ORM framework |
| SQLite3 | ^5.1.6 | Development database |
| pg | ^8.11.0 | PostgreSQL driver (optional) |

### Queue & Jobs
| Technology | Version | Purpose |
|------------|---------|---------|
| BullMQ | ^5.0.0 | Job queue |
| Redis | ^7.2.0 | Queue backend |
| @nestjs/bull | ^10.0.0 | NestJS Bull integration |

### Web Scraping
| Technology | Version | Purpose |
|------------|---------|---------|
| Puppeteer | ^21.0.0 | Dynamic page scraping |
| Cheerio | ^1.0.0-rc.12 | HTML parsing |
| Axios | ^1.6.0 | HTTP requests |

### AI & Processing
| Technology | Version | Purpose |
|------------|---------|---------|
| @nestjs/axios | ^3.0.0 | HTTP client for OpenRouter |
| pdf-parse | ^1.1.1 | PDF text extraction |
| franc | ^6.1.0 | Language detection |

### CLI & Scheduling
| Technology | Version | Purpose |
|------------|---------|---------|
| nest-commander | ^3.12.0 | CLI framework |
| @nestjs/schedule | ^4.0.0 | Cron scheduling |

### Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| class-validator | ^0.14.0 | DTO validation |
| class-transformer | ^0.5.1 | Object transformation |
| @nestjs/config | ^3.1.0 | Configuration management |
| Winston | ^3.11.0 | Logging |
| @nestjs/swagger | ^7.1.0 | API documentation |

---

## Project Structure

```
linkedin-scraper-nest/
├── src/
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── config/                          # Configuration
│   │   ├── config.module.ts
│   │   ├── configuration.ts             # Config schema
│   │   └── validation.schema.ts         # Config validation
│   │
│   ├── database/                        # Database setup
│   │   ├── database.module.ts
│   │   ├── database.config.ts
│   │   └── migrations/                  # TypeORM migrations
│   │       └── 1234567890-InitialSchema.ts
│   │
│   ├── jobs/                            # Jobs module
│   │   ├── jobs.module.ts
│   │   ├── jobs.controller.ts           # REST endpoints
│   │   ├── jobs.service.ts              # Business logic
│   │   ├── entities/
│   │   │   ├── job.entity.ts            # Job entity
│   │   │   └── filtered-job.entity.ts   # Filtered job entity
│   │   └── dto/
│   │       ├── create-job.dto.ts
│   │       ├── update-job.dto.ts
│   │       ├── update-status.dto.ts
│   │       ├── update-notes.dto.ts
│   │       ├── job-query.dto.ts         # Query params
│   │       └── job-stats.dto.ts
│   │
│   ├── scraper/                         # Scraper module
│   │   ├── scraper.module.ts
│   │   ├── scraper.controller.ts        # Manual trigger endpoints
│   │   ├── scraper.service.ts           # Orchestration
│   │   ├── services/
│   │   │   ├── linkedin-scraper.service.ts  # LinkedIn scraping
│   │   │   ├── page-parser.service.ts       # Single page parsing
│   │   │   ├── job-card-extractor.service.ts
│   │   │   ├── job-description-extractor.service.ts
│   │   │   └── url-builder.service.ts       # Search URL builder
│   │   └── dto/
│   │       ├── scrape-config.dto.ts
│   │       ├── scrape-single.dto.ts
│   │       └── scrape-result.dto.ts
│   │
│   ├── ai/                              # AI module
│   │   ├── ai.module.ts
│   │   ├── ai.controller.ts             # AI endpoints
│   │   ├── ai.service.ts                # Orchestration
│   │   ├── services/
│   │   │   ├── openrouter.service.ts    # OpenRouter API
│   │   │   ├── job-analyzer.service.ts  # Job analysis
│   │   │   ├── cover-letter.service.ts  # Cover letter gen
│   │   │   └── resume-tailor.service.ts # Resume tailoring
│   │   ├── interfaces/
│   │   │   ├── ai-provider.interface.ts
│   │   │   └── ai-config.interface.ts
│   │   └── dto/
│   │       ├── analyze-job.dto.ts
│   │       ├── generate-cover-letter.dto.ts
│   │       ├── generate-resume.dto.ts
│   │       └── ai-response.dto.ts
│   │
│   ├── queue/                           # Queue module
│   │   ├── queue.module.ts
│   │   ├── queue.service.ts             # Queue management
│   │   ├── processors/
│   │   │   ├── scraper.processor.ts     # Scraping jobs
│   │   │   ├── analysis.processor.ts    # Analysis jobs
│   │   │   └── export.processor.ts      # Export jobs
│   │   ├── jobs/
│   │   │   ├── scrape.job.ts
│   │   │   ├── analyze.job.ts
│   │   │   └── export.job.ts
│   │   └── dto/
│   │       ├── queue-job.dto.ts
│   │       └── job-progress.dto.ts
│   │
│   ├── filters/                         # Filtering module
│   │   ├── filters.module.ts
│   │   ├── job-filter.service.ts        # Filter logic
│   │   ├── services/
│   │   │   ├── title-filter.service.ts
│   │   │   ├── company-filter.service.ts
│   │   │   ├── location-filter.service.ts
│   │   │   ├── description-filter.service.ts
│   │   │   └── language-detector.service.ts
│   │   └── dto/
│   │       └── filter-config.dto.ts
│   │
│   ├── files/                           # File handling module
│   │   ├── files.module.ts
│   │   ├── files.service.ts
│   │   └── services/
│   │       ├── pdf-reader.service.ts    # PDF parsing
│   │       └── csv-exporter.service.ts  # CSV export
│   │
│   ├── backup/                          # Backup module
│   │   ├── backup.module.ts
│   │   ├── backup.service.ts            # Database backup
│   │   └── dto/
│   │       └── backup-result.dto.ts
│   │
│   ├── cli/                             # CLI module
│   │   ├── cli.module.ts
│   │   └── commands/
│   │       ├── scrape.command.ts
│   │       ├── analyze.command.ts
│   │       ├── refilter.command.ts
│   │       ├── rescrape-failed.command.ts
│   │       ├── export.command.ts
│   │       ├── backup.command.ts
│   │       └── full.command.ts
│   │
│   ├── common/                          # Shared code
│   │   ├── constants/
│   │   │   ├── job-status.constants.ts
│   │   │   └── operation-types.constants.ts
│   │   ├── decorators/
│   │   │   └── public.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   ├── guards/
│   │   │   └── api-key.guard.ts
│   │   └── interfaces/
│   │       └── common.interfaces.ts
│   │
│   └── health/                          # Health checks
│       ├── health.module.ts
│       └── health.controller.ts
│
├── config/                              # Configuration files
│   ├── default.json                     # Default config
│   ├── development.json                 # Dev config
│   └── production.json                  # Prod config
│
├── test/                                # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                             # Utility scripts
│   ├── migrate.sh
│   └── seed.sh
│
├── .env.example                         # Environment template
├── .gitignore
├── docker-compose.yml                   # Docker setup
├── Dockerfile
├── nest-cli.json                        # NestJS CLI config
├── package.json
├── tsconfig.json
└── README.md
```

---

## Module Specifications

### 1. Jobs Module

**Responsibility**: Manage job records, statuses, notes, and statistics

#### Jobs Controller (`jobs.controller.ts`)

```typescript
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ========== CRUD Operations ==========

  @Get()
  @ApiOperation({ summary: 'List all jobs with optional filtering' })
  @ApiQuery({ name: 'hidden', required: false, type: Boolean, description: 'Include hidden jobs (default: false)' })
  @ApiQuery({ name: 'applied', required: false, type: Boolean, description: 'Filter by applied status' })
  @ApiQuery({ name: 'interview', required: false, type: Boolean, description: 'Filter by interview status' })
  @ApiQuery({ name: 'rejected', required: false, type: Boolean, description: 'Filter by rejected status' })
  @ApiQuery({ name: 'blocked', required: false, type: Boolean, description: 'Filter by blocked status' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset (default: 0)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['id', 'date', 'company', 'title'], description: 'Sort field' })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' })
  async findAll(@Query() query: JobQueryDto): Promise<{ data: Job[]; total: number; limit: number; offset: number }> {
    // GET /jobs?hidden=false&applied=true&limit=50&offset=0&sort=date&order=DESC
    return this.jobsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get job statistics' })
  async getStats(): Promise<JobStatsDto> {
    // GET /jobs/stats
    return this.jobsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single job by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Job> {
    // GET /jobs/:id
    return this.jobsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new job' })
  async create(@Body() createJobDto: CreateJobDto): Promise<Job> {
    // POST /jobs
    return this.jobsService.create(createJobDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a job (full replacement)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<Job> {
    // PUT /jobs/:id - Full update
    return this.jobsService.update(id, updateJobDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a job' })
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() patchJobDto: Partial<UpdateJobDto>,
  ): Promise<Job> {
    // PATCH /jobs/:id - Partial update (any field: hidden, applied, interview, rejected, blocked, notes, etc.)
    return this.jobsService.patch(id, patchJobDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    // DELETE /jobs/:id
    return this.jobsService.remove(id);
  }

  // ========== AI-Powered Sub-resources ==========

  @Get(':id/analysis')
  @ApiOperation({ summary: 'Get job analysis' })
  async getAnalysis(@Param('id', ParseIntPipe) id: number): Promise<{ analysis: any }> {
    // GET /jobs/:id/analysis
    return this.jobsService.getAnalysis(id);
  }

  @Post(':id/analysis')
  @ApiOperation({ summary: 'Generate job analysis using AI' })
  async createAnalysis(@Param('id', ParseIntPipe) id: number): Promise<{ analysis: any }> {
    // POST /jobs/:id/analysis
    return this.jobsService.generateAnalysis(id);
  }

  @Get(':id/cover-letter')
  @ApiOperation({ summary: 'Get cover letter' })
  async getCoverLetter(@Param('id', ParseIntPipe) id: number): Promise<{ cover_letter: string }> {
    // GET /jobs/:id/cover-letter
    return this.jobsService.getCoverLetter(id);
  }

  @Post(':id/cover-letter')
  @ApiOperation({ summary: 'Generate cover letter using AI' })
  async createCoverLetter(@Param('id', ParseIntPipe) id: number): Promise<{ cover_letter: string }> {
    // POST /jobs/:id/cover-letter
    return this.jobsService.generateCoverLetter(id);
  }

  @Get(':id/resume')
  @ApiOperation({ summary: 'Get tailored resume' })
  async getResume(@Param('id', ParseIntPipe) id: number): Promise<{ resume: string }> {
    // GET /jobs/:id/resume
    return this.jobsService.getResume(id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Generate tailored resume using AI' })
  async createResume(@Param('id', ParseIntPipe) id: number): Promise<{ resume: string }> {
    // POST /jobs/:id/resume
    return this.jobsService.generateResume(id);
  }
}
```

#### Jobs Service (`jobs.service.ts`)

```typescript
@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    private aiService: AiService,
  ) {}

  async findAll(query: JobQueryDto): Promise<{ data: Job[]; total: number; limit: number; offset: number }> {
    const queryBuilder = this.jobsRepository.createQueryBuilder('job');

    // Filter by hidden status
    if (query.hidden === false) {
      queryBuilder.andWhere('job.hidden = :hidden', { hidden: 0 });
    }

    // Filter by specific statuses
    if (query.applied !== undefined) {
      queryBuilder.andWhere('job.applied = :applied', { applied: query.applied ? 1 : 0 });
    }

    if (query.interview !== undefined) {
      queryBuilder.andWhere('job.interview = :interview', { interview: query.interview ? 1 : 0 });
    }

    if (query.rejected !== undefined) {
      queryBuilder.andWhere('job.rejected = :rejected', { rejected: query.rejected ? 1 : 0 });
    }

    if (query.blocked !== undefined) {
      queryBuilder.andWhere('job.blocked = :blocked', { blocked: query.blocked ? 1 : 0 });
    }

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply sorting and pagination
    queryBuilder
      .orderBy(`job.${query.sort}`, query.order)
      .skip(query.offset)
      .take(query.limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async patch(id: number, patchData: Partial<UpdateJobDto>): Promise<Job> {
    const job = await this.findOne(id);

    // Apply partial updates
    Object.assign(job, patchData);

    return this.jobsRepository.save(job);
  }

  async findOne(id: number): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async updateStatus(id: number, status: JobStatus): Promise<Job> {
    const job = await this.findOne(id);

    // Reset all statuses
    job.applied = 0;
    job.interview = 0;
    job.rejected = 0;
    job.blocked = 0;

    // Set the new status
    if (status !== JobStatus.NONE) {
      job[status] = 1;
    }

    return this.jobsRepository.save(job);
  }

  async getStats(): Promise<JobStatsDto> {
    const [
      total,
      notHidden,
      applied,
      interview,
      rejected,
      blocked,
    ] = await Promise.all([
      this.jobsRepository.count(),
      this.jobsRepository.count({ where: { hidden: 0 } }),
      this.jobsRepository.count({ where: { applied: 1 } }),
      this.jobsRepository.count({ where: { interview: 1 } }),
      this.jobsRepository.count({ where: { rejected: 1 } }),
      this.jobsRepository.count({ where: { blocked: 1 } }),
    ]);

    return {
      total,
      not_hidden: notHidden,
      applied,
      interview,
      rejected,
      blocked,
    };
  }

  // ... other methods
}
```

#### DTOs

**create-job.dto.ts**
```typescript
export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  location: string;

  @IsDateString()
  date: string;

  @IsUrl()
  job_url: string;

  @IsString()
  job_description: string;
}
```

**update-status.dto.ts**
```typescript
export enum JobStatus {
  APPLIED = 'applied',
  INTERVIEW = 'interview',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
  NONE = 'none',
}

export class UpdateStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;
}
```

**job-query.dto.ts**
```typescript
export class JobQueryDto {
  // Filtering
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  hidden?: boolean = false; // false = exclude hidden, true = include hidden

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  applied?: boolean; // true = only applied, undefined = all

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  interview?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  rejected?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  blocked?: boolean;

  // Pagination
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 100;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;

  // Sorting
  @IsOptional()
  @IsIn(['id', 'date', 'company', 'title', 'date_loaded'])
  sort?: string = 'id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
```

**update-job.dto.ts**
```typescript
export class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  job_description?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value ? 1 : 0))
  hidden?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value ? 1 : 0))
  applied?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value ? 1 : 0))
  interview?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value ? 1 : 0))
  rejected?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value ? 1 : 0))
  blocked?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

---

### 2. Scraper Module

**Responsibility**: Web scraping, job extraction, and parsing

#### Scraper Controller (`scraper.controller.ts`)

```typescript
@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly queueService: QueueService,
  ) {}

  @Post('jobs')
  @ApiOperation({ summary: 'Trigger background scraping job' })
  async triggerScrape(): Promise<{ jobId: string; status: string }> {
    // POST /scraper/jobs
    const job = await this.queueService.addScrapeJob();
    return {
      jobId: job.id as string,
      status: 'queued',
    };
  }

  @Post('jobs/single')
  @ApiOperation({ summary: 'Scrape a single URL immediately (synchronous)' })
  async scrapeSingle(@Body() dto: ScrapeSingleDto): Promise<Job> {
    // POST /scraper/jobs/single
    // Body: { url: string }
    return this.scraperService.scrapeSinglePage(dto.url);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get scraping job status' })
  async getJobStatus(@Param('jobId') jobId: string): Promise<{
    id: string;
    state: string;
    progress: number;
    result?: any;
  }> {
    // GET /scraper/jobs/:jobId
    return this.queueService.getJobStatus(jobId);
  }

  @Post('refilter')
  @ApiOperation({ summary: 'Reapply filters to all visible jobs' })
  async refilter(): Promise<{ hidden: number; checked: number }> {
    // POST /scraper/refilter
    return this.scraperService.refilterJobs();
  }

  @Post('retry-failed')
  @ApiOperation({ summary: 'Retry fetching failed job descriptions' })
  async retryFailed(): Promise<{ success: number; failed: number }> {
    // POST /scraper/retry-failed
    return this.scraperService.rescrapeFailedJobs();
  }
}
```

#### Scraper Service (`scraper.service.ts`)

```typescript
@Injectable()
export class ScraperService {
  constructor(
    private readonly linkedinScraper: LinkedinScraperService,
    private readonly pageParser: PageParserService,
    private readonly jobFilter: JobFilterService,
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  async scrapeJobs(): Promise<{ added: number; filtered: number }> {
    const config = this.configService.get('scraper');

    // Step 1: Scrape job cards
    const jobCards = await this.linkedinScraper.scrapeJobCards(config);

    // Step 2: Remove duplicates
    const uniqueJobs = this.removeDuplicates(jobCards);

    // Step 3: Find new jobs
    const newJobs = await this.findNewJobs(uniqueJobs);

    // Step 4: Fetch job descriptions
    const jobsWithDescriptions = await this.fetchJobDescriptions(newJobs);

    // Step 5: Apply filters
    const { passed, filtered } = this.jobFilter.filterJobs(jobsWithDescriptions);

    // Step 6: Save to database
    await this.saveJobs(passed, filtered);

    return {
      added: passed.length,
      filtered: filtered.length,
    };
  }

  async scrapeSinglePage(url: string): Promise<Job> {
    // Use AI to parse the page
    const jobData = await this.pageParser.parseJobPage(url);

    // Check if exists
    const existing = await this.jobsRepository.findOne({
      where: { job_url: url }
    });

    if (existing) {
      throw new ConflictException('Job already exists');
    }

    // Save to database
    const job = this.jobsRepository.create(jobData);
    await this.jobsRepository.save(job);

    // Analyze the job
    await this.aiService.analyzeJob(job.id);

    return job;
  }

  async refilterJobs(): Promise<{ hidden: number; checked: number }> {
    const visibleJobs = await this.jobsRepository.find({
      where: { hidden: 0 }
    });

    let hiddenCount = 0;

    for (const job of visibleJobs) {
      const passes = this.jobFilter.checkJob(job);

      if (!passes) {
        job.hidden = 1;
        await this.jobsRepository.save(job);
        hiddenCount++;
      }
    }

    return {
      hidden: hiddenCount,
      checked: visibleJobs.length,
    };
  }

  async rescrapeFailedJobs(): Promise<{ success: number; failed: number }> {
    const failedJobs = await this.jobsRepository.find({
      where: { job_description: 'Could not find Job Description' },
    });

    let successCount = 0;
    let failedCount = 0;

    for (const job of failedJobs) {
      const description = await this.linkedinScraper.fetchJobDescription(
        job.job_url,
      );

      job.job_description = description;
      await this.jobsRepository.save(job);

      if (description === 'Could not find Job Description') {
        failedCount++;
      } else {
        successCount++;
        // Analyze the job
        await this.aiService.analyzeJob(job.id);
      }
    }

    return { success: successCount, failed: failedCount };
  }

  // Helper methods
  private removeDuplicates(jobs: any[]): any[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title}|${job.company}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async findNewJobs(jobs: any[]): Promise<any[]> {
    const existingUrls = await this.jobsRepository
      .createQueryBuilder('job')
      .select('job.job_url')
      .getMany();

    const existingUrlSet = new Set(existingUrls.map(j => j.job_url));

    return jobs.filter(job => !existingUrlSet.has(job.job_url));
  }

  private async fetchJobDescriptions(jobs: any[]): Promise<any[]> {
    return Promise.all(
      jobs.map(async (job) => {
        job.job_description = await this.linkedinScraper.fetchJobDescription(
          job.job_url,
        );
        return job;
      }),
    );
  }

  private async saveJobs(passed: any[], filtered: any[]): Promise<void> {
    // Save passed jobs to jobs table
    for (const jobData of passed) {
      const job = this.jobsRepository.create({
        ...jobData,
        date_loaded: new Date(),
      });
      await this.jobsRepository.save(job);
    }

    // Save filtered jobs to filtered_jobs table (if needed)
    // ...
  }
}
```

#### LinkedIn Scraper Service (`linkedin-scraper.service.ts`)

```typescript
@Injectable()
export class LinkedinScraperService {
  private readonly logger = new Logger(LinkedinScraperService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async scrapeJobCards(config: any): Promise<any[]> {
    const allJobs = [];

    for (let round = 0; round < config.rounds; round++) {
      for (const query of config.search_queries) {
        for (let page = 0; page < config.pages_to_scrape; page++) {
          const url = this.buildSearchUrl(query, page, config.timespan);
          this.logger.log(`Scraping: ${url}`);

          const jobs = await this.fetchJobCards(url);
          allJobs.push(...jobs);

          // Rate limiting
          await this.delay(1000);
        }
      }
    }

    return allJobs;
  }

  async fetchJobCards(url: string): Promise<any[]> {
    try {
      const response = await this.httpService.axiosRef.get(url, {
        headers: this.configService.get('scraper.headers'),
        timeout: 5000,
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      $('.base-search-card__info').each((_, element) => {
        const $el = $(element);

        const title = $el.find('h3').text().trim();
        const company = $el.find('a.hidden-nested-link').text().trim();
        const location = $el.find('.job-search-card__location').text().trim();

        const parent = $el.parent();
        const entityUrn = parent.attr('data-entity-urn');
        const jobId = entityUrn?.split(':').pop();
        const jobUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;

        const dateTag = $el.find('time').first();
        const date = dateTag.attr('datetime') || '';

        jobs.push({
          title,
          company,
          location,
          date,
          job_url: jobUrl,
          applied: 0,
          hidden: 0,
          interview: 0,
          rejected: 0,
        });
      });

      return jobs;
    } catch (error) {
      this.logger.error(`Error fetching job cards: ${error.message}`);
      return [];
    }
  }

  async fetchJobDescription(url: string, retries = 3): Promise<string> {
    const delays = [2000, 5000, 10000];

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.httpService.axiosRef.get(url, {
          headers: this.configService.get('scraper.headers'),
          timeout: 5000,
        });

        const $ = cheerio.load(response.data);
        const descDiv = $('.description__text.description__text--rich');

        if (descDiv.length === 0) {
          if (attempt < retries - 1) {
            this.logger.warn(`Description not found, retrying in ${delays[attempt]}ms...`);
            await this.delay(delays[attempt]);
            continue;
          }
          return 'Could not find Job Description';
        }

        // Remove unwanted elements
        descDiv.find('span, a').remove();

        // Process bullet points
        descDiv.find('ul li').each((_, el) => {
          $(el).prepend('- ');
        });

        let text = descDiv.text().trim();
        text = text.replace(/\n\n/g, '\n');
        text = text.replace(/::marker/g, '-');
        text = text.replace(/-\n/g, '- ');
        text = text.replace(/Show less|Show more/g, '');

        return text;
      } catch (error) {
        this.logger.error(`Error fetching description (attempt ${attempt + 1}): ${error.message}`);
        if (attempt < retries - 1) {
          await this.delay(delays[attempt]);
        }
      }
    }

    return 'Could not find Job Description';
  }

  private buildSearchUrl(query: any, pageIndex: number, timespan: string): string {
    const baseUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

    const params = new URLSearchParams({
      keywords: query.keywords,
      location: query.location,
      start: String(25 * pageIndex),
      f_TPR: timespan,
    });

    // Add dynamic parameters
    Object.entries(query).forEach(([key, value]) => {
      if (key !== 'keywords' && key !== 'location') {
        params.append(key, String(value));
      }
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Page Parser Service (`page-parser.service.ts`)

```typescript
@Injectable()
export class PageParserService {
  constructor(
    private readonly httpService: HttpService,
    private readonly aiService: AiService,
  ) {}

  async parseJobPage(url: string): Promise<Partial<Job>> {
    // Fetch the page
    const response = await this.httpService.axiosRef.get(url);
    const html = response.data;

    // Create prompt for AI
    const prompt = `Please analyze this job page and extract the job information in JSON format.

The JSON should contain the following fields:
- title: Job title (string)
- company: Company name (string)
- location: Job location (string)
- date: Job posting date in YYYY-MM-DD format (string)
- job_url: The provided URL (string)
- job_description: Full job description text (string)

HTML content:
${html}

IMPORTANT: Return ONLY the raw JSON object with no markdown formatting, no code blocks, no backticks. Start with { and end with }.`;

    const response = await this.aiService.callOpenRouter(
      prompt,
      'page_scraper',
    );

    // Parse JSON response
    let jobData: any;
    try {
      jobData = JSON.parse(response);
    } catch (e) {
      // Try to clean markdown formatting
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      jobData = JSON.parse(cleaned);
    }

    // Ensure required fields
    return {
      title: jobData.title || '',
      company: jobData.company || '',
      location: jobData.location || '',
      date: jobData.date || new Date().toISOString().split('T')[0],
      job_url: url,
      job_description: jobData.job_description || '',
      applied: 0,
      hidden: 0,
      interview: 0,
      rejected: 0,
    };
  }
}
```

---

### 3. AI Module

**Responsibility**: AI-powered features (analysis, cover letters, resumes)

#### AI Service (`ai.service.ts`)

```typescript
@Injectable()
export class AiService {
  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly jobAnalyzer: JobAnalyzerService,
    private readonly coverLetterService: CoverLetterService,
    private readonly resumeTailorService: ResumeTailorService,
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
  ) {}

  async analyzeJob(jobId: number): Promise<any> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const analysis = await this.jobAnalyzer.analyze(
      job.job_description,
      job.title,
    );

    // Store in metadata
    job.metadata = JSON.stringify(analysis, null, 2);
    await this.jobsRepository.save(job);

    return analysis;
  }

  async generateCoverLetter(jobId: number): Promise<string> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const coverLetter = await this.coverLetterService.generate(job);

    // Store in database
    job.cover_letter = coverLetter;
    await this.jobsRepository.save(job);

    return coverLetter;
  }

  async generateResume(jobId: number): Promise<string> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const resume = await this.resumeTailorService.tailor(job);

    // Store in database
    job.resume = resume;
    await this.jobsRepository.save(job);

    return resume;
  }

  async callOpenRouter(prompt: string, operationType: string): Promise<string> {
    return this.openRouterService.call(prompt, operationType);
  }
}
```

#### OpenRouter Service (`openrouter.service.ts`)

```typescript
@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async call(prompt: string, operationType: string, model?: string): Promise<string> {
    const config = this.getOperationConfig(operationType);
    const apiKey = this.configService.get(config.apiKey);
    const modelName = model || this.configService.get(config.model);

    if (!apiKey) {
      throw new Error(`API key for ${operationType} is missing`);
    }

    if (!modelName) {
      throw new Error(`Model for ${operationType} is missing`);
    }

    try {
      const response = await this.httpService.axiosRef.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`OpenRouter API error: ${error.message}`);
      throw new Error(`Failed to call OpenRouter API: ${error.message}`);
    }
  }

  private getOperationConfig(operationType: string): { apiKey: string; model: string } {
    const configs = {
      job_analysis: {
        apiKey: 'ai.job_analysis_api_key',
        model: 'ai.job_analysis_model',
      },
      cover_letter: {
        apiKey: 'ai.cover_letter_api_key',
        model: 'ai.cover_letter_model',
      },
      resume: {
        apiKey: 'ai.resume_api_key',
        model: 'ai.resume_model',
      },
      page_scraper: {
        apiKey: 'ai.page_scraper_api_key',
        model: 'ai.page_scraper_model',
      },
    };

    if (!configs[operationType]) {
      throw new Error(`Invalid operation type: ${operationType}`);
    }

    return configs[operationType];
  }
}
```

#### Job Analyzer Service (`job-analyzer.service.ts`)

```typescript
@Injectable()
export class JobAnalyzerService {
  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly configService: ConfigService,
  ) {}

  async analyze(jobDescription: string, jobTitle: string): Promise<any> {
    const questions = this.configService.get<any[]>('ai.analysis_questions');

    if (!questions || questions.length === 0) {
      throw new Error('No analysis questions configured');
    }

    const results = {};

    for (const questionConfig of questions) {
      const questionText = typeof questionConfig === 'string'
        ? questionConfig
        : questionConfig.question;

      const questionTitle = typeof questionConfig === 'string'
        ? questionConfig
        : questionConfig.title;

      const prompt = `Based on the following job posting, please answer this question in markdown: ${questionText}

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Please provide a concise and relevant answer based only on the information provided.`;

      try {
        const answer = await this.openRouterService.call(prompt, 'job_analysis');
        results[questionTitle] = answer;
      } catch (error) {
        results[questionTitle] = 'Error during analysis';
      }
    }

    return results;
  }
}
```

#### Cover Letter Service (`cover-letter.service.ts`)

```typescript
@Injectable()
export class CoverLetterService {
  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly pdfReader: PdfReaderService,
    private readonly configService: ConfigService,
  ) {}

  async generate(job: Job): Promise<string> {
    const resumePath = this.configService.get('files.resume_path');
    const resume = await this.pdfReader.extractText(resumePath);

    if (!resume) {
      throw new Error('Could not read resume');
    }

    // First pass
    const prompt1 = `You are a career coach with over 15 years of experience helping job seekers land their dream jobs in tech. You are helping a candidate to write a cover letter for the below role. Approach this task in three steps.

Step 1. Identify main challenges someone in this position would face day to day.

Step 2. Write an attention grabbing hook for your cover letter that highlights your experience and qualifications in a way that shows you empathize and can successfully take on challenges of the role. Consider incorporating specific examples of how you tackled these challenges in your past work, and explore creative ways to express your enthusiasm for the opportunity. Put emphasis on how the candidate can contribute to company as opposed to just listing accomplishments. Keep your hook within 100 words or less.

Step 3. Finish writing the cover letter based on the resume and keep it within 250 words. Respond with final cover letter only.

Job description: ${job.job_description}
Company: ${job.company}
Title: ${job.title}
Resume: ${resume}`;

    const draft1 = await this.openRouterService.call(prompt1, 'cover_letter');

    // Second pass - refinement
    const prompt2 = `You are young but experienced career coach helping job seekers land their dream jobs in tech. I need your help crafting a cover letter.

Here is a job description: ${job.job_description}

Here is my resume: ${resume}

Here's the cover letter I got so far: ${draft1}

I need you to help me improve it. Let's approach this in following steps:

Step 1. Please set the formality scale as follows: 1 is conversational English, my initial Cover letter draft is 10.

Step 2. Identify three to five ways this cover letter can be improved, and elaborate on each way with at least one thoughtful sentence.

Step 3. Suggest an improved cover letter based on these suggestions with the Formality Score set to 7. Avoid subjective qualifiers such as drastic, transformational, etc. Keep the final cover letter within 250 words.

Please respond with the final cover letter only.`;

    const finalCoverLetter = await this.openRouterService.call(prompt2, 'cover_letter');

    return finalCoverLetter;
  }
}
```

#### Resume Tailor Service (`resume-tailor.service.ts`)

```typescript
@Injectable()
export class ResumeTailorService {
  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly pdfReader: PdfReaderService,
    private readonly configService: ConfigService,
  ) {}

  async tailor(job: Job): Promise<string> {
    const resumePath = this.configService.get('files.resume_path');
    const resume = await this.pdfReader.extractText(resumePath);

    if (!resume) {
      throw new Error('Could not read resume');
    }

    const prompt = `You are a career coach with a client that is applying for a job as a ${job.title} at ${job.company}. They have a resume that you need to review and suggest how to tailor it for the job.

Approach this task in the following steps:

1. Highlight three to five most important responsibilities for this role based on the job description.

2. Based on these most important responsibilities from the job description, please tailor the resume for this role. Do not make information up.

Respond with the final resume only.

Here is the job description:
${job.job_description}

Here is the resume:
${resume}`;

    const tailoredResume = await this.openRouterService.call(prompt, 'resume');

    return tailoredResume;
  }
}
```

---

### 4. Queue Module

**Responsibility**: Background job processing

#### Queue Service (`queue.service.ts`)

```typescript
@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('scraper') private scraperQueue: Queue,
    @InjectQueue('analysis') private analysisQueue: Queue,
  ) {}

  async addScrapeJob(): Promise<Job> {
    return this.scraperQueue.add('scrape-jobs', {});
  }

  async addAnalysisJob(mode: 'not-analyzed' | 'not-hidden' | 'all'): Promise<Job> {
    return this.analysisQueue.add('analyze-jobs', { mode });
  }

  async getJobStatus(jobId: string): Promise<any> {
    // Check both queues
    const scraperJob = await this.scraperQueue.getJob(jobId);
    const analysisJob = await this.analysisQueue.getJob(jobId);

    const job = scraperJob || analysisJob;

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: await job.progress(),
      state: await job.getState(),
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
```

#### Scraper Processor (`scraper.processor.ts`)

```typescript
@Processor('scraper')
export class ScraperProcessor {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(private readonly scraperService: ScraperService) {}

  @Process('scrape-jobs')
  async handleScrapeJobs(job: Job): Promise<any> {
    this.logger.log(`Starting scrape job ${job.id}`);

    try {
      await job.updateProgress(10);

      const result = await this.scraperService.scrapeJobs();

      await job.updateProgress(100);

      this.logger.log(`Scrape job ${job.id} completed: ${JSON.stringify(result)}`);

      return result;
    } catch (error) {
      this.logger.error(`Scrape job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }
}
```

#### Analysis Processor (`analysis.processor.ts`)

```typescript
@Processor('analysis')
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
  ) {}

  @Process('analyze-jobs')
  async handleAnalyzeJobs(job: Job<{ mode: string }>): Promise<any> {
    this.logger.log(`Starting analysis job ${job.id} with mode ${job.data.mode}`);

    try {
      // Get jobs to analyze based on mode
      const jobs = await this.getJobsToAnalyze(job.data.mode);

      const total = jobs.length;
      let analyzed = 0;

      for (const jobRecord of jobs) {
        await this.aiService.analyzeJob(jobRecord.id);
        analyzed++;
        await job.updateProgress((analyzed / total) * 100);
      }

      this.logger.log(`Analysis job ${job.id} completed: ${analyzed} jobs analyzed`);

      return { analyzed };
    } catch (error) {
      this.logger.error(`Analysis job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  private async getJobsToAnalyze(mode: string): Promise<Job[]> {
    const queryBuilder = this.jobsRepository.createQueryBuilder('job');

    if (mode === 'not-analyzed') {
      queryBuilder.where('job.metadata IS NULL OR job.metadata = ""');
    } else if (mode === 'not-hidden') {
      queryBuilder.where('job.hidden = 0');
    }
    // mode === 'all' requires no filter

    return queryBuilder.getMany();
  }
}
```

---

### 5. Filters Module

**Responsibility**: Job filtering logic

#### Job Filter Service (`job-filter.service.ts`)

```typescript
@Injectable()
export class JobFilterService {
  constructor(
    private readonly titleFilter: TitleFilterService,
    private readonly companyFilter: CompanyFilterService,
    private readonly locationFilter: LocationFilterService,
    private readonly descriptionFilter: DescriptionFilterService,
    private readonly languageDetector: LanguageDetectorService,
    private readonly configService: ConfigService,
  ) {}

  filterJobs(jobs: any[]): { passed: any[]; filtered: any[] } {
    const passed = [];
    const filtered = [];

    for (const job of jobs) {
      if (this.checkJob(job)) {
        passed.push(job);
      } else {
        filtered.push(job);
      }
    }

    return { passed, filtered };
  }

  checkJob(job: any): boolean {
    // Title filter
    if (!this.titleFilter.check(job.title)) {
      return false;
    }

    // Company filter
    if (!this.companyFilter.check(job.company)) {
      return false;
    }

    // Location filter
    if (!this.locationFilter.check(job.location)) {
      return false;
    }

    // Description filter
    if (job.job_description) {
      if (!this.descriptionFilter.check(job.job_description)) {
        return false;
      }

      // Language filter
      if (!this.languageDetector.check(job.job_description)) {
        return false;
      }
    }

    return true;
  }
}
```

#### Language Detector Service (`language-detector.service.ts`)

```typescript
import * as franc from 'franc';

@Injectable()
export class LanguageDetectorService {
  constructor(private readonly configService: ConfigService) {}

  check(text: string): boolean {
    const allowedLanguages = this.configService.get<string[]>('filters.languages');

    if (!allowedLanguages || allowedLanguages.length === 0) {
      return true; // No language filter
    }

    try {
      const detected = franc(text);

      // franc returns ISO 639-3 codes, may need mapping
      // e.g., 'eng' -> 'en'
      const langCode = this.mapLanguageCode(detected);

      return allowedLanguages.includes(langCode);
    } catch (error) {
      // Default to English if detection fails
      return allowedLanguages.includes('en');
    }
  }

  private mapLanguageCode(iso6393: string): string {
    const mapping = {
      'eng': 'en',
      'spa': 'es',
      'fra': 'fr',
      'deu': 'de',
      // Add more as needed
    };

    return mapping[iso6393] || iso6393;
  }
}
```

---

### 6. Files Module

**Responsibility**: File handling (PDF, CSV)

#### PDF Reader Service (`pdf-reader.service.ts`)

```typescript
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';

@Injectable()
export class PdfReaderService {
  private readonly logger = new Logger(PdfReaderService.name);

  async extractText(filePath: string): Promise<string | null> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      this.logger.error(`Error reading PDF ${filePath}: ${error.message}`);
      return null;
    }
  }
}
```

#### CSV Exporter Service (`csv-exporter.service.ts`)

```typescript
@Injectable()
export class CsvExporterService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
  ) {}

  async exportJobs(includeHidden: boolean = false): Promise<string> {
    const queryBuilder = this.jobsRepository.createQueryBuilder('job');

    if (!includeHidden) {
      queryBuilder.where('job.hidden = 0');
    }

    const jobs = await queryBuilder.getMany();

    // Convert to CSV
    const csv = this.convertToCSV(jobs);

    // Write to file
    const filename = `jobs_export_${Date.now()}.csv`;
    fs.writeFileSync(filename, csv);

    return filename;
  }

  private convertToCSV(jobs: Job[]): string {
    if (jobs.length === 0) return '';

    const headers = Object.keys(jobs[0]).join(',');
    const rows = jobs.map(job =>
      Object.values(job)
        .map(val => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );

    return [headers, ...rows].join('\n');
  }
}
```

---

### 7. CLI Module

**Responsibility**: Command-line interface

#### CLI Setup (`cli.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { CommandModule } from 'nest-commander';
import { ScrapeCommand } from './commands/scrape.command';
import { AnalyzeCommand } from './commands/analyze.command';
// ... other commands

@Module({
  imports: [
    CommandModule,
    // Import other modules
  ],
  providers: [
    ScrapeCommand,
    AnalyzeCommand,
    // ... other commands
  ],
})
export class CliModule {}
```

#### Scrape Command (`scrape.command.ts`)

```typescript
import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'scrape',
  description: 'Scrape jobs from LinkedIn',
})
export class ScrapeCommand extends CommandRunner {
  constructor(private readonly scraperService: ScraperService) {
    super();
  }

  async run(passedParams: string[], options?: any): Promise<void> {
    console.log('Starting job scraping...');

    const result = await this.scraperService.scrapeJobs();

    console.log(`✓ Scraping complete`);
    console.log(`  Jobs added: ${result.added}`);
    console.log(`  Jobs filtered: ${result.filtered}`);
  }
}
```

#### Analyze Command (`analyze.command.ts`)

```typescript
import { Command, CommandRunner, Option } from 'nest-commander';

interface AnalyzeOptions {
  mode?: 'not-analyzed' | 'not-hidden' | 'all';
}

@Command({
  name: 'analyze',
  description: 'Analyze jobs with AI',
})
export class AnalyzeCommand extends CommandRunner {
  constructor(
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async run(passedParams: string[], options?: AnalyzeOptions): Promise<void> {
    const mode = options?.mode || 'not-analyzed';

    console.log(`Starting job analysis (mode: ${mode})...`);

    const job = await this.queueService.addAnalysisJob(mode);

    console.log(`✓ Analysis job queued (ID: ${job.id})`);
  }

  @Option({
    flags: '--mode <mode>',
    description: 'Analysis mode: not-analyzed, not-hidden, all',
  })
  parseMode(val: string): string {
    return val;
  }
}
```

#### CLI Entry Point (`main-cli.ts`)

```typescript
import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn'],
  });
}

bootstrap();
```

**package.json scripts:**
```json
{
  "scripts": {
    "cli": "ts-node src/main-cli.ts",
    "scrape": "npm run cli -- scrape",
    "analyze": "npm run cli -- analyze",
    "analyze:all": "npm run cli -- analyze --mode all"
  }
}
```

---

## Database Schema

### Job Entity (`job.entity.ts`)

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  company: string;

  @Column({ type: 'varchar', length: 500 })
  location: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 1000, unique: true })
  job_url: string;

  @Column({ type: 'text' })
  job_description: string;

  @Column({ type: 'int', default: 0 })
  applied: number;

  @Column({ type: 'int', default: 0 })
  hidden: number;

  @Column({ type: 'int', default: 0 })
  interview: number;

  @Column({ type: 'int', default: 0 })
  rejected: number;

  @Column({ type: 'int', default: 0 })
  blocked: number;

  @Column({ type: 'datetime' })
  date_loaded: Date;

  @Column({ type: 'text', nullable: true })
  cover_letter: string;

  @Column({ type: 'text', nullable: true })
  resume: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### Filtered Job Entity (`filtered-job.entity.ts`)

```typescript
@Entity('filtered_jobs')
export class FilteredJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  company: string;

  @Column({ type: 'varchar', length: 500 })
  location: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 1000 })
  job_url: string;

  @Column({ type: 'text' })
  job_description: string;

  @Column({ type: 'datetime' })
  date_loaded: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  filter_reason: string; // Why it was filtered

  @CreateDateColumn()
  created_at: Date;
}
```

### Migration Example

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateJobsTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'jobs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'company',
            type: 'varchar',
            length: '500',
          },
          // ... other columns
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('jobs');
  }
}
```

---

## API Endpoints

### Complete API Specification

## Improved RESTful API Design

### Design Principles

1. **Query Parameters for Filtering**: All job attributes can be filtered via query params
2. **Unified Update Endpoint**: Single `PATCH /jobs/:id` for all partial updates
3. **Sub-resources for AI Features**: Separate endpoints for analysis, cover-letter, resume
4. **Proper HTTP Methods**: GET (retrieve), POST (create), PUT (full update), PATCH (partial update), DELETE (remove)
5. **Pagination Support**: Offset-based pagination with total count
6. **Consistent Response Format**: Structured responses with metadata

---

#### Jobs Endpoints

**Core CRUD Operations:**

| Method | Endpoint | Description | Query/Body Parameters | Response |
|--------|----------|-------------|----------------------|----------|
| GET | `/jobs` | List jobs with filtering | Query: `hidden`, `applied`, `interview`, `rejected`, `blocked`, `limit`, `offset`, `sort`, `order` | `{ data: Job[], total: number, limit: number, offset: number }` |
| GET | `/jobs/stats` | Get statistics | - | `JobStatsDto` |
| GET | `/jobs/:id` | Get single job | - | `Job` |
| POST | `/jobs` | Create new job | Body: `CreateJobDto` | `Job` |
| PUT | `/jobs/:id` | Full update (replace) | Body: `UpdateJobDto` | `Job` |
| PATCH | `/jobs/:id` | Partial update | Body: `Partial<UpdateJobDto>` (any field) | `Job` |
| DELETE | `/jobs/:id` | Delete job | - | `204 No Content` |

**Examples:**
```bash
# Get all visible jobs (hidden=false is default)
GET /jobs

# Get all jobs including hidden ones
GET /jobs?hidden=true

# Get only applied jobs
GET /jobs?applied=true

# Get jobs in interview stage, sorted by date
GET /jobs?interview=true&sort=date&order=DESC

# Get paginated results
GET /jobs?limit=50&offset=100

# Hide a job (partial update)
PATCH /jobs/123
Body: { "hidden": true }

# Mark as applied and add notes (partial update)
PATCH /jobs/123
Body: { "applied": true, "notes": "Applied via LinkedIn" }

# Update status to interview (partial update)
PATCH /jobs/123
Body: { "interview": true, "applied": false }
```

---

**AI-Powered Sub-resources:**

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/jobs/:id/analysis` | Get existing analysis | `{ analysis: object }` |
| POST | `/jobs/:id/analysis` | Generate AI analysis | `{ analysis: object }` |
| GET | `/jobs/:id/cover-letter` | Get existing cover letter | `{ cover_letter: string }` |
| POST | `/jobs/:id/cover-letter` | Generate AI cover letter | `{ cover_letter: string }` |
| GET | `/jobs/:id/resume` | Get existing tailored resume | `{ resume: string }` |
| POST | `/jobs/:id/resume` | Generate AI-tailored resume | `{ resume: string }` |

**Examples:**
```bash
# Get analysis if exists, or null
GET /jobs/123/analysis

# Generate new analysis (or regenerate)
POST /jobs/123/analysis

# Get cover letter
GET /jobs/123/cover-letter

# Generate cover letter
POST /jobs/123/cover-letter
```

---

#### Scraper Endpoints

**Background Job Management:**

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/scraper/jobs` | Trigger background scraping | - | `{ jobId: string, status: 'queued' }` |
| POST | `/scraper/jobs/single` | Scrape single URL immediately | `{ url: string }` | `Job` |
| POST | `/scraper/refilter` | Reapply filters to all jobs | - | `{ hidden: number, checked: number }` |
| POST | `/scraper/retry-failed` | Retry failed job descriptions | - | `{ success: number, failed: number }` |
| GET | `/scraper/jobs/:jobId` | Get scraping job status | - | `{ id, state, progress, result }` |

**Examples:**
```bash
# Trigger background scraping
POST /scraper/jobs
Response: { "jobId": "abc123", "status": "queued" }

# Check scraping job status
GET /scraper/jobs/abc123
Response: { "id": "abc123", "state": "completed", "progress": 100, "result": { "added": 50, "filtered": 10 } }

# Scrape a single page immediately
POST /scraper/jobs/single
Body: { "url": "https://linkedin.com/jobs/view/123456" }
Response: { "id": 789, "title": "Software Engineer", ... }
```

---

#### Config Endpoint

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/config` | Get frontend config | `{ analysis_questions: [...] }` |

---

#### Health Endpoint

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/health` | Health check | `{ status: 'ok', timestamp: '...' }` |

---

## Configuration Management

### Configuration Schema (`configuration.ts`)

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 5001,

  database: {
    type: process.env.DB_TYPE || 'sqlite',
    database: process.env.DB_PATH || './data/my_database.db',
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  scraper: {
    timespan: 'r2592000', // Last 30 days
    pages_to_scrape: 3,
    rounds: 1,
    days_to_scrape: 7,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    proxies: [],
    search_queries: [
      {
        keywords: 'Software Engineer',
        location: 'United States',
        f_WT: '2', // Remote
      },
    ],
  },

  filters: {
    title_include: [],
    title_exclude: ['Senior', 'Staff', 'Principal'],
    company_exclude: [],
    country_exclude: [],
    desc_words: ['security clearance', 'top secret'],
    languages: ['en'],
  },

  ai: {
    job_analysis_api_key: process.env.JOB_ANALYSIS_API_KEY,
    job_analysis_model: 'anthropic/claude-3-haiku',
    cover_letter_api_key: process.env.COVER_LETTER_API_KEY,
    cover_letter_model: 'anthropic/claude-3-sonnet',
    resume_api_key: process.env.RESUME_API_KEY,
    resume_model: 'anthropic/claude-3-sonnet',
    page_scraper_api_key: process.env.PAGE_SCRAPER_API_KEY,
    page_scraper_model: 'anthropic/claude-3-haiku',
    analysis_questions: [
      {
        title: 'Key Responsibilities',
        question: 'What are the 3-5 key responsibilities for this role?',
      },
      {
        title: 'Required Skills',
        question: 'What are the required technical skills?',
      },
      {
        title: 'Nice to Have',
        question: 'What skills are preferred but not required?',
      },
    ],
  },

  files: {
    resume_path: process.env.RESUME_PATH || './CV.pdf',
  },
});
```

### Environment Variables (`.env.example`)

```bash
# Server
PORT=5001
NODE_ENV=development

# Database
DB_TYPE=sqlite
DB_PATH=./data/my_database.db
DB_SYNC=false
DB_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenRouter API Keys
JOB_ANALYSIS_API_KEY=your_key_here
COVER_LETTER_API_KEY=your_key_here
RESUME_API_KEY=your_key_here
PAGE_SCRAPER_API_KEY=your_key_here

# Files
RESUME_PATH=./CV.pdf
```

---

## Background Jobs & Scheduling

### Queue Configuration (`queue.module.ts`)

```typescript
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue(
      {
        name: 'scraper',
      },
      {
        name: 'analysis',
      },
    ),
  ],
})
export class QueueModule {}
```

### Scheduled Jobs

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduledScraperService {
  constructor(private readonly queueService: QueueService) {}

  // Run every day at 9 AM
  @Cron('0 9 * * *')
  async handleDailyScrape() {
    console.log('Triggering scheduled scrape...');
    await this.queueService.addScrapeJob();
  }

  // Run every day at 10 AM
  @Cron('0 10 * * *')
  async handleDailyAnalysis() {
    console.log('Triggering scheduled analysis...');
    await this.queueService.addAnalysisJob('not-analyzed');
  }
}
```

---

## CLI Implementation

### Available Commands

```bash
# Scraping
npm run cli scrape
npm run cli scrape-single -- --url "https://linkedin.com/jobs/view/123"

# Analysis
npm run cli analyze
npm run cli analyze -- --mode not-hidden
npm run cli analyze -- --mode all

# Filtering
npm run cli refilter
npm run cli rescrape-failed

# Export
npm run cli export
npm run cli export -- --include-hidden

# Backup
npm run cli backup

# Full pipeline
npm run cli full
```

---

## Migration Strategy

### Phase 1: Infrastructure (Week 1)

**Tasks:**
1. Initialize NestJS project
2. Set up TypeORM with SQLite
3. Create Job and FilteredJob entities
4. Create initial migration
5. Set up configuration module
6. Set up logging (Winston)

**Deliverables:**
- Working NestJS app with database connection
- Migration scripts
- Configuration system

**Testing:**
- Database connection test
- Migration up/down test

---

### Phase 2: Jobs API (Week 2)

**Tasks:**
1. Create Jobs module
2. Implement Jobs controller with all endpoints
3. Implement Jobs service with CRUD operations
4. Create DTOs with validation
5. Add exception filters
6. Add Swagger documentation

**Deliverables:**
- Complete Jobs API matching Flask endpoints
- API documentation

**Testing:**
- Unit tests for Jobs service
- E2E tests for all endpoints
- Postman collection

---

### Phase 3: Scraper Service (Week 3)

**Tasks:**
1. Create Scraper module
2. Implement LinkedIn scraper service
3. Implement page parser service
4. Implement job filter service
5. Create scraper controller
6. Add retry logic

**Deliverables:**
- Working scraper matching Python functionality
- Filter logic implementation

**Testing:**
- Unit tests for scraper services
- Integration tests for filtering
- Mock LinkedIn responses

---

### Phase 4: AI Integration (Week 4)

**Tasks:**
1. Create AI module
2. Implement OpenRouter service
3. Implement job analyzer service
4. Implement cover letter service
5. Implement resume tailor service
6. Integrate with Files module (PDF reading)

**Deliverables:**
- AI-powered features matching Python
- PDF reading capability

**Testing:**
- Unit tests with mocked AI responses
- Integration tests with real API (limited)

---

### Phase 5: Background Jobs (Week 5)

**Tasks:**
1. Set up Redis
2. Create Queue module with BullMQ
3. Implement scraper processor
4. Implement analysis processor
5. Add scheduled jobs
6. Create job status tracking

**Deliverables:**
- Background job processing
- Scheduled scraping and analysis

**Testing:**
- Queue job tests
- Scheduler tests

---

### Phase 6: CLI (Week 6)

**Tasks:**
1. Set up nest-commander
2. Implement all CLI commands
3. Add progress indicators
4. Create CLI entry point
5. Update package.json scripts

**Deliverables:**
- Complete CLI matching Python CLI

**Testing:**
- CLI command tests
- Integration tests

---

### Phase 7: Testing & Documentation (Week 7)

**Tasks:**
1. Write comprehensive unit tests
2. Write integration tests
3. Write E2E tests
4. Improve code coverage (>80%)
5. Complete API documentation
6. Write deployment guide

**Deliverables:**
- Test suite
- Documentation

---

### Phase 8: Migration & Deployment (Week 8)

**Tasks:**
1. Data migration script (SQLite → SQLite/PostgreSQL)
2. Docker containerization
3. CI/CD pipeline setup
4. Production deployment
5. Monitoring setup

**Deliverables:**
- Production-ready application
- Deployment scripts

---

## Testing Strategy

### Unit Tests

```typescript
// jobs.service.spec.ts
describe('JobsService', () => {
  let service: JobsService;
  let repository: Repository<Job>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(Job),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    repository = module.get<Repository<Job>>(getRepositoryToken(Job));
  });

  describe('findAll', () => {
    it('should return an array of jobs', async () => {
      const jobs = [{ id: 1, title: 'Test' }];
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(jobs),
      } as any);

      expect(await service.findAll({})).toBe(jobs);
    });
  });
});
```

### Integration Tests

```typescript
// scraper.integration.spec.ts
describe('Scraper Integration', () => {
  let app: INestApplication;
  let scraperService: ScraperService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    scraperService = app.get(ScraperService);
  });

  it('should scrape and filter jobs', async () => {
    const result = await scraperService.scrapeJobs();
    expect(result).toHaveProperty('added');
    expect(result).toHaveProperty('filtered');
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### E2E Tests

```typescript
// jobs.e2e-spec.ts
describe('Jobs (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/jobs (GET)', () => {
    return request(app.getHttpServer())
      .get('/jobs')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/jobs/:id (GET)', () => {
    return request(app.getHttpServer())
      .get('/jobs/1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('title');
      });
  });
});
```

---

## Deployment Guide

### Docker Setup

**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 5001

# Start the app
CMD ["node", "dist/main"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DB_PATH=/data/my_database.db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./data:/data
      - ./config:/app/config
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

  # Optional: Redis Commander (UI for Redis)
  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      - REDIS_HOSTS=local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis

volumes:
  redis-data:
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set strong API keys
- [ ] Enable CORS properly
- [ ] Set up logging to file
- [ ] Configure rate limiting
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Set up backup cron job
- [ ] Configure Redis persistence
- [ ] Set up SSL/TLS
- [ ] Configure firewall
- [ ] Set up health checks
- [ ] Configure graceful shutdown

### Running in Production

```bash
# Build the app
npm run build

# Start with PM2
pm2 start dist/main.js --name linkedin-scraper

# Or with Docker
docker-compose up -d

# Check logs
pm2 logs linkedin-scraper
# or
docker-compose logs -f
```

---

## Challenges & Solutions

### Challenge 1: Web Scraping in Node.js

**Issue**: BeautifulSoup (Python) vs Cheerio/Puppeteer (Node.js)

**Solution**:
- Use Cheerio for static HTML (fast, lightweight)
- Use Puppeteer for dynamic content if needed
- Implement retry logic with exponential backoff
- Add rate limiting to avoid being blocked

**Code Example**:
```typescript
// Static scraping with Cheerio
const response = await axios.get(url);
const $ = cheerio.load(response.data);
const title = $('.job-title').text();

// Dynamic scraping with Puppeteer (if needed)
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url);
await page.waitForSelector('.job-title');
const title = await page.$eval('.job-title', el => el.textContent);
```

---

### Challenge 2: PDF Parsing

**Issue**: pdfminer (Python) vs pdf-parse (Node.js)

**Solution**:
- Use `pdf-parse` library
- Similar API to pdfminer
- Handles most PDF formats well

**Code Example**:
```typescript
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';

const dataBuffer = fs.readFileSync('resume.pdf');
const data = await pdfParse(dataBuffer);
const text = data.text;
```

---

### Challenge 3: Language Detection

**Issue**: langdetect (Python) vs franc (Node.js)

**Solution**:
- Use `franc` or `franc-min` library
- Returns ISO 639-3 codes
- Map codes to ISO 639-1 if needed

**Code Example**:
```typescript
import * as franc from 'franc';

const language = franc('This is English text'); // Returns 'eng'
const langCode = language === 'eng' ? 'en' : language;
```

---

### Challenge 4: Database Migrations

**Issue**: Manual SQLite operations vs TypeORM migrations

**Solution**:
- Use TypeORM migration system
- Generate migrations automatically
- Version control migrations
- Rollback support

**Code Example**:
```bash
# Generate migration
npm run migration:generate -- -n CreateJobsTable

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

---

### Challenge 5: Background Job Processing

**Issue**: Python CLI scheduling vs NestJS queue system

**Solution**:
- Use BullMQ with Redis
- Implement job processors
- Add progress tracking
- Use @nestjs/schedule for cron jobs

---

### Challenge 6: CLI in NestJS

**Issue**: argparse (Python) vs nest-commander (Node.js)

**Solution**:
- Use nest-commander
- Similar API to NestJS controllers
- Supports subcommands, options, arguments
- Full DI support

---

### Challenge 7: Type Safety

**Advantage**: TypeScript provides compile-time checks

**Implementation**:
- Define interfaces for all data structures
- Use DTOs with class-validator
- Enable strict TypeScript mode
- Use generics where applicable

---

## Appendix

### A. Key Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/axios": "^3.0.0",
    "@nestjs/bull": "^10.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/swagger": "^7.0.0",
    "typeorm": "^0.3.17",
    "sqlite3": "^5.1.6",
    "bullmq": "^5.0.0",
    "redis": "^4.6.0",
    "nest-commander": "^3.12.0",
    "cheerio": "^1.0.0-rc.12",
    "axios": "^1.6.0",
    "puppeteer": "^21.0.0",
    "pdf-parse": "^1.1.1",
    "franc": "^6.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.1.0",
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}
```

### B. Useful Commands

```bash
# Development
npm run start:dev        # Start in watch mode
npm run build           # Build for production
npm run start:prod      # Start production build

# Database
npm run migration:create -- -n MigrationName
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run E2E tests

# CLI
npm run cli -- --help
npm run scrape
npm run analyze
```

### C. Configuration Examples

**Search Query Examples:**
```json
{
  "search_queries": [
    {
      "keywords": "Software Engineer",
      "location": "United States",
      "f_WT": "2",              // Remote
      "f_E": "2",               // Entry level
      "f_JT": "F"               // Full-time
    },
    {
      "keywords": "Frontend Developer",
      "location": "San Francisco, CA",
      "f_WT": "1,2",           // On-site or Remote
      "f_TPR": "r86400"        // Last 24 hours
    }
  ]
}
```

**Filter Examples:**
```json
{
  "filters": {
    "title_include": ["Engineer", "Developer"],
    "title_exclude": ["Senior", "Lead", "Manager"],
    "company_exclude": ["Google", "Meta"],
    "country_exclude": ["India", "China"],
    "desc_words": ["clearance", "security", "classified"],
    "languages": ["en", "es"]
  }
}
```

---

## Conclusion

This migration plan provides a comprehensive roadmap for converting the Python/Flask LinkedIn scraper into a modern NestJS microservice. The 8-week phased approach ensures systematic migration with continuous testing and validation.

### Key Benefits of Migration:
1. **Type Safety**: Full TypeScript support prevents runtime errors
2. **Modularity**: Better code organization and maintainability
3. **Scalability**: Easy horizontal scaling with microservices
4. **Background Jobs**: Robust queue system with BullMQ
5. **Testing**: Better testing infrastructure with Jest
6. **Documentation**: Auto-generated API docs with Swagger
7. **Developer Experience**: Hot reload, debugging, IDE support
8. **Production Ready**: Docker, monitoring, health checks

### Next Steps:
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews after each phase
5. Adjust timeline as needed based on complexity

---

**Document Version**: 1.1
**Last Updated**: 2025-10-22
**Author**: Migration Planning Team

**Changelog**:
- v1.1 (2025-10-22): Updated to reflect current Flask implementation with `/api` prefix, mutual exclusivity for status toggles, notes endpoints, stats endpoint, config endpoint, and single-page scraping feature
- v1.0 (2025-10-15): Initial migration plan
