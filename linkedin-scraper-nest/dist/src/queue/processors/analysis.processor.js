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
var AnalysisProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const job_analyzer_service_1 = require("../../ai/services/job-analyzer.service");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../../jobs/entities/job.entity");
let AnalysisProcessor = AnalysisProcessor_1 = class AnalysisProcessor {
    jobAnalyzerService;
    jobsRepository;
    logger = new common_1.Logger(AnalysisProcessor_1.name);
    constructor(jobAnalyzerService, jobsRepository) {
        this.jobAnalyzerService = jobAnalyzerService;
        this.jobsRepository = jobsRepository;
    }
    async handleAnalyzeSingle(job) {
        this.logger.log(`[Job ${job.id}] Starting analysis for job ID ${job.data.jobId}`);
        try {
            await job.progress(20);
            const analysis = await this.jobAnalyzerService.analyzeJob(job.data.jobId, job.data.model);
            await job.progress(100);
            this.logger.log(`[Job ${job.id}] Analysis completed for job ID ${job.data.jobId}`);
            return analysis;
        }
        catch (error) {
            this.logger.error(`[Job ${job.id}] Analysis failed for job ID ${job.data.jobId}: ${error.message}`);
            throw error;
        }
    }
    async handleAnalyzeBatch(job) {
        this.logger.log(`[Job ${job.id}] Starting batch analysis with mode: ${job.data.mode}`);
        try {
            await job.progress(5);
            let jobsToAnalyze = [];
            switch (job.data.mode) {
                case 'not-analyzed':
                    jobsToAnalyze = await this.jobsRepository.find({
                        where: [
                            { metadata: (0, typeorm_2.IsNull)() },
                            { metadata: '' },
                        ],
                    });
                    break;
                case 'not-hidden':
                    jobsToAnalyze = await this.jobsRepository.find({
                        where: { hidden: 0 },
                    });
                    break;
                case 'all':
                    jobsToAnalyze = await this.jobsRepository.find();
                    break;
                default:
                    throw new Error(`Unknown analysis mode: ${job.data.mode}`);
            }
            this.logger.log(`[Job ${job.id}] Found ${jobsToAnalyze.length} jobs to analyze`);
            if (jobsToAnalyze.length === 0) {
                await job.progress(100);
                return { analyzed: 0, failed: 0, skipped: 0 };
            }
            await job.progress(10);
            let analyzed = 0;
            let failed = 0;
            let skipped = 0;
            for (let i = 0; i < jobsToAnalyze.length; i++) {
                const jobEntity = jobsToAnalyze[i];
                if (!jobEntity.job_description || jobEntity.job_description === 'Could not find Job Description') {
                    this.logger.debug(`[Job ${job.id}] Skipping job ${jobEntity.id} - no valid description`);
                    skipped++;
                    continue;
                }
                try {
                    this.logger.debug(`[Job ${job.id}] Analyzing job ${jobEntity.id} (${i + 1}/${jobsToAnalyze.length})`);
                    await this.jobAnalyzerService.analyzeJob(jobEntity.id);
                    analyzed++;
                    const progress = 10 + Math.floor((i / jobsToAnalyze.length) * 90);
                    await job.progress(progress);
                }
                catch (error) {
                    this.logger.error(`[Job ${job.id}] Failed to analyze job ${jobEntity.id}: ${error.message}`);
                    failed++;
                }
            }
            await job.progress(100);
            this.logger.log(`[Job ${job.id}] Batch analysis completed: ${analyzed} analyzed, ${failed} failed, ${skipped} skipped`);
            return { analyzed, failed, skipped };
        }
        catch (error) {
            this.logger.error(`[Job ${job.id}] Batch analysis failed: ${error.message}`);
            throw error;
        }
    }
};
exports.AnalysisProcessor = AnalysisProcessor;
__decorate([
    (0, bull_1.Process)('analyze-single'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalysisProcessor.prototype, "handleAnalyzeSingle", null);
__decorate([
    (0, bull_1.Process)('analyze-batch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalysisProcessor.prototype, "handleAnalyzeBatch", null);
exports.AnalysisProcessor = AnalysisProcessor = AnalysisProcessor_1 = __decorate([
    (0, bull_1.Processor)('analysis'),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [job_analyzer_service_1.JobAnalyzerService,
        typeorm_2.Repository])
], AnalysisProcessor);
//# sourceMappingURL=analysis.processor.js.map