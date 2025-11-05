import type { Queue, Job } from 'bull';
export interface JobStatus {
    id: string | number;
    name: string;
    data: any;
    progress: number | object;
    state: string;
    returnvalue?: any;
    failedReason?: string;
    attempts: number;
    timestamp: number;
}
export declare class QueueService {
    private scraperQueue;
    private analysisQueue;
    private exportQueue;
    private readonly logger;
    constructor(scraperQueue: Queue, analysisQueue: Queue, exportQueue: Queue);
    addScrapeAllJob(): Promise<Job>;
    addScrapeSingleJob(url: string): Promise<Job>;
    addRefilterJob(): Promise<Job>;
    addRetryFailedJob(): Promise<Job>;
    addAnalyzeSingleJob(jobId: number, model?: string): Promise<Job>;
    addAnalyzeBatchJob(mode?: 'not-analyzed' | 'not-hidden' | 'all'): Promise<Job>;
    addExportJob(format?: 'csv' | 'json', filter?: 'all' | 'visible' | 'hidden'): Promise<Job>;
    addBackupJob(): Promise<Job>;
    getJobStatus(jobId: string | number): Promise<JobStatus>;
    getQueueJobs(queueName: 'scraper' | 'analysis' | 'export', status?: string): Promise<Job[]>;
    cleanQueue(queueName: 'scraper' | 'analysis' | 'export', status?: string): Promise<void>;
}
