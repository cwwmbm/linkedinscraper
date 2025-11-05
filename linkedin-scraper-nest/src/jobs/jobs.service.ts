import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { FilteredJob } from './entities/filtered-job.entity';
import { JobQueryDto } from './dto/job-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    @InjectRepository(FilteredJob)
    private filteredJobsRepository: Repository<FilteredJob>,
  ) {}

  async findAll(query: JobQueryDto): Promise<{ data: Job[]; total: number; limit: number; offset: number }> {
    const queryBuilder = this.jobsRepository.createQueryBuilder('job');

    // Filter by hidden status (default: exclude hidden)
    if (query.hidden === false || query.hidden === undefined) {
      queryBuilder.andWhere('job.hidden = :hidden', { hidden: 0 });
    }

    // Filter by specific statuses
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

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply sorting and pagination
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

  async findOne(id: number): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const job = this.jobsRepository.create({
      ...createJobDto,
      date_loaded: new Date().toISOString(),
    });
    return this.jobsRepository.save(job);
  }

  async update(id: number, updateJobDto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);

    // Apply the update
    Object.assign(job, updateJobDto);

    // Apply mutual exclusivity logic for status fields
    this.applyMutualExclusivity(job, updateJobDto);

    return this.jobsRepository.save(job);
  }

  async patch(id: number, patchJobDto: Partial<UpdateJobDto>): Promise<Job> {
    const job = await this.findOne(id);

    // Apply the partial update
    Object.assign(job, patchJobDto);

    // Apply mutual exclusivity logic for status fields
    this.applyMutualExclusivity(job, patchJobDto);

    return this.jobsRepository.save(job);
  }

  async remove(id: number): Promise<void> {
    const job = await this.findOne(id);
    await this.jobsRepository.remove(job);
  }

  async getStats() {
    const [
      total,
      notHidden,
      applied,
      interview,
      rejected,
      blocked,
    ] = await Promise.all([
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

  /**
   * Apply mutual exclusivity logic for status fields.
   * If one status is set to 1, all others are set to 0.
   * Status fields: applied, interview, rejected, blocked
   */
  private applyMutualExclusivity(job: Job, updateDto: Partial<UpdateJobDto>): void {
    const statusFields = ['applied', 'interview', 'rejected', 'blocked'];

    // Find which status field is being set to 1 (true)
    const activeStatus = statusFields.find(field => updateDto[field] === 1 || updateDto[field] === true);

    if (activeStatus) {
      // Clear all other status fields
      statusFields.forEach(field => {
        if (field !== activeStatus) {
          job[field] = 0;
        } else {
          job[field] = 1;
        }
      });
    }
  }
}
