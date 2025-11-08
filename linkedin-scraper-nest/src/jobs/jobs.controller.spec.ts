import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobAnalyzerService } from '../ai/services/job-analyzer.service';
import { CoverLetterService } from '../ai/services/cover-letter.service';
import { ResumeTailorService } from '../ai/services/resume-tailor.service';
import { QueueService } from '../queue/queue.service';
import { ManualJobCreatorService } from './services/manual-job-creator.service';
import { JobQueryDto } from './dto/job-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

describe('JobsController', () => {
  let controller: JobsController;
  let jobsService: JobsService;
  let jobAnalyzerService: JobAnalyzerService;
  let coverLetterService: CoverLetterService;
  let resumeTailorService: ResumeTailorService;
  let queueService: QueueService;

  const mockJobsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
  };

  const mockJobAnalyzerService = {
    analyzeJob: jest.fn(),
    getAnalysisResult: jest.fn(),
  };

  const mockCoverLetterService = {
    generateCoverLetter: jest.fn(),
    getCoverLetter: jest.fn(),
  };

  const mockResumeTailorService = {
    generateTailoredResume: jest.fn(),
    getTailoredResume: jest.fn(),
  };

  const mockQueueService = {
    addAnalyzeSingleJob: jest.fn(),
  };

  const mockManualJobCreatorService = {
    createFromUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        { provide: JobsService, useValue: mockJobsService },
        { provide: JobAnalyzerService, useValue: mockJobAnalyzerService },
        { provide: CoverLetterService, useValue: mockCoverLetterService },
        { provide: ResumeTailorService, useValue: mockResumeTailorService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ManualJobCreatorService, useValue: mockManualJobCreatorService },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    jobsService = module.get<JobsService>(JobsService);
    jobAnalyzerService = module.get<JobAnalyzerService>(JobAnalyzerService);
    coverLetterService = module.get<CoverLetterService>(CoverLetterService);
    resumeTailorService = module.get<ResumeTailorService>(ResumeTailorService);
    queueService = module.get<QueueService>(QueueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated jobs', async () => {
      const query: JobQueryDto = {
        limit: 10,
        offset: 0,
        sort: 'id',
        order: 'DESC',
      };

      const mockResult = {
        data: [
          {
            id: 1,
            title: 'Software Engineer',
            company: 'Tech Corp',
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      };

      mockJobsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResult);
      expect(mockJobsService.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle query parameters', async () => {
      const query: JobQueryDto = {
        hidden: false,
        applied: true,
        limit: 50,
        offset: 10,
        sort: 'company',
        order: 'ASC',
        search: 'engineer',
      };

      mockJobsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 50,
        offset: 10,
      });

      await controller.findAll(query);

      expect(mockJobsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getStats', () => {
    it('should return job statistics', async () => {
      const mockStats = {
        total: 100,
        not_hidden: 80,
        applied: 50,
        interview: 10,
        rejected: 5,
        blocked: 3,
      };

      mockJobsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockJobsService.getStats).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single job', async () => {
      const mockJob = {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
      };

      mockJobsService.findOne.mockResolvedValue(mockJob);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockJob);
      expect(mockJobsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new job', async () => {
      const createJobDto: CreateJobDto = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        job_url: 'https://example.com/job/1',
        job_description: 'Great opportunity',
      };

      const mockCreatedJob = {
        id: 1,
        ...createJobDto,
        date_loaded: new Date().toISOString(),
      };

      mockJobsService.create.mockResolvedValue(mockCreatedJob);

      const result = await controller.create(createJobDto);

      expect(result).toEqual(mockCreatedJob);
      expect(mockJobsService.create).toHaveBeenCalledWith(createJobDto);
    });
  });

  describe('update', () => {
    it('should update a job', async () => {
      const updateJobDto: UpdateJobDto = {
        applied: 1,
        notes: 'Applied on 2025-01-15',
      };

      const mockUpdatedJob = {
        id: 1,
        title: 'Software Engineer',
        applied: 1,
        notes: 'Applied on 2025-01-15',
      };

      mockJobsService.update.mockResolvedValue(mockUpdatedJob);

      const result = await controller.update(1, updateJobDto);

      expect(result).toEqual(mockUpdatedJob);
      expect(mockJobsService.update).toHaveBeenCalledWith(1, updateJobDto);
    });
  });

  describe('patch', () => {
    it('should partially update a job', async () => {
      const patchDto = {
        interview: 1,
      };

      const mockPatchedJob = {
        id: 1,
        title: 'Software Engineer',
        interview: 1,
      };

      mockJobsService.patch.mockResolvedValue(mockPatchedJob);

      const result = await controller.patch(1, patchDto);

      expect(result).toEqual(mockPatchedJob);
      expect(mockJobsService.patch).toHaveBeenCalledWith(1, patchDto);
    });
  });

  describe('remove', () => {
    it('should remove a job', async () => {
      mockJobsService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(mockJobsService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('AI operations', () => {
    it('should queue job analysis', async () => {
      const mockJob = { id: 'analysis-123' };
      mockQueueService.addAnalyzeSingleJob.mockResolvedValue(mockJob);

      const result = await controller.analyzeJob(1, {});

      expect(result).toEqual({
        jobId: 'analysis-123',
        message: 'Job analysis queued successfully',
        targetJobId: 1,
      });
      expect(mockQueueService.addAnalyzeSingleJob).toHaveBeenCalledWith(1, undefined);
    });

    it('should generate cover letter', async () => {
      const mockCoverLetter = 'Dear Hiring Manager...';
      mockCoverLetterService.generateCoverLetter.mockResolvedValue(mockCoverLetter);

      const result = await controller.generateCoverLetter(1, {});

      expect(result).toEqual({ cover_letter: mockCoverLetter });
      expect(mockCoverLetterService.generateCoverLetter).toHaveBeenCalledWith(1, undefined);
    });

    it('should generate tailored resume', async () => {
      const mockResume = 'PROFESSIONAL SUMMARY...';
      mockResumeTailorService.generateTailoredResume.mockResolvedValue(mockResume);

      const result = await controller.generateTailoredResume(1, {});

      expect(result).toEqual({ resume: mockResume });
      expect(mockResumeTailorService.generateTailoredResume).toHaveBeenCalledWith(1, undefined);
    });
  });
});
