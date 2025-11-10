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
var ManualJobCreatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualJobCreatorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../entities/job.entity");
const openrouter_service_1 = require("../../ai/services/openrouter.service");
const job_analyzer_service_1 = require("../../ai/services/job-analyzer.service");
let ManualJobCreatorService = ManualJobCreatorService_1 = class ManualJobCreatorService {
    jobsRepository;
    openrouterService;
    jobAnalyzerService;
    logger = new common_1.Logger(ManualJobCreatorService_1.name);
    constructor(jobsRepository, openrouterService, jobAnalyzerService) {
        this.jobsRepository = jobsRepository;
        this.openrouterService = openrouterService;
        this.jobAnalyzerService = jobAnalyzerService;
    }
    async createManualJob(dto) {
        this.logger.log('Creating manual job entry');
        try {
            const userProvidedInfo = [];
            if (dto.title)
                userProvidedInfo.push(`Title: ${dto.title}`);
            if (dto.company)
                userProvidedInfo.push(`Company: ${dto.company}`);
            if (dto.location)
                userProvidedInfo.push(`Location: ${dto.location}`);
            const userInfoText = userProvidedInfo.length > 0
                ? userProvidedInfo.join('\n')
                : 'No fields provided by user';
            const prompt = `Please analyze this job posting text and extract the job information in JSON format.

The JSON should contain:
- title: Job title (string)
- company: Company name (string)
- location: Job location (string)
- date: Job posting date in YYYY-MM-DD format (string, use today's date if not found)
- job_description: Cleaned and structured job description (string)

User provided information:
${userInfoText}

Job description text:
${dto.job_description}

IMPORTANT: Return ONLY the raw JSON object with no markdown formatting, no code blocks, no backticks, no additional text or explanation. Start your response directly with { and end with }.
If the user provided a field above, use that value. Only extract fields that are missing.`;
            this.logger.log('Calling AI to extract job fields');
            const aiResponse = await this.openrouterService.callAPI(prompt, 'page_scraper');
            const extractedData = this.parseAIResponse(aiResponse);
            const finalTitle = dto.title || extractedData.title || 'Unknown Title';
            const finalCompany = dto.company || extractedData.company || 'Unknown Company';
            const finalLocation = dto.location || extractedData.location || 'Unknown Location';
            const finalDate = extractedData.date || new Date().toISOString().split('T')[0];
            const finalDescription = extractedData.job_description || dto.job_description;
            const job = this.jobsRepository.create({
                title: finalTitle,
                company: finalCompany,
                location: finalLocation,
                date: finalDate,
                job_url: dto.job_url || '',
                job_description: finalDescription,
                applied: 0,
                hidden: 0,
                interview: 0,
                rejected: 0,
                blocked: 0,
                date_loaded: new Date().toISOString(),
            });
            const savedJob = await this.jobsRepository.save(job);
            this.logger.log(`Job created with ID: ${savedJob.id}`);
            try {
                this.logger.log(`Auto-analyzing job ${savedJob.id}`);
                await this.jobAnalyzerService.analyzeJob(savedJob.id);
                const updatedJob = await this.jobsRepository.findOne({ where: { id: savedJob.id } });
                return updatedJob || savedJob;
            }
            catch (analysisError) {
                this.logger.warn(`Failed to analyze job ${savedJob.id}: ${analysisError.message}`);
                return savedJob;
            }
        }
        catch (error) {
            this.logger.error(`Error creating manual job: ${error.message}`);
            throw new common_1.BadRequestException(`Failed to create job: ${error.message}`);
        }
    }
    parseAIResponse(aiResponse) {
        try {
            return JSON.parse(aiResponse);
        }
        catch (e) {
            try {
                const cleaned = aiResponse
                    .trim()
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();
                return JSON.parse(cleaned);
            }
            catch (e2) {
                this.logger.error(`Failed to parse AI response: ${aiResponse.substring(0, 200)}`);
                throw new common_1.BadRequestException('AI returned invalid JSON format');
            }
        }
    }
};
exports.ManualJobCreatorService = ManualJobCreatorService;
exports.ManualJobCreatorService = ManualJobCreatorService = ManualJobCreatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        openrouter_service_1.OpenrouterService,
        job_analyzer_service_1.JobAnalyzerService])
], ManualJobCreatorService);
//# sourceMappingURL=manual-job-creator.service.js.map