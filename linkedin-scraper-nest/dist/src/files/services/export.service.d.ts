import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
export declare class ExportService {
    private readonly jobsRepository;
    private readonly logger;
    private readonly exportDir;
    constructor(jobsRepository: Repository<Job>);
    exportToCsv(filter?: 'all' | 'visible' | 'hidden'): Promise<string>;
    exportToJson(filter?: 'all' | 'visible' | 'hidden'): Promise<string>;
    private escapeCsvField;
}
