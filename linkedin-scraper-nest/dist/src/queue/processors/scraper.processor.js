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
var ScraperProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const scraper_service_1 = require("../../scraper/scraper.service");
let ScraperProcessor = ScraperProcessor_1 = class ScraperProcessor {
    scraperService;
    logger = new common_1.Logger(ScraperProcessor_1.name);
    constructor(scraperService) {
        this.scraperService = scraperService;
    }
    async handleScrapeAll(job) {
        this.logger.log(`[Job ${job.id}] Starting full scrape operation`);
        try {
            await job.progress(10);
            const result = await this.scraperService.triggerFullScrape();
            await job.progress(100);
            this.logger.log(`[Job ${job.id}] Full scrape completed: ${result.jobsAdded} jobs added, ${result.jobsFiltered} jobs filtered`);
            return result;
        }
        catch (error) {
            this.logger.error(`[Job ${job.id}] Full scrape failed: ${error.message}`);
            throw error;
        }
    }
    async handleScrapeSingle(job) {
        this.logger.log(`[Job ${job.id}] Starting single page scrape: ${job.data.url}`);
        try {
            await job.progress(20);
            const scrapedJob = await this.scraperService.scrapeSinglePage(job.data.url);
            await job.progress(100);
            this.logger.log(`[Job ${job.id}] Single page scrape completed: ${scrapedJob.title} at ${scrapedJob.company}`);
            return {
                id: scrapedJob.id,
                title: scrapedJob.title,
                company: scrapedJob.company,
            };
        }
        catch (error) {
            this.logger.error(`[Job ${job.id}] Single page scrape failed: ${error.message}`);
            throw error;
        }
    }
    async handleRefilter(job) {
        this.logger.log(`[Job ${job.id}] Starting refilter operation`);
        try {
            await job.progress(10);
            const result = await this.scraperService.refilterJobs();
            await job.progress(100);
            this.logger.log(`[Job ${job.id}] Refilter completed: ${result.hidden} jobs hidden out of ${result.checked} checked`);
            return result;
        }
        catch (error) {
            this.logger.error(`[Job ${job.id}] Refilter failed: ${error.message}`);
            throw error;
        }
    }
    async handleRetryFailed(job) {
        this.logger.log(`[Job ${job.id}] Starting retry-failed operation`);
        try {
            await job.progress(10);
            const result = await this.scraperService.retryFailedJobs();
            await job.progress(100);
            this.logger.log(`[Job ${job.id}] Retry-failed completed: ${result.success} success, ${result.failed} failed`);
            return result;
        }
        catch (error) {
            this.logger.error(`[Job ${job.id}] Retry-failed failed: ${error.message}`);
            throw error;
        }
    }
};
exports.ScraperProcessor = ScraperProcessor;
__decorate([
    (0, bull_1.Process)('scrape-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScraperProcessor.prototype, "handleScrapeAll", null);
__decorate([
    (0, bull_1.Process)('scrape-single'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScraperProcessor.prototype, "handleScrapeSingle", null);
__decorate([
    (0, bull_1.Process)('refilter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScraperProcessor.prototype, "handleRefilter", null);
__decorate([
    (0, bull_1.Process)('retry-failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScraperProcessor.prototype, "handleRetryFailed", null);
exports.ScraperProcessor = ScraperProcessor = ScraperProcessor_1 = __decorate([
    (0, bull_1.Processor)('scraper'),
    __metadata("design:paramtypes", [scraper_service_1.ScraperService])
], ScraperProcessor);
//# sourceMappingURL=scraper.processor.js.map