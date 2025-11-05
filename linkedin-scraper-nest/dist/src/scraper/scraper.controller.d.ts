import { ScraperService } from './scraper.service';
import { ScrapeSingleDto } from './dto/scrape-single.dto';
import { QueueService, JobStatus } from '../queue/queue.service';
export declare class ScraperController {
    private readonly scraperService;
    private readonly queueService;
    constructor(scraperService: ScraperService, queueService: QueueService);
    triggerScrape(): Promise<{
        jobId: string | number;
        message: string;
    }>;
    scrapeSingle(dto: ScrapeSingleDto): Promise<{
        jobId: string | number;
        message: string;
        url: string;
    }>;
    refilter(): Promise<{
        jobId: string | number;
        message: string;
    }>;
    retryFailed(): Promise<{
        jobId: string | number;
        message: string;
    }>;
    getJobStatus(jobId: string): Promise<JobStatus>;
}
