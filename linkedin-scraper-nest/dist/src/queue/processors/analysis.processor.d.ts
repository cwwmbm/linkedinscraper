import type { Job } from 'bull';
import { JobAnalyzerService } from '../../ai/services/job-analyzer.service';
import { Repository } from 'typeorm';
import { Job as JobEntity } from '../../jobs/entities/job.entity';
export interface AnalyzeSingleJobData {
    jobId: number;
    model?: string;
    timestamp: string;
}
export interface AnalyzeBatchJobData {
    mode: 'not-analyzed' | 'not-hidden' | 'all';
    timestamp: string;
}
export declare class AnalysisProcessor {
    private readonly jobAnalyzerService;
    private readonly jobsRepository;
    private readonly logger;
    constructor(jobAnalyzerService: JobAnalyzerService, jobsRepository: Repository<JobEntity>);
    handleAnalyzeSingle(job: Job<AnalyzeSingleJobData>): Promise<Record<string, any>>;
    handleAnalyzeBatch(job: Job<AnalyzeBatchJobData>): Promise<{
        analyzed: number;
        failed: number;
        skipped: number;
    }>;
}
