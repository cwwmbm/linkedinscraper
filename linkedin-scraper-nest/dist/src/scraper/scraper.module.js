"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const typeorm_1 = require("@nestjs/typeorm");
const config_module_1 = require("../config/config.module");
const ai_module_1 = require("../ai/ai.module");
const queue_module_1 = require("../queue/queue.module");
const job_entity_1 = require("../jobs/entities/job.entity");
const filtered_job_entity_1 = require("../jobs/entities/filtered-job.entity");
const scraper_service_1 = require("./scraper.service");
const scraper_controller_1 = require("./scraper.controller");
const job_filter_service_1 = require("./services/job-filter.service");
const url_builder_service_1 = require("./services/url-builder.service");
const linkedin_scraper_service_1 = require("./services/linkedin-scraper.service");
const page_parser_service_1 = require("./services/page-parser.service");
let ScraperModule = class ScraperModule {
};
exports.ScraperModule = ScraperModule;
exports.ScraperModule = ScraperModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            config_module_1.ConfigModule,
            ai_module_1.AiModule,
            typeorm_1.TypeOrmModule.forFeature([job_entity_1.Job, filtered_job_entity_1.FilteredJob]),
            (0, common_1.forwardRef)(() => queue_module_1.QueueModule),
        ],
        providers: [
            scraper_service_1.ScraperService,
            job_filter_service_1.JobFilterService,
            url_builder_service_1.UrlBuilderService,
            linkedin_scraper_service_1.LinkedInScraperService,
            page_parser_service_1.PageParserService,
        ],
        controllers: [scraper_controller_1.ScraperController],
        exports: [
            scraper_service_1.ScraperService,
            job_filter_service_1.JobFilterService,
            url_builder_service_1.UrlBuilderService,
            linkedin_scraper_service_1.LinkedInScraperService,
            page_parser_service_1.PageParserService,
        ],
    })
], ScraperModule);
//# sourceMappingURL=scraper.module.js.map