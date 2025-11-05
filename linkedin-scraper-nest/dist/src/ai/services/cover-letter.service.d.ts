import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { OpenrouterService } from './openrouter.service';
import { PdfReaderService } from './pdf-reader.service';
export declare class CoverLetterService {
    private readonly openrouterService;
    private readonly pdfReaderService;
    private readonly jobsRepository;
    constructor(openrouterService: OpenrouterService, pdfReaderService: PdfReaderService, jobsRepository: Repository<Job>);
    generateCoverLetter(jobId: number, model?: string): Promise<string>;
    getCoverLetter(jobId: number): Promise<string>;
}
