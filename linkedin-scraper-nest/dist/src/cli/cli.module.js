"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const config_module_1 = require("../config/config.module");
const queue_module_1 = require("../queue/queue.module");
const scraper_module_1 = require("../scraper/scraper.module");
const jobs_module_1 = require("../jobs/jobs.module");
const ai_module_1 = require("../ai/ai.module");
const scrape_command_1 = require("./commands/scrape.command");
const analyze_command_1 = require("./commands/analyze.command");
const refilter_command_1 = require("./commands/refilter.command");
const retry_failed_command_1 = require("./commands/retry-failed.command");
const scrape_single_command_1 = require("./commands/scrape-single.command");
const export_command_1 = require("./commands/export.command");
const backup_command_1 = require("./commands/backup.command");
let CliModule = class CliModule {
};
exports.CliModule = CliModule;
exports.CliModule = CliModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            config_module_1.ConfigModule,
            queue_module_1.QueueModule,
            scraper_module_1.ScraperModule,
            jobs_module_1.JobsModule,
            ai_module_1.AiModule,
        ],
        providers: [
            scrape_command_1.ScrapeCommand,
            analyze_command_1.AnalyzeCommand,
            refilter_command_1.RefilterCommand,
            retry_failed_command_1.RetryFailedCommand,
            scrape_single_command_1.ScrapeSingleCommand,
            export_command_1.ExportCommand,
            backup_command_1.BackupCommand,
        ],
    })
], CliModule);
//# sourceMappingURL=cli.module.js.map