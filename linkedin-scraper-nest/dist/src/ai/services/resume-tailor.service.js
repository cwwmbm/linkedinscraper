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
exports.ResumeTailorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../../jobs/entities/job.entity");
const openrouter_service_1 = require("./openrouter.service");
const pdf_reader_service_1 = require("./pdf-reader.service");
let ResumeTailorService = class ResumeTailorService {
    openrouterService;
    pdfReaderService;
    jobsRepository;
    constructor(openrouterService, pdfReaderService, jobsRepository) {
        this.openrouterService = openrouterService;
        this.pdfReaderService = pdfReaderService;
        this.jobsRepository = jobsRepository;
    }
    async generateTailoredResume(jobId, model) {
        console.log('Resume tailoring started for job:', jobId);
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${jobId} not found`);
        }
        if (!job.job_description) {
            throw new common_1.BadRequestException(`Job ${jobId} has no job description`);
        }
        const resume = await this.pdfReaderService.readResume();
        if (!resume) {
            throw new common_1.BadRequestException('Resume not found or could not be read');
        }
        const consideration = '';
        const prompt = `You are a career coach with a client that is applying for a job as a ${job.title} at ${job.company}. They have a resume that you need to review and suggest how to tailor it for the job. Approach this task in the following steps: \n 1. Highlight three to five most important responsibilities for this role based on the job description. \n2. Based on these most important responsibilities from the job description, please tailor the resume for this role. Do not make information up. Respond with the final resume only. \n\n Here is the job description: ${job.job_description}\n\n Here is the resume: ${resume}` +
            (consideration ? `\nConsider incorporating that ${consideration}` : '');
        const response = await this.openrouterService.callAPI(prompt, 'resume', model);
        if (!response) {
            throw new common_1.BadRequestException('Failed to get response from OpenRouter API');
        }
        job.resume = response;
        await this.jobsRepository.save(job);
        console.log('Tailored resume generated and saved for job:', jobId);
        return response;
    }
    async getTailoredResume(jobId) {
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${jobId} not found`);
        }
        if (!job.resume) {
            throw new common_1.NotFoundException(`Tailored resume not found for job ${jobId}`);
        }
        return job.resume;
    }
};
exports.ResumeTailorService = ResumeTailorService;
exports.ResumeTailorService = ResumeTailorService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [openrouter_service_1.OpenrouterService,
        pdf_reader_service_1.PdfReaderService,
        typeorm_2.Repository])
], ResumeTailorService);
//# sourceMappingURL=resume-tailor.service.js.map