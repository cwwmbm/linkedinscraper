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
var ScraperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../jobs/entities/job.entity");
const filtered_job_entity_1 = require("../jobs/entities/filtered-job.entity");
const page_parser_service_1 = require("./services/page-parser.service");
const job_analyzer_service_1 = require("../ai/services/job-analyzer.service");
const job_filter_service_1 = require("./services/job-filter.service");
const linkedin_scraper_service_1 = require("./services/linkedin-scraper.service");
let ScraperService = ScraperService_1 = class ScraperService {
    jobsRepository;
    filteredJobsRepository;
    pageParserService;
    jobAnalyzerService;
    jobFilterService;
    linkedInScraperService;
    logger = new common_1.Logger(ScraperService_1.name);
    constructor(jobsRepository, filteredJobsRepository, pageParserService, jobAnalyzerService, jobFilterService, linkedInScraperService) {
        this.jobsRepository = jobsRepository;
        this.filteredJobsRepository = filteredJobsRepository;
        this.pageParserService = pageParserService;
        this.jobAnalyzerService = jobAnalyzerService;
        this.jobFilterService = jobFilterService;
        this.linkedInScraperService = linkedInScraperService;
    }
    async scrapeSinglePage(url) {
        this.logger.log(`Scraping single page: ${url}`);
        const existingJob = await this.jobsRepository.findOne({
            where: { job_url: url },
        });
        if (existingJob) {
            this.logger.warn(`Job already exists in database: ${url}`);
            throw new common_1.ConflictException('Job already exists in the database');
        }
        const existingFilteredJob = await this.filteredJobsRepository.findOne({
            where: { job_url: url },
        });
        if (existingFilteredJob) {
            this.logger.warn(`Job already exists in filtered_jobs: ${url}`);
            throw new common_1.ConflictException('Job already exists in the filtered jobs table');
        }
        const jobData = await this.pageParserService.parseJobPage(url);
        const job = this.jobsRepository.create(jobData);
        const savedJob = await this.jobsRepository.save(job);
        this.logger.log(`Successfully saved job ${savedJob.id}: ${savedJob.title} at ${savedJob.company}`);
        this.analyzeJobAsync(savedJob.id);
        return savedJob;
    }
    async analyzeJobAsync(jobId) {
        try {
            this.logger.log(`Starting background analysis for job ${jobId}`);
            await this.jobAnalyzerService.analyzeJob(jobId);
            this.logger.log(`Successfully analyzed job ${jobId}`);
        }
        catch (error) {
            this.logger.error(`Failed to analyze job ${jobId}: ${error.message}`);
        }
    }
    async refilterJobs() {
        this.logger.log('Starting refilter operation...');
        const visibleJobs = await this.jobsRepository.find({
            where: { hidden: 0 },
        });
        this.logger.log(`Found ${visibleJobs.length} visible jobs to check`);
        let hiddenCount = 0;
        for (const job of visibleJobs) {
            const filterResult = this.jobFilterService.filterJob({
                title: job.title,
                company: job.company,
                location: job.location,
                job_description: job.job_description,
            });
            if (!filterResult.passed) {
                job.hidden = 1;
                await this.jobsRepository.save(job);
                hiddenCount++;
                this.logger.debug(`Hidden job ${job.id} (${job.title} at ${job.company}): ${filterResult.reason}`);
            }
        }
        this.logger.log(`Refilter complete: ${hiddenCount} jobs hidden out of ${visibleJobs.length} checked`);
        return {
            hidden: hiddenCount,
            checked: visibleJobs.length,
        };
    }
    async retryFailedJobs() {
        this.logger.log('Starting retry-failed operation...');
        const failedJobs = await this.jobsRepository.find({
            where: { job_description: 'Could not find Job Description' },
        });
        this.logger.log(`Found ${failedJobs.length} jobs with failed descriptions`);
        let successCount = 0;
        let failedCount = 0;
        for (const job of failedJobs) {
            try {
                this.logger.log(`Retrying job ${job.id}: ${job.title}`);
                const description = await this.linkedInScraperService.fetchJobDescription(job.job_url);
                job.job_description = description;
                await this.jobsRepository.save(job);
                if (description === 'Could not find Job Description') {
                    failedCount++;
                    this.logger.warn(`Job ${job.id} still failed after retry`);
                }
                else {
                    successCount++;
                    this.logger.log(`Successfully fetched description for job ${job.id}`);
                    this.analyzeJobAsync(job.id);
                }
            }
            catch (error) {
                failedCount++;
                this.logger.error(`Error retrying job ${job.id}: ${error.message}`);
            }
        }
        this.logger.log(`Retry-failed complete: ${successCount} success, ${failedCount} failed`);
        return {
            success: successCount,
            failed: failedCount,
        };
    }
    async triggerFullScrape() {
        this.logger.log('Starting full scraping operation...');
        const result = await this.linkedInScraperService.scrapeJobs();
        this.logger.log(`Full scrape complete: ${result.jobsAdded} jobs added, ${result.jobsFiltered} jobs filtered`);
        return result;
    }
};
exports.ScraperService = ScraperService;
exports.ScraperService = ScraperService = ScraperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(filtered_job_entity_1.FilteredJob)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        page_parser_service_1.PageParserService,
        job_analyzer_service_1.JobAnalyzerService,
        job_filter_service_1.JobFilterService,
        linkedin_scraper_service_1.LinkedInScraperService])
], ScraperService);
//# sourceMappingURL=scraper.service.js.map