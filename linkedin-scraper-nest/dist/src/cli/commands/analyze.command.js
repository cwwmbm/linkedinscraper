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
exports.AnalyzeCommand = void 0;
const nest_commander_1 = require("nest-commander");
const queue_service_1 = require("../../queue/queue.service");
let AnalyzeCommand = class AnalyzeCommand extends nest_commander_1.CommandRunner {
    queueService;
    constructor(queueService) {
        super();
        this.queueService = queueService;
    }
    async run(_passedParams, options) {
        const mode = (options.mode || 'not-analyzed');
        console.log(`🔍 Starting batch analysis with mode: ${mode}`);
        try {
            const job = await this.queueService.addAnalyzeBatchJob(mode);
            console.log(`✅ Analysis job queued successfully (Job ID: ${job.id})`);
            console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
            console.log('\n💡 The analysis job is running in the background.');
            console.log('   Start the API server to process the job: npm run start:dev');
        }
        catch (error) {
            console.error('❌ Error queuing analysis job:', error.message);
            throw error;
        }
    }
    parseMode(val) {
        const validModes = ['not-analyzed', 'not-hidden', 'all'];
        if (!validModes.includes(val)) {
            throw new Error(`Invalid mode: ${val}. Must be one of: ${validModes.join(', ')}`);
        }
        return val;
    }
};
exports.AnalyzeCommand = AnalyzeCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-m, --mode <mode>',
        description: 'Analysis mode: not-analyzed, not-hidden, or all (default: not-analyzed)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], AnalyzeCommand.prototype, "parseMode", null);
exports.AnalyzeCommand = AnalyzeCommand = __decorate([
    (0, nest_commander_1.Command)({
        name: 'analyze',
        description: 'Trigger batch job analysis',
    }),
    __metadata("design:paramtypes", [queue_service_1.QueueService])
], AnalyzeCommand);
//# sourceMappingURL=analyze.command.js.map