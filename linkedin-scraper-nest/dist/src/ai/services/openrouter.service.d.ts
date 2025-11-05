import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export type OperationType = 'job_analysis' | 'cover_letter' | 'resume' | 'page_scraper';
export declare class OpenrouterService {
    private readonly httpService;
    private readonly configService;
    private readonly OPENROUTER_API_URL;
    constructor(httpService: HttpService, configService: ConfigService);
    callAPI(prompt: string, operationType?: OperationType, model?: string): Promise<string>;
}
