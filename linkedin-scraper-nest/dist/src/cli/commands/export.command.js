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
exports.ExportCommand = void 0;
const nest_commander_1 = require("nest-commander");
const queue_service_1 = require("../../queue/queue.service");
let ExportCommand = class ExportCommand extends nest_commander_1.CommandRunner {
    queueService;
    constructor(queueService) {
        super();
        this.queueService = queueService;
    }
    async run(_passedParams, options) {
        const format = (options.format || 'csv');
        const filter = (options.filter || 'all');
        console.log(`📤 Starting export operation...`);
        console.log(`   Format: ${format.toUpperCase()}`);
        console.log(`   Filter: ${filter}`);
        try {
            const job = await this.queueService.addExportJob(format, filter);
            console.log(`✅ Export job queued successfully (Job ID: ${job.id})`);
            console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
            console.log('\n💡 The export job is running in the background.');
            console.log('   Start the API server to process the job: npm run start:dev');
            console.log('   Exported files will be saved to: data/exports/');
        }
        catch (error) {
            console.error('❌ Error queuing export job:', error.message);
            throw error;
        }
    }
    parseFormat(val) {
        const validFormats = ['csv', 'json'];
        if (!validFormats.includes(val)) {
            throw new Error(`Invalid format: ${val}. Must be one of: ${validFormats.join(', ')}`);
        }
        return val;
    }
    parseFilter(val) {
        const validFilters = ['all', 'visible', 'hidden'];
        if (!validFilters.includes(val)) {
            throw new Error(`Invalid filter: ${val}. Must be one of: ${validFilters.join(', ')}`);
        }
        return val;
    }
};
exports.ExportCommand = ExportCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-f, --format <format>',
        description: 'Export format: csv or json (default: csv)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], ExportCommand.prototype, "parseFormat", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '--filter <filter>',
        description: 'Filter: all, visible, or hidden (default: all)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], ExportCommand.prototype, "parseFilter", null);
exports.ExportCommand = ExportCommand = __decorate([
    (0, nest_commander_1.Command)({
        name: 'export',
        description: 'Export jobs to CSV or JSON',
    }),
    __metadata("design:paramtypes", [queue_service_1.QueueService])
], ExportCommand);
//# sourceMappingURL=export.command.js.map