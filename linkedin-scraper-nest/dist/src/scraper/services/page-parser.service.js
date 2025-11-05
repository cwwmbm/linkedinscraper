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
var PageParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageParserService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const openrouter_service_1 = require("../../ai/services/openrouter.service");
let PageParserService = PageParserService_1 = class PageParserService {
    httpService;
    openrouterService;
    logger = new common_1.Logger(PageParserService_1.name);
    constructor(httpService, openrouterService) {
        this.httpService = httpService;
        this.openrouterService = openrouterService;
    }
    async parseJobPage(url) {
        this.logger.log(`Parsing job page with AI: ${url}`);
        try {
            const html = await this.fetchPageHtml(url);
            const jobData = await this.extractJobDataWithAI(html, url);
            this.logger.log(`Successfully parsed job page: ${jobData.title} at ${jobData.company}`);
            return jobData;
        }
        catch (error) {
            this.logger.error(`Error parsing job page ${url}: ${error.message}`);
            throw error;
        }
    }
    async fetchPageHtml(url) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 10000,
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to fetch page HTML: ${error.message}`);
            throw new Error(`Could not fetch page: ${error.message}`);
        }
    }
    async extractJobDataWithAI(html, url) {
        const prompt = this.buildExtractionPrompt(html, url);
        try {
            const aiResponse = await this.openrouterService.callAPI(prompt, 'page_scraper');
            const jobData = this.parseAIResponse(aiResponse, url);
            return jobData;
        }
        catch (error) {
            this.logger.error(`AI extraction failed: ${error.message}`);
            throw new Error(`Could not extract job data with AI: ${error.message}`);
        }
    }
    buildExtractionPrompt(html, url) {
        const truncatedHtml = html.length > 50000 ? html.substring(0, 50000) + '...' : html;
        return `Please analyze this job page and extract the job information in JSON format.

The JSON should contain the following fields:
- title: Job title (string)
- company: Company name (string)
- location: Job location (string)
- date: Job posting date in YYYY-MM-DD format (string, use today's date if not found)
- job_url: The URL "${url}" (string)
- job_description: Full job description text (string, extract all relevant content)

HTML content:
${truncatedHtml}

IMPORTANT: Return ONLY the raw JSON object with no markdown formatting, no code blocks, no backticks. Start with { and end with }.`;
    }
    parseAIResponse(aiResponse, url) {
        let jobData;
        try {
            jobData = JSON.parse(aiResponse);
        }
        catch (e) {
            try {
                const cleaned = aiResponse
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();
                jobData = JSON.parse(cleaned);
            }
            catch (e2) {
                this.logger.error(`Failed to parse AI response: ${aiResponse.substring(0, 200)}`);
                throw new Error('AI response is not valid JSON');
            }
        }
        return {
            title: jobData.title || 'Unknown Title',
            company: jobData.company || 'Unknown Company',
            location: jobData.location || 'Unknown Location',
            date: this.validateDate(jobData.date),
            job_url: url,
            job_description: jobData.job_description || 'No description available',
            applied: 0,
            hidden: 0,
            interview: 0,
            rejected: 0,
            blocked: 0,
            date_loaded: new Date().toISOString(),
        };
    }
    validateDate(dateStr) {
        if (!dateStr) {
            return new Date().toISOString().split('T')[0];
        }
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return new Date().toISOString().split('T')[0];
            }
            return date.toISOString().split('T')[0];
        }
        catch (e) {
            return new Date().toISOString().split('T')[0];
        }
    }
};
exports.PageParserService = PageParserService;
exports.PageParserService = PageParserService = PageParserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        openrouter_service_1.OpenrouterService])
], PageParserService);
//# sourceMappingURL=page-parser.service.js.map