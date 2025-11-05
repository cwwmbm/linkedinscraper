import type { Job } from 'bull';
import { ScraperService } from '../../scraper/scraper.service';
export interface ScrapeJobData {
    timestamp: string;
}
export interface ScrapeSingleJobData {
    url: string;
    timestamp: string;
}
export interface RefilterJobData {
    timestamp: string;
}
export interface RetryFailedJobData {
    timestamp: string;
}
export declare class ScraperProcessor {
    private readonly scraperService;
    private readonly logger;
    constructor(scraperService: ScraperService);
    handleScrapeAll(job: Job<ScrapeJobData>): Promise<{
        jobsAdded: number;
        jobsFiltered: number;
    }>;
    handleScrapeSingle(job: Job<ScrapeSingleJobData>): Promise<{
        id: number;
        title: string;
        company: string;
    }>;
    handleRefilter(job: Job<RefilterJobData>): Promise<{
        hidden: number;
        checked: number;
    }>;
    handleRetryFailed(job: Job<RetryFailedJobData>): Promise<{
        success: number;
        failed: number;
    }>;
}
