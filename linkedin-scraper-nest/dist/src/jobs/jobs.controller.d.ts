import { JobsService } from './jobs.service';
import { JobQueryDto } from './dto/job-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobAnalyzerService } from '../ai/services/job-analyzer.service';
import { CoverLetterService } from '../ai/services/cover-letter.service';
import { ResumeTailorService } from '../ai/services/resume-tailor.service';
import { QueueService } from '../queue/queue.service';
import { AnalyzeJobDto } from '../ai/dto/job-analysis.dto';
import { GenerateCoverLetterDto } from '../ai/dto/cover-letter.dto';
import { TailorResumeDto } from '../ai/dto/resume.dto';
export declare class JobsController {
    private readonly jobsService;
    private readonly jobAnalyzerService;
    private readonly coverLetterService;
    private readonly resumeTailorService;
    private readonly queueService;
    constructor(jobsService: JobsService, jobAnalyzerService: JobAnalyzerService, coverLetterService: CoverLetterService, resumeTailorService: ResumeTailorService, queueService: QueueService);
    findAll(query: JobQueryDto): Promise<{
        data: import("./entities/job.entity").Job[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getStats(): Promise<{
        total: number;
        not_hidden: number;
        applied: number;
        interview: number;
        rejected: number;
        blocked: number;
    }>;
    analyzeJob(id: number, analyzeJobDto?: AnalyzeJobDto): Promise<{
        jobId: import("bull").JobId;
        message: string;
        targetJobId: number;
    }>;
    generateCoverLetter(id: number, generateCoverLetterDto?: GenerateCoverLetterDto): Promise<{
        cover_letter: string;
    }>;
    getCoverLetter(id: number): Promise<{
        cover_letter: string;
    }>;
    generateTailoredResume(id: number, tailorResumeDto?: TailorResumeDto): Promise<{
        resume: string;
    }>;
    getTailoredResume(id: number): Promise<{
        resume: string;
    }>;
    findOne(id: number): Promise<import("./entities/job.entity").Job>;
    create(createJobDto: CreateJobDto): Promise<import("./entities/job.entity").Job>;
    update(id: number, updateJobDto: UpdateJobDto): Promise<import("./entities/job.entity").Job>;
    patch(id: number, patchJobDto: Partial<UpdateJobDto>): Promise<import("./entities/job.entity").Job>;
    remove(id: number): Promise<void>;
}
