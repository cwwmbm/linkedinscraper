import { ConfigService } from '@nestjs/config';
export interface FilterResult {
    passed: boolean;
    reason?: string;
}
export interface JobToFilter {
    title: string;
    company: string;
    location: string;
    job_description?: string;
}
export declare class JobFilterService {
    private readonly configService;
    constructor(configService: ConfigService);
    filterJob(job: JobToFilter): FilterResult;
    private filterTitleExclude;
    private filterTitleInclude;
    private filterCompany;
    private filterLocation;
    private filterDescription;
    private filterLanguage;
}
