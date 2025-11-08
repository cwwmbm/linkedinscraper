import { ConfigService } from '@nestjs/config';
export declare class ConfigController {
    private configService;
    constructor(configService: ConfigService);
    getConfig(): {
        analysis_questions: any;
        filters: {
            title_exclude: any;
            title_include: any;
            company_exclude: any;
            country_exclude: any;
            languages: any;
        };
        scraper: {
            pages_to_scrape: any;
            rounds: any;
            days_to_scrape: any;
            timespan: any;
        };
    };
}
