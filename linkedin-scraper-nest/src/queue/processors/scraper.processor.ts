import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ScraperService } from '../../scraper/scraper.service';

export interface ScrapeJobData {
  timestamp: string;
}

export interface ScrapeSingleJobData {
  url: string;
  timestamp: string;
}

export interface RefilterJobData {
  timestamp: string;
}

export interface RetryFailedJobData {
  timestamp: string;
}

@Processor('scraper')
export class ScraperProcessor {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(private readonly scraperService: ScraperService) {}

  /**
   * Process full scraping job
   */
  @Process('scrape-all')
  async handleScrapeAll(job: Job<ScrapeJobData>): Promise<{ jobsAdded: number; jobsFiltered: number }> {
    this.logger.log(`[Job ${job.id}] Starting full scrape operation`);

    try {
      // Update progress
      await job.progress(10);

      // Call the scraper service
      const result = await this.scraperService.triggerFullScrape();

      // Update progress
      await job.progress(100);

      this.logger.log(
        `[Job ${job.id}] Full scrape completed: ${result.jobsAdded} jobs added, ${result.jobsFiltered} jobs filtered`,
      );

      return result;
    } catch (error) {
      this.logger.error(`[Job ${job.id}] Full scrape failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process single page scraping job
   */
  @Process('scrape-single')
  async handleScrapeSingle(job: Job<ScrapeSingleJobData>): Promise<{ id: number; title: string; company: string }> {
    this.logger.log(`[Job ${job.id}] Starting single page scrape: ${job.data.url}`);

    try {
      // Update progress
      await job.progress(20);

      // Call the scraper service
      const scrapedJob = await this.scraperService.scrapeSinglePage(job.data.url);

      // Update progress
      await job.progress(100);

      this.logger.log(`[Job ${job.id}] Single page scrape completed: ${scrapedJob.title} at ${scrapedJob.company}`);

      return {
        id: scrapedJob.id,
        title: scrapedJob.title,
        company: scrapedJob.company,
      };
    } catch (error) {
      this.logger.error(`[Job ${job.id}] Single page scrape failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process refilter job
   */
  @Process('refilter')
  async handleRefilter(job: Job<RefilterJobData>): Promise<{ hidden: number; checked: number }> {
    this.logger.log(`[Job ${job.id}] Starting refilter operation`);

    try {
      // Update progress
      await job.progress(10);

      // Call the scraper service
      const result = await this.scraperService.refilterJobs();

      // Update progress
      await job.progress(100);

      this.logger.log(`[Job ${job.id}] Refilter completed: ${result.hidden} jobs hidden out of ${result.checked} checked`);

      return result;
    } catch (error) {
      this.logger.error(`[Job ${job.id}] Refilter failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process retry-failed job
   */
  @Process('retry-failed')
  async handleRetryFailed(job: Job<RetryFailedJobData>): Promise<{ success: number; failed: number }> {
    this.logger.log(`[Job ${job.id}] Starting retry-failed operation`);

    try {
      // Update progress
      await job.progress(10);

      // Call the scraper service
      const result = await this.scraperService.retryFailedJobs();

      // Update progress
      await job.progress(100);

      this.logger.log(`[Job ${job.id}] Retry-failed completed: ${result.success} success, ${result.failed} failed`);

      return result;
    } catch (error) {
      this.logger.error(`[Job ${job.id}] Retry-failed failed: ${error.message}`);
      throw error;
    }
  }
}
