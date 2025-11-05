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
var ExportProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const export_service_1 = require("../../files/services/export.service");
const backup_service_1 = require("../../files/services/backup.service");
let ExportProcessor = ExportProcessor_1 = class ExportProcessor {
    exportService;
    backupService;
    logger = new common_1.Logger(ExportProcessor_1.name);
    constructor(exportService, backupService) {
        this.exportService = exportService;
        this.backupService = backupService;
    }
    async handleExportJobs(job) {
        this.logger.log(`[Job ${job.id}] Starting export operation: ${job.data.format} (filter: ${job.data.filter})`);
        await job.progress(20);
        let filepath;
        if (job.data.format === 'csv') {
            filepath = await this.exportService.exportToCsv(job.data.filter);
        }
        else {
            filepath = await this.exportService.exportToJson(job.data.filter);
        }
        await job.progress(100);
        this.logger.log(`[Job ${job.id}] Export completed: ${filepath}`);
        return { filepath };
    }
    async handleBackupDatabase(job) {
        this.logger.log(`[Job ${job.id}] Starting database backup`);
        await job.progress(30);
        const backupPath = await this.backupService.backupDatabase();
        await job.progress(80);
        await this.backupService.deleteOldBackups(10);
        await job.progress(100);
        this.logger.log(`[Job ${job.id}] Backup completed: ${backupPath}`);
        return { backupPath };
    }
};
exports.ExportProcessor = ExportProcessor;
__decorate([
    (0, bull_1.Process)('export-jobs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExportProcessor.prototype, "handleExportJobs", null);
__decorate([
    (0, bull_1.Process)('backup-db'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExportProcessor.prototype, "handleBackupDatabase", null);
exports.ExportProcessor = ExportProcessor = ExportProcessor_1 = __decorate([
    (0, bull_1.Processor)('export'),
    __metadata("design:paramtypes", [export_service_1.ExportService,
        backup_service_1.BackupService])
], ExportProcessor);
//# sourceMappingURL=export.processor.js.map