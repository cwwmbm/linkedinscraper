import { Test, TestingModule } from '@nestjs/testing';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { QueueService } from '../queue/queue.service';
import { ScrapeSingleDto } from './dto/scrape-single.dto';

describe('ScraperController', () => {
  let controller: ScraperController;
  let scraperService: ScraperService;
  let queueService: QueueService;

  const mockScraperService = {
    scrapeSinglePage: jest.fn(),
    refilterJobs: jest.fn(),
    retryFailedJobs: jest.fn(),
    triggerFullScrape: jest.fn(),
  };

  const mockQueueService = {
    addScrapeAllJob: jest.fn(),
    addScrapeSingleJob: jest.fn(),
    addRefilterJob: jest.fn(),
    addRetryFailedJob: jest.fn(),
    getJobStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScraperController],
      providers: [
        { provide: ScraperService, useValue: mockScraperService },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    controller = module.get<ScraperController>(ScraperController);
    scraperService = module.get<ScraperService>(ScraperService);
    queueService = module.get<QueueService>(QueueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('triggerScrape', () => {
    it('should queue full scraping job', async () => {
      const mockJob = {
        id: 'scrape-job-123',
        name: 'scrape-all',
      };

      mockQueueService.addScrapeAllJob.mockResolvedValue(mockJob);

      const result = await controller.triggerScrape();

      expect(result).toEqual({
        jobId: 'scrape-job-123',
        message: 'Full scraping job queued successfully',
      });
      expect(mockQueueService.addScrapeAllJob).toHaveBeenCalled();
    });
  });

  describe('scrapeSingle', () => {
    it('should queue single page scraping job', async () => {
      const dto: ScrapeSingleDto = {
        url: 'https://linkedin.com/jobs/view/123456',
      };

      const mockJob = {
        id: 'single-scrape-123',
        name: 'scrape-single',
      };

      mockQueueService.addScrapeSingleJob.mockResolvedValue(mockJob);

      const result = await controller.scrapeSingle(dto);

      expect(result).toEqual({
        jobId: 'single-scrape-123',
        message: 'Single page scraping job queued successfully',
        url: dto.url,
      });
      expect(mockQueueService.addScrapeSingleJob).toHaveBeenCalledWith(dto.url);
    });

    it('should handle different LinkedIn URLs', async () => {
      const dto: ScrapeSingleDto = {
        url: 'https://www.linkedin.com/jobs/view/software-engineer-456789',
      };

      const mockJob = {
        id: 'single-scrape-456',
        name: 'scrape-single',
      };

      mockQueueService.addScrapeSingleJob.mockResolvedValue(mockJob);

      const result = await controller.scrapeSingle(dto);

      expect(result.url).toBe(dto.url);
      expect(mockQueueService.addScrapeSingleJob).toHaveBeenCalledWith(dto.url);
    });
  });

  describe('refilter', () => {
    it('should queue refilter job', async () => {
      const mockJob = {
        id: 'refilter-123',
        name: 'refilter',
      };

      mockQueueService.addRefilterJob.mockResolvedValue(mockJob);

      const result = await controller.refilter();

      expect(result).toEqual({
        jobId: 'refilter-123',
        message: 'Refilter job queued successfully',
      });
      expect(mockQueueService.addRefilterJob).toHaveBeenCalled();
    });
  });

  describe('retryFailed', () => {
    it('should queue retry-failed job', async () => {
      const mockJob = {
        id: 'retry-failed-123',
        name: 'retry-failed',
      };

      mockQueueService.addRetryFailedJob.mockResolvedValue(mockJob);

      const result = await controller.retryFailed();

      expect(result).toEqual({
        jobId: 'retry-failed-123',
        message: 'Retry-failed job queued successfully',
      });
      expect(mockQueueService.addRetryFailedJob).toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for active job', async () => {
      const jobId = 'scrape-job-123';
      const mockStatus = {
        id: jobId,
        name: 'scrape-all',
        state: 'active',
        progress: 50,
        data: {},
        attempts: 1,
        timestamp: Date.now(),
      };

      mockQueueService.getJobStatus.mockResolvedValue(mockStatus);

      const result = await controller.getJobStatus(jobId);

      expect(result).toEqual(mockStatus);
      expect(mockQueueService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should return job status for completed job', async () => {
      const jobId = 'scrape-job-456';
      const mockStatus = {
        id: jobId,
        name: 'scrape-single',
        state: 'completed',
        progress: 100,
        returnvalue: {
          id: 1,
          title: 'Software Engineer',
          company: 'Tech Corp',
        },
        data: { url: 'https://linkedin.com/jobs/view/456' },
        attempts: 1,
        timestamp: Date.now(),
      };

      mockQueueService.getJobStatus.mockResolvedValue(mockStatus);

      const result = await controller.getJobStatus(jobId);

      expect(result).toEqual(mockStatus);
      expect(result.state).toBe('completed');
      expect(result.returnvalue).toBeDefined();
    });

    it('should return job status for failed job', async () => {
      const jobId = 'scrape-job-789';
      const mockStatus = {
        id: jobId,
        name: 'scrape-single',
        state: 'failed',
        progress: 0,
        failedReason: 'Network error',
        data: { url: 'https://linkedin.com/jobs/view/789' },
        attempts: 3,
        timestamp: Date.now(),
      };

      mockQueueService.getJobStatus.mockResolvedValue(mockStatus);

      const result = await controller.getJobStatus(jobId);

      expect(result).toEqual(mockStatus);
      expect(result.state).toBe('failed');
      expect(result.failedReason).toBe('Network error');
    });
  });
});
