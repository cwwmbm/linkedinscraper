"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const queue_service_1 = require("./queue.service");
const scraper_processor_1 = require("./processors/scraper.processor");
const analysis_processor_1 = require("./processors/analysis.processor");
const export_processor_1 = require("./processors/export.processor");
const scraper_module_1 = require("../scraper/scraper.module");
const ai_module_1 = require("../ai/ai.module");
const files_module_1 = require("../files/files.module");
const job_entity_1 = require("../jobs/entities/job.entity");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    redis: {
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379),
                    },
                    defaultJobOptions: {
                        removeOnComplete: 100,
                        removeOnFail: 200,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            bull_1.BullModule.registerQueue({ name: 'scraper' }, { name: 'analysis' }, { name: 'export' }),
            typeorm_1.TypeOrmModule.forFeature([job_entity_1.Job]),
            (0, common_1.forwardRef)(() => scraper_module_1.ScraperModule),
            (0, common_1.forwardRef)(() => ai_module_1.AiModule),
            files_module_1.FilesModule,
        ],
        providers: [queue_service_1.QueueService, scraper_processor_1.ScraperProcessor, analysis_processor_1.AnalysisProcessor, export_processor_1.ExportProcessor],
        exports: [queue_service_1.QueueService, bull_1.BullModule],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map