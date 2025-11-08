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
exports.RetryFailedCommand = void 0;
const nest_commander_1 = require("nest-commander");
const queue_service_1 = require("../../queue/queue.service");
let RetryFailedCommand = class RetryFailedCommand extends nest_commander_1.CommandRunner {
    queueService;
    constructor(queueService) {
        super();
        this.queueService = queueService;
    }
    async run() {
        console.log('🔁 Starting retry-failed operation...');
        try {
            const job = await this.queueService.addRetryFailedJob();
            console.log(`✅ Retry-failed job queued successfully (Job ID: ${job.id})`);
            console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
            console.log('\n💡 The retry-failed job is running in the background.');
            console.log('   Start the API server to process the job: npm run start:dev');
        }
        catch (error) {
            console.error('❌ Error queuing retry-failed job:', error.message);
            throw error;
        }
    }
};
exports.RetryFailedCommand = RetryFailedCommand;
exports.RetryFailedCommand = RetryFailedCommand = __decorate([
    (0, nest_commander_1.Command)({
        name: 'retry-failed',
        description: 'Retry fetching failed job descriptions',
    }),
    __metadata("design:paramtypes", [queue_service_1.QueueService])
], RetryFailedCommand);
//# sourceMappingURL=retry-failed.command.js.map