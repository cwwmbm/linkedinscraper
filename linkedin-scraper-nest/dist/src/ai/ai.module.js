"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const typeorm_1 = require("@nestjs/typeorm");
const config_module_1 = require("../config/config.module");
const job_entity_1 = require("../jobs/entities/job.entity");
const openrouter_service_1 = require("./services/openrouter.service");
const pdf_reader_service_1 = require("./services/pdf-reader.service");
const job_analyzer_service_1 = require("./services/job-analyzer.service");
const cover_letter_service_1 = require("./services/cover-letter.service");
const resume_tailor_service_1 = require("./services/resume-tailor.service");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            config_module_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([job_entity_1.Job]),
        ],
        providers: [openrouter_service_1.OpenrouterService, pdf_reader_service_1.PdfReaderService, job_analyzer_service_1.JobAnalyzerService, cover_letter_service_1.CoverLetterService, resume_tailor_service_1.ResumeTailorService],
        exports: [openrouter_service_1.OpenrouterService, pdf_reader_service_1.PdfReaderService, job_analyzer_service_1.JobAnalyzerService, cover_letter_service_1.CoverLetterService, resume_tailor_service_1.ResumeTailorService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map