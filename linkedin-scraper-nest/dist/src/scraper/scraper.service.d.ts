import { Repository } from 'typeorm';
import { Job } from '../jobs/entities/job.entity';
import { FilteredJob } from '../jobs/entities/filtered-job.entity';
import { PageParserService } from './services/page-parser.service';
import { JobAnalyzerService } from '../ai/services/job-analyzer.service';
import { JobFilterService } from './services/job-filter.service';
import { LinkedInScraperService } from './services/linkedin-scraper.service';
export declare class ScraperService {
    private readonly jobsRepository;
    private readonly filteredJobsRepository;
    private readonly pageParserService;
    private readonly jobAnalyzerService;
    private readonly jobFilterService;
    private readonly linkedInScraperService;
    private readonly logger;
    constructor(jobsRepository: Repository<Job>, filteredJobsRepository: Repository<FilteredJob>, pageParserService: PageParserService, jobAnalyzerService: JobAnalyzerService, jobFilterService: JobFilterService, linkedInScraperService: LinkedInScraperService);
    scrapeSinglePage(url: string): Promise<Job>;
    private analyzeJobAsync;
    refilterJobs(): Promise<{
        hidden: number;
        checked: number;
    }>;
    retryFailedJobs(): Promise<{
        success: number;
        failed: number;
    }>;
    triggerFullScrape(): Promise<{
        jobsAdded: number;
        jobsFiltered: number;
    }>;
}
