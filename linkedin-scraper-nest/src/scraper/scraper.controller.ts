import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';
import { ScrapeSingleDto } from './dto/scrape-single.dto';
import { Job } from '../jobs/entities/job.entity';
import { QueueService, JobStatus } from '../queue/queue.service';

@ApiTags('scraper')
@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly queueService: QueueService,
  ) {}

  @Post('jobs')
  @ApiOperation({
    summary: 'Trigger full LinkedIn job scraping',
    description: 'Queues a background job to scrape jobs from all configured LinkedIn search queries. Returns a job ID for tracking progress.',
  })
  @ApiResponse({
    status: 201,
    description: 'Scraping job queued successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Queue job ID for tracking' },
        message: { type: 'string', description: 'Status message' },
      },
    },
  })
  async triggerScrape(): Promise<{ jobId: string | number; message: string }> {
    const job = await this.queueService.addScrapeAllJob();
    return {
      jobId: job.id,
      message: 'Full scraping job queued successfully',
    };
  }

  @Post('jobs/single')
  @ApiOperation({
    summary: 'Scrape a single job page using AI',
    description: 'Queues a background job to fetch a job page and use AI to extract job information. The job is automatically analyzed after scraping.',
  })
  @ApiResponse({
    status: 201,
    description: 'Single scraping job queued successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Queue job ID for tracking' },
        message: { type: 'string', description: 'Status message' },
        url: { type: 'string', description: 'URL being scraped' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid URL',
  })
  async scrapeSingle(@Body() dto: ScrapeSingleDto): Promise<{ jobId: string | number; message: string; url: string }> {
    const job = await this.queueService.addScrapeSingleJob(dto.url);
    return {
      jobId: job.id,
      message: 'Single page scraping job queued successfully',
      url: dto.url,
    };
  }

  @Post('refilter')
  @ApiOperation({
    summary: 'Reapply filters to all visible jobs',
    description: 'Queues a background job to check all visible jobs against current filter criteria. Jobs that no longer pass will be hidden.',
  })
  @ApiResponse({
    status: 201,
    description: 'Refilter job queued successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Queue job ID for tracking' },
        message: { type: 'string', description: 'Status message' },
      },
    },
  })
  async refilter(): Promise<{ jobId: string | number; message: string }> {
    const job = await this.queueService.addRefilterJob();
    return {
      jobId: job.id,
      message: 'Refilter job queued successfully',
    };
  }

  @Post('retry-failed')
  @ApiOperation({
    summary: 'Retry fetching failed job descriptions',
    description: 'Queues a background job to re-fetch job descriptions for jobs that previously failed. Successfully fetched jobs are automatically analyzed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Retry-failed job queued successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Queue job ID for tracking' },
        message: { type: 'string', description: 'Status message' },
      },
    },
  })
  async retryFailed(): Promise<{ jobId: string | number; message: string }> {
    const job = await this.queueService.addRetryFailedJob();
    return {
      jobId: job.id,
      message: 'Retry-failed job queued successfully',
    };
  }

  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Get status of a scraping job',
    description: 'Returns the current status, progress, and result of a background scraping job.',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Job ID' },
        name: { type: 'string', description: 'Job name' },
        data: { type: 'object', description: 'Job input data' },
        progress: { description: 'Job progress (number or object)' },
        state: { type: 'string', description: 'Job state (active, completed, failed, etc.)' },
        returnvalue: { description: 'Job result data (if completed)' },
        failedReason: { type: 'string', description: 'Failure reason (if failed)' },
        attempts: { type: 'number', description: 'Number of attempts made' },
        timestamp: { type: 'number', description: 'Job creation timestamp' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async getJobStatus(@Param('jobId') jobId: string): Promise<JobStatus> {
    return this.queueService.getJobStatus(jobId);
  }
}
