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
exports.JobAnalyzerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../../jobs/entities/job.entity");
const openrouter_service_1 = require("./openrouter.service");
let JobAnalyzerService = class JobAnalyzerService {
    openrouterService;
    configService;
    jobsRepository;
    constructor(openrouterService, configService, jobsRepository) {
        this.openrouterService = openrouterService;
        this.configService = configService;
        this.jobsRepository = jobsRepository;
    }
    async analyzeJob(jobId, model) {
        console.log(`Analyzing job ${jobId}`);
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${jobId} not found`);
        }
        if (!job.job_description) {
            throw new common_1.BadRequestException(`Job ${jobId} has no job description to analyze`);
        }
        const analysisQuestions = this.configService.get('ai.analysisQuestions');
        if (!analysisQuestions || analysisQuestions.length === 0) {
            throw new common_1.BadRequestException('No analysis questions defined in configuration');
        }
        const analysisResults = {};
        const jobDescription = job.job_description;
        for (const questionConfig of analysisQuestions) {
            let questionText;
            let questionTitle;
            if (typeof questionConfig === 'string') {
                questionText = questionConfig;
                questionTitle = questionConfig;
            }
            else {
                questionText = questionConfig.question || '';
                questionTitle = questionConfig.title || questionText;
            }
            if (!questionText) {
                continue;
            }
            const prompt = `Based on the following job description, please answer this question in markdown: ${questionText}

Job Description:
${jobDescription}

Please provide a concise and relevant answer based only on the information provided in the job description.`;
            try {
                const answer = await this.openrouterService.callAPI(prompt, 'job_analysis', model);
                analysisResults[questionTitle] = answer || 'Unable to analyze';
            }
            catch (error) {
                console.error(`Error analyzing question '${questionTitle}':`, error.message);
                analysisResults[questionTitle] = 'Error during analysis';
            }
        }
        const metadataJson = JSON.stringify(analysisResults, null, 2);
        job.metadata = metadataJson;
        await this.jobsRepository.save(job);
        return analysisResults;
    }
};
exports.JobAnalyzerService = JobAnalyzerService;
exports.JobAnalyzerService = JobAnalyzerService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [openrouter_service_1.OpenrouterService,
        config_1.ConfigService,
        typeorm_2.Repository])
], JobAnalyzerService);
//# sourceMappingURL=job-analyzer.service.js.map