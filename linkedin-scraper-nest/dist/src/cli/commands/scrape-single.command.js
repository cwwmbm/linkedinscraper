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
exports.ScrapeSingleCommand = void 0;
const nest_commander_1 = require("nest-commander");
const queue_service_1 = require("../../queue/queue.service");
let ScrapeSingleCommand = class ScrapeSingleCommand extends nest_commander_1.CommandRunner {
    queueService;
    constructor(queueService) {
        super();
        this.queueService = queueService;
    }
    async run(_passedParams, options) {
        const { url } = options;
        if (!url) {
            console.error('❌ Error: URL is required');
            console.log('Usage: npm run cli scrape-single -- --url <job-url>');
            throw new Error('URL is required');
        }
        console.log(`🔗 Scraping single job page: ${url}`);
        try {
            const job = await this.queueService.addScrapeSingleJob(url);
            console.log(`✅ Single page scraping job queued successfully (Job ID: ${job.id})`);
            console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
            console.log('\n💡 The scraping job is running in the background.');
            console.log('   Start the API server to process the job: npm run start:dev');
        }
        catch (error) {
            console.error('❌ Error queuing scrape-single job:', error.message);
            throw error;
        }
    }
    parseUrl(val) {
        if (!val.includes('linkedin.com/jobs')) {
            throw new Error('URL must be a LinkedIn job posting');
        }
        return val;
    }
};
exports.ScrapeSingleCommand = ScrapeSingleCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-u, --url <url>',
        description: 'LinkedIn job URL to scrape',
        required: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], ScrapeSingleCommand.prototype, "parseUrl", null);
exports.ScrapeSingleCommand = ScrapeSingleCommand = __decorate([
    (0, nest_commander_1.Command)({
        name: 'scrape-single',
        description: 'Scrape a single job page using AI',
    }),
    __metadata("design:paramtypes", [queue_service_1.QueueService])
], ScrapeSingleCommand);
//# sourceMappingURL=scrape-single.command.js.map