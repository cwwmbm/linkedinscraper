import { ConfigService } from '@nestjs/config';
export interface SearchQuery {
    keywords: string;
    location: string;
    f_WT?: string;
    f_JT?: string;
    f_TPR?: string;
    [key: string]: string | undefined;
}
export declare class UrlBuilderService {
    private readonly configService;
    private readonly BASE_URL;
    constructor(configService: ConfigService);
    buildSearchUrl(query: SearchQuery, start?: number): string;
    getSearchQueries(): SearchQuery[];
    getTimespan(): string;
    getPagesToScrape(): number;
    getRounds(): number;
    getDaysToScrape(): number;
    buildAllSearchUrls(): string[];
    buildPaginatedUrls(query: SearchQuery, numPages: number): string[];
}
