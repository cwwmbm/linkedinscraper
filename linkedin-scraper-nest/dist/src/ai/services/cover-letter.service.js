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
exports.CoverLetterService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../../jobs/entities/job.entity");
const openrouter_service_1 = require("./openrouter.service");
const pdf_reader_service_1 = require("./pdf-reader.service");
let CoverLetterService = class CoverLetterService {
    openrouterService;
    pdfReaderService;
    jobsRepository;
    constructor(openrouterService, pdfReaderService, jobsRepository) {
        this.openrouterService = openrouterService;
        this.pdfReaderService = pdfReaderService;
        this.jobsRepository = jobsRepository;
    }
    async generateCoverLetter(jobId, model) {
        console.log('CoverLetter generation started for job:', jobId);
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
        const firstPassPrompt = `You are a career coach with over 15 years of experience helping job seekers land their dream jobs in tech. You are helping a candidate to write a cover letter for the below role. Approach this task in three steps. Step 1. Identify main challenges someone in this position would face day to day. Step 2. Write an attention grabbing hook for your cover letter that highlights your experience and qualifications in a way that shows you empathize and can successfully take on challenges of the role. Consider incorporating specific examples of how you tackled these challenges in your past work, and explore creative ways to express your enthusiasm for the opportunity. Put emphasis on how the candidate can contribute to company as opposed to just listing accomplishments. Keep your hook within 100 words or less. Step 3. Finish writing the cover letter based on the resume and keep it within 250 words. Respond with final cover letter only. \n job description: ${job.job_description}\n company: ${job.company}\n title: ${job.title}\n resume: ${resume}` +
            (consideration ? `\nConsider incorporating that ${consideration}` : '');
        let response = await this.openrouterService.callAPI(firstPassPrompt, 'cover_letter', model);
        if (!response) {
            throw new common_1.BadRequestException('Failed to get a response from OpenRouter API');
        }
        const secondPassPrompt = `You are young but experienced career coach helping job seekers land their dream jobs in tech. I need your help crafting a cover letter. Here is a job description: ${job.job_description}\nhere is my resume: ${resume}\nHere's the cover letter I got so far: ${response}\nI need you to help me improve it. Let's approach this in following steps. \nStep 1. Please set the formality scale as follows: 1 is conversational English, my initial Cover letter draft is 10. Step 2. Identify three to five ways this cover letter can be improved, and elaborate on each way with at least one thoughtful sentence. Step 4. Suggest an improved cover letter based on these suggestions with the Formality Score set to 7. Avoid subjective qualifiers such as drastic, transformational, etc. Keep the final cover letter within 250 words. Please respond with the final cover letter only.`;
        response = await this.openrouterService.callAPI(secondPassPrompt, 'cover_letter', model);
        if (!response) {
            throw new common_1.BadRequestException('Failed to get a response from OpenRouter API on second pass');
        }
        job.cover_letter = response;
        await this.jobsRepository.save(job);
        console.log('Cover letter generated and saved for job:', jobId);
        return response;
    }
    async getCoverLetter(jobId) {
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${jobId} not found`);
        }
        if (!job.cover_letter) {
            throw new common_1.NotFoundException(`Cover letter not found for job ${jobId}`);
        }
        return job.cover_letter;
    }
};
exports.CoverLetterService = CoverLetterService;
exports.CoverLetterService = CoverLetterService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [openrouter_service_1.OpenrouterService,
        pdf_reader_service_1.PdfReaderService,
        typeorm_2.Repository])
], CoverLetterService);
//# sourceMappingURL=cover-letter.service.js.map