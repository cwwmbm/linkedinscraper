import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { OpenrouterService } from './openrouter.service';
export declare class JobAnalyzerService {
    private readonly openrouterService;
    private readonly configService;
    private readonly jobsRepository;
    constructor(openrouterService: OpenrouterService, configService: ConfigService, jobsRepository: Repository<Job>);
    analyzeJob(jobId: number, model?: string): Promise<Record<string, any>>;
}
