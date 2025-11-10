import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { CreateManualJobDto } from '../dto/create-manual-job.dto';
import { OpenrouterService } from '../../ai/services/openrouter.service';
import { JobAnalyzerService } from '../../ai/services/job-analyzer.service';
export declare class ManualJobCreatorService {
    private readonly jobsRepository;
    private readonly openrouterService;
    private readonly jobAnalyzerService;
    private readonly logger;
    constructor(jobsRepository: Repository<Job>, openrouterService: OpenrouterService, jobAnalyzerService: JobAnalyzerService);
    createManualJob(dto: CreateManualJobDto): Promise<Job>;
    private parseAIResponse;
}
