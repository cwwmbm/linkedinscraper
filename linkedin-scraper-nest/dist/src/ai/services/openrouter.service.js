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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenrouterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let OpenrouterService = class OpenrouterService {
    httpService;
    configService;
    OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
    }
    async callAPI(prompt, operationType = 'job_analysis', model) {
        const operationConfigs = {
            job_analysis: {
                apiKeyPath: 'ai.jobAnalysisApiKey',
                modelPath: 'ai.jobAnalysisModel',
            },
            cover_letter: {
                apiKeyPath: 'ai.coverLetterApiKey',
                modelPath: 'ai.coverLetterModel',
            },
            resume: {
                apiKeyPath: 'ai.resumeApiKey',
                modelPath: 'ai.resumeModel',
            },
            page_scraper: {
                apiKeyPath: 'ai.pageScraperApiKey',
                modelPath: 'ai.pageScraperModel',
            },
        };
        if (!operationConfigs[operationType]) {
            throw new common_1.BadRequestException(`Invalid operation_type: ${operationType}. Must be one of: ${Object.keys(operationConfigs).join(', ')}`);
        }
        const opConfig = operationConfigs[operationType];
        const apiKey = this.configService.get(opConfig.apiKeyPath);
        const defaultModel = this.configService.get(opConfig.modelPath);
        if (!apiKey) {
            throw new common_1.BadRequestException(`API key for ${operationType} is empty or missing: ${opConfig.apiKeyPath}`);
        }
        const selectedModel = model || defaultModel;
        if (!selectedModel) {
            throw new common_1.BadRequestException(`Model for ${operationType} is empty or missing: ${opConfig.modelPath}`);
        }
        const headers = {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        };
        const data = {
            model: selectedModel,
            messages: [{ role: 'user', content: prompt }],
        };
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(this.OPENROUTER_API_URL, data, { headers }));
            return response.data.choices[0].message.content;
        }
        catch (error) {
            console.error(`Error calling OpenRouter API for ${operationType}:`, error.message);
            throw new common_1.BadRequestException(`Failed to call OpenRouter API for ${operationType}: ${error.message}`);
        }
    }
};
exports.OpenrouterService = OpenrouterService;
exports.OpenrouterService = OpenrouterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], OpenrouterService);
//# sourceMappingURL=openrouter.service.js.map