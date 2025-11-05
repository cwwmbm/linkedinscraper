"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jobs_service_1 = require("./jobs.service");
const job_query_dto_1 = require("./dto/job-query.dto");
const create_job_dto_1 = require("./dto/create-job.dto");
const update_job_dto_1 = require("./dto/update-job.dto");
const job_analyzer_service_1 = require("../ai/services/job-analyzer.service");
const cover_letter_service_1 = require("../ai/services/cover-letter.service");
const resume_tailor_service_1 = require("../ai/services/resume-tailor.service");
const queue_service_1 = require("../queue/queue.service");
const job_analysis_dto_1 = require("../ai/dto/job-analysis.dto");
const cover_letter_dto_1 = require("../ai/dto/cover-letter.dto");
const resume_dto_1 = require("../ai/dto/resume.dto");
let JobsController = class JobsController {
    jobsService;
    jobAnalyzerService;
    coverLetterService;
    resumeTailorService;
    queueService;
    constructor(jobsService, jobAnalyzerService, coverLetterService, resumeTailorService, queueService) {
        this.jobsService = jobsService;
        this.jobAnalyzerService = jobAnalyzerService;
        this.coverLetterService = coverLetterService;
        this.resumeTailorService = resumeTailorService;
        this.queueService = queueService;
    }
    async findAll(query) {
        return this.jobsService.findAll(query);
    }
    async getStats() {
        return this.jobsService.getStats();
    }
    async analyzeJob(id, analyzeJobDto) {
        const job = await this.queueService.addAnalyzeSingleJob(id, analyzeJobDto?.model);
        return {
            jobId: job.id,
            message: 'Job analysis queued successfully',
            targetJobId: id,
        };
    }
    async generateCoverLetter(id, generateCoverLetterDto) {
        const coverLetter = await this.coverLetterService.generateCoverLetter(id, generateCoverLetterDto?.model);
        return { cover_letter: coverLetter };
    }
    async getCoverLetter(id) {
        const coverLetter = await this.coverLetterService.getCoverLetter(id);
        return { cover_letter: coverLetter };
    }
    async generateTailoredResume(id, tailorResumeDto) {
        const resume = await this.resumeTailorService.generateTailoredResume(id, tailorResumeDto?.model);
        return { resume };
    }
    async getTailoredResume(id) {
        const resume = await this.resumeTailorService.getTailoredResume(id);
        return { resume };
    }
    async findOne(id) {
        return this.jobsService.findOne(id);
    }
    async create(createJobDto) {
        return this.jobsService.create(createJobDto);
    }
    async update(id, updateJobDto) {
        return this.jobsService.update(id, updateJobDto);
    }
    async patch(id, patchJobDto) {
        return this.jobsService.patch(id, patchJobDto);
    }
    async remove(id) {
        await this.jobsService.remove(id);
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List all jobs with filtering and pagination',
        description: 'Get a paginated list of jobs with optional filtering by status fields. By default, hidden jobs are excluded.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'hidden', required: false, type: Boolean, description: 'Include hidden jobs (default: false)' }),
    (0, swagger_1.ApiQuery)({ name: 'applied', required: false, type: Boolean, description: 'Filter by applied status' }),
    (0, swagger_1.ApiQuery)({ name: 'interview', required: false, type: Boolean, description: 'Filter by interview status' }),
    (0, swagger_1.ApiQuery)({ name: 'rejected', required: false, type: Boolean, description: 'Filter by rejected status' }),
    (0, swagger_1.ApiQuery)({ name: 'blocked', required: false, type: Boolean, description: 'Filter by blocked status' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 100, max: 1000)' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number, description: 'Pagination offset (default: 0)' }),
    (0, swagger_1.ApiQuery)({ name: 'sort', required: false, enum: ['id', 'date', 'company', 'title', 'date_loaded'], description: 'Sort field (default: id)' }),
    (0, swagger_1.ApiQuery)({ name: 'order', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns paginated jobs with total count' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [job_query_dto_1.JobQueryDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get job statistics',
        description: 'Returns counts for all job status categories'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns statistics',
        schema: {
            example: {
                total: 399,
                not_hidden: 127,
                applied: 95,
                interview: 1,
                rejected: 14,
                blocked: 9
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)(':id/analysis'),
    (0, swagger_1.ApiOperation)({
        summary: 'Analyze a job description',
        description: `Queue a background job to analyze a job description using predefined questions from configuration.

The analysis results are stored in the job's metadata field once completed.
Each question from the configuration is sent to the AI model with the job description.

Returns a job ID for tracking progress via GET /scraper/jobs/:jobId.

**Note**: Analysis may take several seconds depending on the number of analysis questions configured.`
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID to analyze', type: Number }),
    (0, swagger_1.ApiBody)({ type: job_analysis_dto_1.AnalyzeJobDto, required: false }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Analysis job queued successfully',
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string', description: 'Queue job ID for tracking' },
                message: { type: 'string', description: 'Status message' },
                targetJobId: { type: 'number', description: 'Job ID being analyzed' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Job has no description or no analysis questions configured' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, job_analysis_dto_1.AnalyzeJobDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "analyzeJob", null);
__decorate([
    (0, common_1.Post)(':id/cover-letter'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate a cover letter for a job',
        description: `Generate a tailored cover letter using a 2-pass AI approach:

**Pass 1**: Experienced career coach (15 years) creates initial draft focusing on:
- Identifying main challenges of the role
- Writing attention-grabbing hook (100 words)
- Complete cover letter (250 words total)

**Pass 2**: Young career coach improves the draft:
- Adjusts formality from 10 to 7
- Identifies 3-5 improvements
- Avoids subjective qualifiers
- Final version within 250 words

The generated cover letter is stored in the job's cover_letter field.

**Note**: This operation may take 30-60 seconds due to the 2-pass generation process.`
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiBody)({ type: cover_letter_dto_1.GenerateCoverLetterDto, required: false }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Cover letter generated successfully',
        schema: {
            example: {
                cover_letter: 'Dear Hiring Manager,\n\nAs a seasoned backend developer...'
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Job has no description or resume not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, cover_letter_dto_1.GenerateCoverLetterDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "generateCoverLetter", null);
__decorate([
    (0, common_1.Get)(':id/cover-letter'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get existing cover letter for a job',
        description: 'Retrieve the previously generated cover letter for a job.'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns the cover letter',
        schema: {
            example: {
                cover_letter: 'Dear Hiring Manager,\n\nAs a seasoned backend developer...'
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job or cover letter not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getCoverLetter", null);
__decorate([
    (0, common_1.Post)(':id/resume'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate a tailored resume for a job',
        description: `Tailor your resume for a specific job using AI career coach approach:

**Process**:
1. Identify 3-5 most important responsibilities from job description
2. Tailor resume to highlight relevant experience for those responsibilities
3. Preserve factual accuracy (no made-up information)
4. Return final tailored resume only

The tailored resume is stored in the job's resume field.

**Note**: This operation may take 20-40 seconds.`
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiBody)({ type: resume_dto_1.TailorResumeDto, required: false }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resume tailored successfully',
        schema: {
            example: {
                resume: 'PROFESSIONAL SUMMARY\n\nExperienced Backend Developer...'
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Job has no description or resume not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, resume_dto_1.TailorResumeDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "generateTailoredResume", null);
__decorate([
    (0, common_1.Get)(':id/resume'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get existing tailored resume for a job',
        description: 'Retrieve the previously generated tailored resume for a job.'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns the tailored resume',
        schema: {
            example: {
                resume: 'PROFESSIONAL SUMMARY\n\nExperienced Backend Developer...'
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job or tailored resume not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getTailoredResume", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single job by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the job' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new job',
        description: 'Create a new job entry. The date_loaded field is automatically set to the current timestamp.'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Job created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_job_dto_1.CreateJobDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a job (full replacement)',
        description: 'Replace all job fields. Mutual exclusivity applies to status fields (applied, interview, rejected, blocked).'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_job_dto_1.UpdateJobDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Partially update a job',
        description: `Update specific job fields. Supports updating any field including hidden, applied, interview, rejected, blocked, and notes.

**Mutual Exclusivity:** Status fields (applied, interview, rejected, blocked) are mutually exclusive.
When you set one to true/1, all others are automatically set to false/0.

**Examples:**
- Mark as applied: \`{ "applied": true }\` → clears interview, rejected, blocked
- Mark for interview: \`{ "interview": true }\` → clears applied, rejected, blocked
- Hide job: \`{ "hidden": true }\`
- Update notes: \`{ "notes": "Applied via LinkedIn" }\`
- Multiple updates: \`{ "applied": true, "notes": "Applied today" }\``
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "patch", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a job' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Job deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "remove", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    (0, swagger_1.ApiTags)('jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService,
        job_analyzer_service_1.JobAnalyzerService,
        cover_letter_service_1.CoverLetterService,
        resume_tailor_service_1.ResumeTailorService,
        queue_service_1.QueueService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map