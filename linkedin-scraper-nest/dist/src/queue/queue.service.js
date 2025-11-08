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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
let QueueService = QueueService_1 = class QueueService {
    scraperQueue;
    analysisQueue;
    exportQueue;
    logger = new common_1.Logger(QueueService_1.name);
    constructor(scraperQueue, analysisQueue, exportQueue) {
        this.scraperQueue = scraperQueue;
        this.analysisQueue = analysisQueue;
        this.exportQueue = exportQueue;
    }
    async addScrapeAllJob() {
        this.logger.log('Adding scrape-all job to queue');
        return this.scraperQueue.add('scrape-all', {
            timestamp: new Date().toISOString(),
        });
    }
    async addScrapeSingleJob(url) {
        this.logger.log(`Adding scrape-single job to queue for URL: ${url}`);
        return this.scraperQueue.add('scrape-single', {
            url,
            timestamp: new Date().toISOString(),
        });
    }
    async addRefilterJob() {
        this.logger.log('Adding refilter job to queue');
        return this.scraperQueue.add('refilter', {
            timestamp: new Date().toISOString(),
        });
    }
    async addRetryFailedJob() {
        this.logger.log('Adding retry-failed job to queue');
        return this.scraperQueue.add('retry-failed', {
            timestamp: new Date().toISOString(),
        });
    }
    async addAnalyzeSingleJob(jobId, model) {
        this.logger.log(`Adding analyze-single job to queue for job ID: ${jobId}`);
        return this.analysisQueue.add('analyze-single', {
            jobId,
            model,
            timestamp: new Date().toISOString(),
        });
    }
    async addAnalyzeBatchJob(mode = 'not-analyzed') {
        this.logger.log(`Adding analyze-batch job to queue with mode: ${mode}`);
        return this.analysisQueue.add('analyze-batch', {
            mode,
            timestamp: new Date().toISOString(),
        });
    }
    async addExportJob(format = 'csv', filter = 'all') {
        this.logger.log(`Adding export job to queue (format: ${format}, filter: ${filter})`);
        return this.exportQueue.add('export-jobs', {
            format,
            filter,
            timestamp: new Date().toISOString(),
        });
    }
    async addBackupJob() {
        this.logger.log('Adding database backup job to queue');
        return this.exportQueue.add('backup-db', {
            timestamp: new Date().toISOString(),
        });
    }
    async getJobStatus(jobId) {
        const queues = [
            { name: 'scraper', queue: this.scraperQueue },
            { name: 'analysis', queue: this.analysisQueue },
            { name: 'export', queue: this.exportQueue },
        ];
        for (const { name, queue } of queues) {
            try {
                const job = await queue.getJob(jobId);
                if (job) {
                    this.logger.debug(`Found job ${jobId} in ${name} queue`);
                    const state = await job.getState();
                    const progress = await job.progress();
                    return {
                        id: job.id,
                        name: job.name,
                        data: job.data,
                        progress,
                        state,
                        returnvalue: job.returnvalue,
                        failedReason: job.failedReason,
                        attempts: job.attemptsMade,
                        timestamp: job.timestamp,
                    };
                }
            }
            catch (error) {
                this.logger.debug(`Job ${jobId} not found in ${name} queue`);
            }
        }
        throw new common_1.NotFoundException(`Job ${jobId} not found in any queue`);
    }
    async getQueueJobs(queueName, status = 'active') {
        const queueMap = {
            scraper: this.scraperQueue,
            analysis: this.analysisQueue,
            export: this.exportQueue,
        };
        const queue = queueMap[queueName];
        switch (status) {
            case 'active':
                return queue.getActive();
            case 'waiting':
                return queue.getWaiting();
            case 'completed':
                return queue.getCompleted();
            case 'failed':
                return queue.getFailed();
            default:
                return queue.getActive();
        }
    }
    async cleanQueue(queueName, status = 'completed') {
        const queueMap = {
            scraper: this.scraperQueue,
            analysis: this.analysisQueue,
            export: this.exportQueue,
        };
        const queue = queueMap[queueName];
        this.logger.log(`Cleaning ${status} jobs from ${queueName} queue`);
        if (status === 'completed') {
            await queue.clean(0, 'completed');
        }
        else if (status === 'failed') {
            await queue.clean(0, 'failed');
        }
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)('scraper')),
    __param(1, (0, bull_1.InjectQueue)('analysis')),
    __param(2, (0, bull_1.InjectQueue)('export')),
    __metadata("design:paramtypes", [Object, Object, Object])
], QueueService);
//# sourceMappingURL=queue.service.js.map