import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { FilteredJob } from './entities/filtered-job.entity';
import { JobQueryDto } from './dto/job-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
export declare class JobsService {
    private jobsRepository;
    private filteredJobsRepository;
    constructor(jobsRepository: Repository<Job>, filteredJobsRepository: Repository<FilteredJob>);
    findAll(query: JobQueryDto): Promise<{
        data: Job[];
        total: number;
        limit: number;
        offset: number;
    }>;
    findOne(id: number): Promise<Job>;
    create(createJobDto: CreateJobDto): Promise<Job>;
    update(id: number, updateJobDto: UpdateJobDto): Promise<Job>;
    patch(id: number, patchJobDto: Partial<UpdateJobDto>): Promise<Job>;
    remove(id: number): Promise<void>;
    getStats(): Promise<{
        total: number;
        not_hidden: number;
        applied: number;
        interview: number;
        rejected: number;
        blocked: number;
    }>;
    private applyMutualExclusivity;
}
