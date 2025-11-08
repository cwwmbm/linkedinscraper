import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/entities/job.entity';
import { FilteredJob } from '../jobs/entities/filtered-job.entity';
import { PageParserService } from './services/page-parser.service';
import { JobAnalyzerService } from '../ai/services/job-analyzer.service';
import { JobFilterService } from './services/job-filter.service';
import { LinkedInScraperService } from './services/linkedin-scraper.service';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(FilteredJob)
    private readonly filteredJobsRepository: Repository<FilteredJob>,
    private readonly pageParserService: PageParserService,
    private readonly jobAnalyzerService: JobAnalyzerService,
    private readonly jobFilterService: JobFilterService,
    private readonly linkedInScraperService: LinkedInScraperService,
  ) {}

  /**
   * Scrape a single job page using AI parsing
   * This is a synchronous operation that immediately returns the scraped job
   */
  async scrapeSinglePage(url: string): Promise<Job> {
    this.logger.log(`Scraping single page: ${url}`);

    // Check if job already exists in jobs table
    const existingJob = await this.jobsRepository.findOne({
      where: { job_url: url },
    });

    if (existingJob) {
      this.logger.warn(`Job already exists in database: ${url}`);
      throw new ConflictException('Job already exists in the database');
    }

    // Check if job exists in filtered_jobs table
    const existingFilteredJob = await this.filteredJobsRepository.findOne({
      where: { job_url: url },
    });

    if (existingFilteredJob) {
      this.logger.warn(`Job already exists in filtered_jobs: ${url}`);
      throw new ConflictException('Job already exists in the filtered jobs table');
    }

    // Use AI to parse the job page
    const jobData = await this.pageParserService.parseJobPage(url);

    // Create and save the job
    const job = this.jobsRepository.create(jobData);
    const savedJob = await this.jobsRepository.save(job);

    this.logger.log(`Successfully saved job ${savedJob.id}: ${savedJob.title} at ${savedJob.company}`);

    // Analyze the job in the background (don't await)
    this.analyzeJobAsync(savedJob.id);

    return savedJob;
  }

  /**
   * Analyze a job asynchronously (fire and forget)
   */
  private async analyzeJobAsync(jobId: number): Promise<void> {
    try {
      this.logger.log(`Starting background analysis for job ${jobId}`);

      // Use the analyzeJob method which handles everything internally
      await this.jobAnalyzerService.analyzeJob(jobId);

      this.logger.log(`Successfully analyzed job ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to analyze job ${jobId}: ${error.message}`);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Reapply filters to all visible jobs
   * Jobs that no longer pass filters will be hidden
   */
  async refilterJobs(): Promise<{ hidden: number; checked: number }> {
    this.logger.log('Starting refilter operation...');

    // Get all visible jobs
    const visibleJobs = await this.jobsRepository.find({
      where: { hidden: 0 },
    });

    this.logger.log(`Found ${visibleJobs.length} visible jobs to check`);

    let hiddenCount = 0;

    for (const job of visibleJobs) {
      // Apply filters
      const filterResult = this.jobFilterService.filterJob({
        title: job.title,
        company: job.company,
        location: job.location,
        job_description: job.job_description,
      });

      if (!filterResult.passed) {
        // Job no longer passes filters - hide it
        job.hidden = 1;
        await this.jobsRepository.save(job);
        hiddenCount++;

        this.logger.debug(
          `Hidden job ${job.id} (${job.title} at ${job.company}): ${filterResult.reason}`,
        );
      }
    }

    this.logger.log(`Refilter complete: ${hiddenCount} jobs hidden out of ${visibleJobs.length} checked`);

    return {
      hidden: hiddenCount,
      checked: visibleJobs.length,
    };
  }

  /**
   * Retry fetching descriptions for jobs that failed
   */
  async retryFailedJobs(): Promise<{ success: number; failed: number }> {
    this.logger.log('Starting retry-failed operation...');

    // Find jobs with failed descriptions
    const failedJobs = await this.jobsRepository.find({
      where: { job_description: 'Could not find Job Description' },
    });

    this.logger.log(`Found ${failedJobs.length} jobs with failed descriptions`);

    let successCount = 0;
    let failedCount = 0;

    for (const job of failedJobs) {
      try {
        this.logger.log(`Retrying job ${job.id}: ${job.title}`);

        // Fetch description using LinkedIn scraper service
        const description = await this.linkedInScraperService.fetchJobDescription(job.job_url);

        // Update job with new description
        job.job_description = description;
        await this.jobsRepository.save(job);

        if (description === 'Could not find Job Description') {
          failedCount++;
          this.logger.warn(`Job ${job.id} still failed after retry`);
        } else {
          successCount++;
          this.logger.log(`Successfully fetched description for job ${job.id}`);

          // Analyze the job now that we have the description
          this.analyzeJobAsync(job.id);
        }
      } catch (error) {
        failedCount++;
        this.logger.error(`Error retrying job ${job.id}: ${error.message}`);
      }
    }

    this.logger.log(`Retry-failed complete: ${successCount} success, ${failedCount} failed`);

    return {
      success: successCount,
      failed: failedCount,
    };
  }

  /**
   * Trigger full scraping operation
   * This will be moved to a queue in Phase 5
   */
  async triggerFullScrape(): Promise<{ jobsAdded: number; jobsFiltered: number }> {
    this.logger.log('Starting full scraping operation...');

    const result = await this.linkedInScraperService.scrapeJobs();

    this.logger.log(`Full scrape complete: ${result.jobsAdded} jobs added, ${result.jobsFiltered} jobs filtered`);

    return result;
  }
}
