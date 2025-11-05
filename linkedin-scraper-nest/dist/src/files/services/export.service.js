"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../../jobs/entities/job.entity");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
let ExportService = ExportService_1 = class ExportService {
    jobsRepository;
    logger = new common_1.Logger(ExportService_1.name);
    exportDir = path.join(process.cwd(), 'data', 'exports');
    constructor(jobsRepository) {
        this.jobsRepository = jobsRepository;
    }
    async exportToCsv(filter = 'all') {
        this.logger.log(`Starting CSV export with filter: ${filter}`);
        await fs.mkdir(this.exportDir, { recursive: true });
        let jobs;
        switch (filter) {
            case 'visible':
                jobs = await this.jobsRepository.find({ where: { hidden: 0 }, order: { id: 'ASC' } });
                break;
            case 'hidden':
                jobs = await this.jobsRepository.find({ where: { hidden: 1 }, order: { id: 'ASC' } });
                break;
            default:
                jobs = await this.jobsRepository.find({ order: { id: 'ASC' } });
        }
        this.logger.log(`Found ${jobs.length} jobs to export`);
        const headers = [
            'id',
            'title',
            'company',
            'location',
            'date',
            'job_url',
            'job_description',
            'applied',
            'hidden',
            'interview',
            'rejected',
            'blocked',
            'date_loaded',
            'cover_letter',
            'resume',
            'metadata',
            'notes',
        ];
        const csvRows = [headers.join(',')];
        for (const job of jobs) {
            const row = [
                job.id,
                this.escapeCsvField(job.title),
                this.escapeCsvField(job.company),
                this.escapeCsvField(job.location),
                this.escapeCsvField(job.date),
                this.escapeCsvField(job.job_url),
                this.escapeCsvField(job.job_description),
                job.applied,
                job.hidden,
                job.interview,
                job.rejected,
                job.blocked,
                this.escapeCsvField(job.date_loaded),
                this.escapeCsvField(job.cover_letter),
                this.escapeCsvField(job.resume),
                this.escapeCsvField(job.metadata),
                this.escapeCsvField(job.notes),
            ];
            csvRows.push(row.join(','));
        }
        const csvContent = csvRows.join('\n');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `jobs_export_${filter}_${timestamp}_${Date.now()}.csv`;
        const filepath = path.join(this.exportDir, filename);
        await fs.writeFile(filepath, csvContent, 'utf-8');
        this.logger.log(`CSV export completed: ${filepath}`);
        return filepath;
    }
    async exportToJson(filter = 'all') {
        this.logger.log(`Starting JSON export with filter: ${filter}`);
        await fs.mkdir(this.exportDir, { recursive: true });
        let jobs;
        switch (filter) {
            case 'visible':
                jobs = await this.jobsRepository.find({ where: { hidden: 0 }, order: { id: 'ASC' } });
                break;
            case 'hidden':
                jobs = await this.jobsRepository.find({ where: { hidden: 1 }, order: { id: 'ASC' } });
                break;
            default:
                jobs = await this.jobsRepository.find({ order: { id: 'ASC' } });
        }
        this.logger.log(`Found ${jobs.length} jobs to export`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `jobs_export_${filter}_${timestamp}_${Date.now()}.json`;
        const filepath = path.join(this.exportDir, filename);
        await fs.writeFile(filepath, JSON.stringify(jobs, null, 2), 'utf-8');
        this.logger.log(`JSON export completed: ${filepath}`);
        return filepath;
    }
    escapeCsvField(field) {
        if (field === null || field === undefined) {
            return '';
        }
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = ExportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ExportService);
//# sourceMappingURL=export.service.js.map