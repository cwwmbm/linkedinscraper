import { HttpService } from '@nestjs/axios';
import { OpenrouterService } from '../../ai/services/openrouter.service';
import { Job } from '../../jobs/entities/job.entity';
export declare class PageParserService {
    private readonly httpService;
    private readonly openrouterService;
    private readonly logger;
    constructor(httpService: HttpService, openrouterService: OpenrouterService);
    parseJobPage(url: string): Promise<Partial<Job>>;
    private fetchPageHtml;
    private extractJobDataWithAI;
    private buildExtractionPrompt;
    private parseAIResponse;
    private validateDate;
}
