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
exports.ScraperController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const scraper_service_1 = require("./scraper.service");
const scrape_single_dto_1 = require("./dto/scrape-single.dto");
const queue_service_1 = require("../queue/queue.service");
let ScraperController = class ScraperController {
    scraperService;
    queueService;
    constructor(scraperService, queueService) {
        this.scraperService = scraperService;
        this.queueService = queueService;
    }
    async triggerScrape() {
        const job = await this.queueService.addScrapeAllJob();
        return {
            jobId: job.id,
            message: 'Full scraping job queued successfully',
        };
    }
    async scrapeSingle(dto) {
        const job = await this.queueService.addScrapeSingleJob(dto.url);
        return {
            jobId: job.id,
            message: 'Single page scraping job queued successfully',
            url: dto.url,
        };
    }
    async refilter() {
        const job = await this.queueService.addRefilterJob();
        return {
            jobId: job.id,
            message: 'Refilter job queued successfully',
        };
    }
    async retryFailed() {
        const job = await this.queueService.addRetryFailedJob();
        return {
            jobId: job.id,
            message: 'Retry-failed job queued successfully',
        };
    }
    async getJobStatus(jobId) {
        return this.queueService.getJobStatus(jobId);
    }
};
exports.ScraperController = ScraperController;
__decorate([
    (0, common_1.Post)('jobs'),
    (0, swagger_1.ApiOperation)({
        summary: 'Trigger full LinkedIn job scraping',
        description: 'Queues a background job to scrape jobs from all configured LinkedIn search queries. Returns a job ID for tracking progress.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Scraping job queued successfully',
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string', description: 'Queue job ID for tracking' },
                message: { type: 'string', description: 'Status message' },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "triggerScrape", null);
__decorate([
    (0, common_1.Post)('jobs/single'),
    (0, swagger_1.ApiOperation)({
        summary: 'Scrape a single job page using AI',
        description: 'Queues a background job to fetch a job page and use AI to extract job information. The job is automatically analyzed after scraping.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Single scraping job queued successfully',
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string', description: 'Queue job ID for tracking' },
                message: { type: 'string', description: 'Status message' },
                url: { type: 'string', description: 'URL being scraped' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid URL',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scrape_single_dto_1.ScrapeSingleDto]),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "scrapeSingle", null);
__decorate([
    (0, common_1.Post)('refilter'),
    (0, swagger_1.ApiOperation)({
        summary: 'Reapply filters to all visible jobs',
        description: 'Queues a background job to check all visible jobs against current filter criteria. Jobs that no longer pass will be hidden.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Refilter job queued successfully',
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string', description: 'Queue job ID for tracking' },
                message: { type: 'string', description: 'Status message' },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "refilter", null);
__decorate([
    (0, common_1.Post)('retry-failed'),
    (0, swagger_1.ApiOperation)({
        summary: 'Retry fetching failed job descriptions',
        description: 'Queues a background job to re-fetch job descriptions for jobs that previously failed. Successfully fetched jobs are automatically analyzed.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Retry-failed job queued successfully',
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string', description: 'Queue job ID for tracking' },
                message: { type: 'string', description: 'Status message' },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "retryFailed", null);
__decorate([
    (0, common_1.Get)('jobs/:jobId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get status of a scraping job',
        description: 'Returns the current status, progress, and result of a background scraping job.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Job status retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Job ID' },
                name: { type: 'string', description: 'Job name' },
                data: { type: 'object', description: 'Job input data' },
                progress: { description: 'Job progress (number or object)' },
                state: { type: 'string', description: 'Job state (active, completed, failed, etc.)' },
                returnvalue: { description: 'Job result data (if completed)' },
                failedReason: { type: 'string', description: 'Failure reason (if failed)' },
                attempts: { type: 'number', description: 'Number of attempts made' },
                timestamp: { type: 'number', description: 'Job creation timestamp' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Job not found',
    }),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScraperController.prototype, "getJobStatus", null);
exports.ScraperController = ScraperController = __decorate([
    (0, swagger_1.ApiTags)('scraper'),
    (0, common_1.Controller)('scraper'),
    __metadata("design:paramtypes", [scraper_service_1.ScraperService,
        queue_service_1.QueueService])
], ScraperController);
//# sourceMappingURL=scraper.controller.js.map