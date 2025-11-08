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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("./entities/job.entity");
const filtered_job_entity_1 = require("./entities/filtered-job.entity");
let JobsService = class JobsService {
    jobsRepository;
    filteredJobsRepository;
    constructor(jobsRepository, filteredJobsRepository) {
        this.jobsRepository = jobsRepository;
        this.filteredJobsRepository = filteredJobsRepository;
    }
    async findAll(query) {
        const queryBuilder = this.jobsRepository.createQueryBuilder('job');
        if (query.hidden === false || query.hidden === undefined) {
            queryBuilder.andWhere('job.hidden = :hidden', { hidden: 0 });
        }
        if (query.applied !== undefined) {
            queryBuilder.andWhere('job.applied = :applied', { applied: query.applied ? 1 : 0 });
        }
        if (query.interview !== undefined) {
            queryBuilder.andWhere('job.interview = :interview', { interview: query.interview ? 1 : 0 });
        }
        if (query.rejected !== undefined) {
            queryBuilder.andWhere('job.rejected = :rejected', { rejected: query.rejected ? 1 : 0 });
        }
        if (query.blocked !== undefined) {
            queryBuilder.andWhere('job.blocked = :blocked', { blocked: query.blocked ? 1 : 0 });
        }
        const total = await queryBuilder.getCount();
        queryBuilder
            .orderBy(`job.${query.sort}`, query.order)
            .skip(query.offset)
            .take(query.limit);
        const data = await queryBuilder.getMany();
        return {
            data,
            total,
            limit: query.limit || 100,
            offset: query.offset || 0,
        };
    }
    async findOne(id) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        }
        return job;
    }
    async create(createJobDto) {
        const job = this.jobsRepository.create({
            ...createJobDto,
            date_loaded: new Date().toISOString(),
        });
        return this.jobsRepository.save(job);
    }
    async update(id, updateJobDto) {
        const job = await this.findOne(id);
        Object.assign(job, updateJobDto);
        this.applyMutualExclusivity(job, updateJobDto);
        return this.jobsRepository.save(job);
    }
    async patch(id, patchJobDto) {
        const job = await this.findOne(id);
        Object.assign(job, patchJobDto);
        this.applyMutualExclusivity(job, patchJobDto);
        return this.jobsRepository.save(job);
    }
    async remove(id) {
        const job = await this.findOne(id);
        await this.jobsRepository.remove(job);
    }
    async getStats() {
        const [total, notHidden, applied, interview, rejected, blocked,] = await Promise.all([
            this.jobsRepository.count(),
            this.jobsRepository.count({ where: { hidden: 0 } }),
            this.jobsRepository.count({ where: { applied: 1 } }),
            this.jobsRepository.count({ where: { interview: 1 } }),
            this.jobsRepository.count({ where: { rejected: 1 } }),
            this.jobsRepository.count({ where: { blocked: 1 } }),
        ]);
        return {
            total,
            not_hidden: notHidden,
            applied,
            interview,
            rejected,
            blocked,
        };
    }
    applyMutualExclusivity(job, updateDto) {
        const statusFields = ['applied', 'interview', 'rejected', 'blocked'];
        const activeStatus = statusFields.find(field => updateDto[field] === 1 || updateDto[field] === true);
        if (activeStatus) {
            statusFields.forEach(field => {
                if (field !== activeStatus) {
                    job[field] = 0;
                }
                else {
                    job[field] = 1;
                }
            });
        }
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(filtered_job_entity_1.FilteredJob)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], JobsService);
//# sourceMappingURL=jobs.service.js.map