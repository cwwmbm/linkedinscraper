import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from './scraper.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/entities/job.entity';
import { FilteredJob } from '../jobs/entities/filtered-job.entity';
import { PageParserService } from './services/page-parser.service';
import { JobAnalyzerService } from '../ai/services/job-analyzer.service';
import { JobFilterService } from './services/job-filter.service';
import { LinkedInScraperService } from './services/linkedin-scraper.service';
import { ConflictException } from '@nestjs/common';

describe('ScraperService', () => {
  let service: ScraperService;
  let jobsRepository: Repository<Job>;
  let filteredJobsRepository: Repository<FilteredJob>;
  let pageParserService: PageParserService;
  let jobAnalyzerService: JobAnalyzerService;
  let jobFilterService: JobFilterService;
  let linkedInScraperService: LinkedInScraperService;

  const mockJobsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFilteredJobsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPageParserService = {
    parseJobPage: jest.fn(),
  };

  const mockJobAnalyzerService = {
    analyzeJob: jest.fn(),
  };

  const mockJobFilterService = {
    filterJob: jest.fn(),
  };

  const mockLinkedInScraperService = {
    fetchJobDescription: jest.fn(),
    scrapeJobs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperService,
        {
          provide: getRepositoryToken(Job),
          useValue: mockJobsRepository,
        },
        {
          provide: getRepositoryToken(FilteredJob),
          useValue: mockFilteredJobsRepository,
        },
        {
          provide: PageParserService,
          useValue: mockPageParserService,
        },
        {
          provide: JobAnalyzerService,
          useValue: mockJobAnalyzerService,
        },
        {
          provide: JobFilterService,
          useValue: mockJobFilterService,
        },
        {
          provide: LinkedInScraperService,
          useValue: mockLinkedInScraperService,
        },
      ],
    }).compile();

    service = module.get<ScraperService>(ScraperService);
    jobsRepository = module.get<Repository<Job>>(getRepositoryToken(Job));
    filteredJobsRepository = module.get<Repository<FilteredJob>>(
      getRepositoryToken(FilteredJob),
    );
    pageParserService = module.get<PageParserService>(PageParserService);
    jobAnalyzerService = module.get<JobAnalyzerService>(JobAnalyzerService);
    jobFilterService = module.get<JobFilterService>(JobFilterService);
    linkedInScraperService = module.get<LinkedInScraperService>(
      LinkedInScraperService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scrapeSinglePage', () => {
    const testUrl = 'https://linkedin.com/jobs/view/123456';

    it('should successfully scrape a single job page', async () => {
      const mockJobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        job_url: testUrl,
        job_description: 'Great opportunity to work with cutting-edge tech',
      };

      const mockSavedJob = {
        id: 1,
        ...mockJobData,
        date_loaded: new Date().toISOString(),
      };

      mockJobsRepository.findOne.mockResolvedValue(null);
      mockFilteredJobsRepository.findOne.mockResolvedValue(null);
      mockPageParserService.parseJobPage.mockResolvedValue(mockJobData);
      mockJobsRepository.create.mockReturnValue(mockSavedJob);
      mockJobsRepository.save.mockResolvedValue(mockSavedJob);
      mockJobAnalyzerService.analyzeJob.mockResolvedValue({});

      const result = await service.scrapeSinglePage(testUrl);

      expect(result).toEqual(mockSavedJob);
      expect(mockJobsRepository.findOne).toHaveBeenCalledWith({
        where: { job_url: testUrl },
      });
      expect(mockFilteredJobsRepository.findOne).toHaveBeenCalledWith({
        where: { job_url: testUrl },
      });
      expect(mockPageParserService.parseJobPage).toHaveBeenCalledWith(testUrl);
      expect(mockJobsRepository.create).toHaveBeenCalledWith(mockJobData);
      expect(mockJobsRepository.save).toHaveBeenCalledWith(mockSavedJob);
    });

    it('should throw ConflictException if job already exists in jobs table', async () => {
      const existingJob = {
        id: 1,
        job_url: testUrl,
        title: 'Existing Job',
      };

      mockJobsRepository.findOne.mockResolvedValue(existingJob);

      await expect(service.scrapeSinglePage(testUrl)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPageParserService.parseJobPage).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if job exists in filtered_jobs table', async () => {
      const existingFilteredJob = {
        id: 1,
        job_url: testUrl,
        title: 'Filtered Job',
      };

      mockJobsRepository.findOne.mockResolvedValue(null);
      mockFilteredJobsRepository.findOne.mockResolvedValue(existingFilteredJob);

      await expect(service.scrapeSinglePage(testUrl)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPageParserService.parseJobPage).not.toHaveBeenCalled();
    });
  });

  describe('refilterJobs', () => {
    it('should hide jobs that no longer pass filters', async () => {
      const visibleJobs = [
        {
          id: 1,
          title: 'Senior PHP Developer',
          company: 'Old Tech',
          location: 'Remote',
          job_description: 'PHP work',
          hidden: 0,
        },
        {
          id: 2,
          title: 'Software Engineer',
          company: 'Modern Tech',
          location: 'San Francisco',
          job_description: 'Great opportunity',
          hidden: 0,
        },
      ];

      mockJobsRepository.find.mockResolvedValue(visibleJobs);
      mockJobsRepository.save.mockResolvedValue({});

      // First job fails filter, second passes
      mockJobFilterService.filterJob
        .mockReturnValueOnce({
          passed: false,
          reason: 'Title contains excluded term: PHP',
        })
        .mockReturnValueOnce({
          passed: true,
          reason: null,
        });

      const result = await service.refilterJobs();

      expect(result).toEqual({
        hidden: 1,
        checked: 2,
      });
      expect(mockJobsRepository.find).toHaveBeenCalledWith({
        where: { hidden: 0 },
      });
      expect(mockJobFilterService.filterJob).toHaveBeenCalledTimes(2);
      expect(mockJobsRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle case when all jobs pass filters', async () => {
      const visibleJobs = [
        {
          id: 1,
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'Remote',
          job_description: 'Great job',
          hidden: 0,
        },
      ];

      mockJobsRepository.find.mockResolvedValue(visibleJobs);
      mockJobFilterService.filterJob.mockReturnValue({
        passed: true,
        reason: null,
      });

      const result = await service.refilterJobs();

      expect(result).toEqual({
        hidden: 0,
        checked: 1,
      });
      expect(mockJobsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry fetching descriptions for failed jobs', async () => {
      const failedJobs = [
        {
          id: 1,
          title: 'Software Engineer',
          job_url: 'https://linkedin.com/jobs/view/1',
          job_description: 'Could not find Job Description',
        },
        {
          id: 2,
          title: 'Frontend Developer',
          job_url: 'https://linkedin.com/jobs/view/2',
          job_description: 'Could not find Job Description',
        },
      ];

      mockJobsRepository.find.mockResolvedValue(failedJobs);
      mockJobsRepository.save.mockResolvedValue({});

      // First job succeeds, second still fails
      mockLinkedInScraperService.fetchJobDescription
        .mockResolvedValueOnce('Successfully fetched description')
        .mockResolvedValueOnce('Could not find Job Description');

      mockJobAnalyzerService.analyzeJob.mockResolvedValue({});

      const result = await service.retryFailedJobs();

      expect(result).toEqual({
        success: 1,
        failed: 1,
      });
      expect(mockJobsRepository.find).toHaveBeenCalledWith({
        where: { job_description: 'Could not find Job Description' },
      });
      expect(mockLinkedInScraperService.fetchJobDescription).toHaveBeenCalledTimes(2);
      expect(mockJobsRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when retrying jobs', async () => {
      const failedJobs = [
        {
          id: 1,
          title: 'Software Engineer',
          job_url: 'https://linkedin.com/jobs/view/1',
          job_description: 'Could not find Job Description',
        },
      ];

      mockJobsRepository.find.mockResolvedValue(failedJobs);
      mockLinkedInScraperService.fetchJobDescription.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.retryFailedJobs();

      expect(result).toEqual({
        success: 0,
        failed: 1,
      });
    });
  });

  describe('triggerFullScrape', () => {
    it('should trigger full scraping operation', async () => {
      const mockResult = {
        jobsAdded: 10,
        jobsFiltered: 5,
      };

      mockLinkedInScraperService.scrapeJobs.mockResolvedValue(mockResult);

      const result = await service.triggerFullScrape();

      expect(result).toEqual(mockResult);
      expect(mockLinkedInScraperService.scrapeJobs).toHaveBeenCalled();
    });
  });
});

