import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { FilteredJob } from '../../jobs/entities/filtered-job.entity';
import { JobFilterService } from './job-filter.service';
import { UrlBuilderService } from './url-builder.service';
export interface ScrapedJob {
    title: string;
    company: string;
    location: string;
    date: string;
    job_url: string;
    job_description?: string;
}
export declare class LinkedInScraperService {
    private readonly httpService;
    private readonly configService;
    private readonly filterService;
    private readonly urlBuilder;
    private readonly jobsRepository;
    private readonly filteredJobsRepository;
    private readonly logger;
    constructor(httpService: HttpService, configService: ConfigService, filterService: JobFilterService, urlBuilder: UrlBuilderService, jobsRepository: Repository<Job>, filteredJobsRepository: Repository<FilteredJob>);
    scrapeJobs(): Promise<{
        jobsAdded: number;
        jobsFiltered: number;
    }>;
    private getJobCards;
    private fetchAndParseSearchPage;
    private parseJobCards;
    private fetchJobDescriptions;
    fetchJobDescription(jobUrl: string, maxRetries?: number): Promise<string>;
    private parseJobDescription;
    private findNewJobs;
    private processAndSaveJobs;
    private removeDuplicates;
    private applyInitialFilters;
    private isJobRecent;
    private fetchWithRetry;
    private sleep;
}
