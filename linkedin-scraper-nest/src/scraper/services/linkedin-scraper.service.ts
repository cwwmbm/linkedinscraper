import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { load } from 'cheerio';
import { firstValueFrom } from 'rxjs';
import { Job } from '../../jobs/entities/job.entity';
import { FilteredJob } from '../../jobs/entities/filtered-job.entity';
import { JobFilterService } from './job-filter.service';
import { UrlBuilderService, SearchQuery } from './url-builder.service';

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  date: string;
  job_url: string;
  job_description?: string;
}

@Injectable()
export class LinkedInScraperService {
  private readonly logger = new Logger(LinkedInScraperService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly filterService: JobFilterService,
    private readonly urlBuilder: UrlBuilderService,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(FilteredJob)
    private readonly filteredJobsRepository: Repository<FilteredJob>,
  ) {}

  /**
   * Main scraping function - scrapes jobs from all configured search queries
   */
  async scrapeJobs(): Promise<{ jobsAdded: number; jobsFiltered: number }> {
    this.logger.log('Starting job scraping...');
    const startTime = Date.now();

    // Get all job cards from search results
    const allJobs = await this.getJobCards();

    // Filter out jobs already in database
    const newJobs = await this.findNewJobs(allJobs);
    this.logger.log(`Total new jobs found after comparing to database: ${newJobs.length}`);

    if (newJobs.length === 0) {
      this.logger.log('No new jobs found');
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(`Scraping finished in ${duration} seconds`);
      return { jobsAdded: 0, jobsFiltered: 0 };
    }

    // Fetch full job descriptions
    const jobsWithDescriptions = await this.fetchJobDescriptions(newJobs);

    // Apply filters and save to database
    const result = await this.processAndSaveJobs(jobsWithDescriptions);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.logger.log(`Scraping finished in ${duration} seconds`);

    return result;
  }

  /**
   * Get job cards from search results pages
   */
  private async getJobCards(): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];
    const rounds = this.urlBuilder.getRounds();
    const pagesToScrape = this.urlBuilder.getPagesToScrape();
    const queries = this.urlBuilder.getSearchQueries();
    const timespan = this.urlBuilder.getTimespan();

    for (let round = 0; round < rounds; round++) {
      for (const query of queries) {
        // Add timespan to query
        const queryWithTimespan: SearchQuery = {
          ...query,
          f_TPR: query.f_TPR || timespan,
        };

        for (let page = 0; page < pagesToScrape; page++) {
          const url = this.urlBuilder.buildSearchUrl(queryWithTimespan, page * 25);
          this.logger.log(`Scraping: ${url}`);

          try {
            const jobs = await this.fetchAndParseSearchPage(url);
            allJobs.push(...jobs);
            this.logger.log(`Found ${jobs.length} jobs on this page`);
          } catch (error) {
            this.logger.error(`Error scraping ${url}: ${error.message}`);
          }

          // Small delay between requests to be polite
          await this.sleep(1000);
        }
      }
    }

    this.logger.log(`Total job cards scraped: ${allJobs.length}`);

    // Remove duplicates
    const uniqueJobs = this.removeDuplicates(allJobs);
    this.logger.log(`Total job cards after removing duplicates: ${uniqueJobs.length}`);

    // Apply initial filters (title, company, location)
    const filteredJobs = this.applyInitialFilters(uniqueJobs);
    this.logger.log(`Total job cards after initial filtering: ${filteredJobs.length}`);

    return filteredJobs;
  }

  /**
   * Fetch and parse a single search results page
   */
  private async fetchAndParseSearchPage(url: string): Promise<ScrapedJob[]> {
    const html = await this.fetchWithRetry(url);
    if (!html) {
      return [];
    }

    return this.parseJobCards(html);
  }

  /**
   * Parse job cards from search results HTML
   */
  private parseJobCards(html: string): ScrapedJob[]  {
    const $ = load(html);
    const jobs: ScrapedJob[] = [];

    try {
      const jobCards = $('div.base-search-card__info');

      jobCards.each((_, element) => {
        try {
          const $card = $(element);
          const title = $card.find('h3').text().trim();
          const companyLink = $card.find('a.hidden-nested-link');
          const company = companyLink.text().trim().replace(/\n/g, ' ');
          const locationSpan = $card.find('span.job-search-card__location');
          const location = locationSpan.text().trim();

          // Get job URL from parent div's data-entity-urn
          const parentDiv = $card.parent();
          const entityUrn = parentDiv.attr('data-entity-urn');
          if (!entityUrn) {
            return; // Skip if no entity URN
          }

          const jobPostingId = entityUrn.split(':').pop();
          const job_url = `https://www.linkedin.com/jobs/view/${jobPostingId}/`;

          // Get date
          const dateTagNew = $card.find('time.job-search-card__listdate--new');
          const dateTag = $card.find('time.job-search-card__listdate');
          const date = dateTag.attr('datetime') || dateTagNew.attr('datetime') || '';

          if (title && job_url) {
            jobs.push({
              title,
              company,
              location,
              date,
              job_url,
            });
          }
        } catch (error) {
          this.logger.warn(`Error parsing job card: ${error.message}`);
        }
      });
    } catch (error) {
      this.logger.error(`Error parsing job cards: ${error.message}`);
    }

    return jobs;
  }

  /**
   * Fetch job descriptions for all jobs
   */
  private async fetchJobDescriptions(jobs: ScrapedJob[]): Promise<ScrapedJob[]> {
    const daysToScrape = this.urlBuilder.getDaysToScrape();
    const jobsWithDescriptions: ScrapedJob[] = [];

    for (const job of jobs) {
      // Check if job is too old
      if (!this.isJobRecent(job.date, daysToScrape)) {
        continue;
      }

      this.logger.log(`Found new job: ${job.title} at ${job.company} - ${job.job_url}`);

      // Fetch description
      const description = await this.fetchJobDescription(job.job_url);
      jobsWithDescriptions.push({
        ...job,
        job_description: description,
      });

      // Small delay between requests
      await this.sleep(500);
    }

    return jobsWithDescriptions;
  }

  /**
   * Fetch job description from individual job page
   */
  async fetchJobDescription(jobUrl: string, maxRetries = 3): Promise<string> {
    const delays = [2000, 5000, 10000]; // Increasing delays in ms

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const html = await this.fetchWithRetry(jobUrl);
        if (!html) {
          continue;
        }

        const description = this.parseJobDescription(html);

        if (description !== 'Could not find Job Description') {
          if (attempt > 0) {
            this.logger.log(`Successfully fetched description on attempt ${attempt + 1}`);
          }
          return description;
        }

        // Wait before retry
        if (attempt < maxRetries - 1) {
          this.logger.log(
            `Description not found, retrying in ${delays[attempt] / 1000}s... (attempt ${attempt + 1}/${maxRetries})`,
          );
          await this.sleep(delays[attempt]);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch description on attempt ${attempt + 1}: ${error.message}`);
        if (attempt < maxRetries - 1) {
          await this.sleep(delays[attempt]);
        }
      }
    }

    return 'Could not find Job Description';
  }

  /**
   * Parse job description from job page HTML
   */
  private parseJobDescription(html: string): string {
    const $ = load(html);

    const descDiv = $('div.description__text.description__text--rich');
    if (!descDiv.length) {
      return 'Could not find Job Description';
    }

    // Remove unwanted elements
    descDiv.find('span, a').remove();

    // Replace bullet points
    descDiv.find('ul li').each((_, li) => {
      const $li = $(li);
      $li.prepend('- ');
    });

    let text = descDiv.text().trim();
    text = text.replace(/\n\n+/g, '\n');
    text = text.replace(/::marker/g, '-');
    text = text.replace(/-\n/g, '- ');
    text = text.replace(/Show less/g, '').replace(/Show more/g, '');

    return text;
  }

  /**
   * Find jobs that are not already in the database
   */
  private async findNewJobs(jobs: ScrapedJob[]): Promise<ScrapedJob[]> {
    const newJobs: ScrapedJob[] = [];
    let skippedCount = 0;

    for (const job of jobs) {
      // Check if job exists in jobs table
      const existsInJobs = await this.jobsRepository.findOne({
        where: { job_url: job.job_url },
      });

      if (existsInJobs) {
        skippedCount++;
        this.logger.debug(`SKIPPED (already in jobs table): ${job.title} at ${job.company}`);
        continue;
      }

      // Check if job exists in filtered jobs table
      const existsInFiltered = await this.filteredJobsRepository.findOne({
        where: { job_url: job.job_url },
      });

      if (existsInFiltered) {
        skippedCount++;
        this.logger.debug(`SKIPPED (already in filtered_jobs table): ${job.title} at ${job.company}`);
        continue;
      }

      newJobs.push(job);
    }

    if (skippedCount > 0) {
      this.logger.log(`Total jobs skipped (already in database): ${skippedCount}`);
    }

    return newJobs;
  }

  /**
   * Process jobs and save to appropriate table
   */
  private async processAndSaveJobs(
    jobs: ScrapedJob[],
  ): Promise<{ jobsAdded: number; jobsFiltered: number }> {
    const jobsToAdd: Job[] = [];
    const jobsToFilter: FilteredJob[] = [];

    for (const job of jobs) {
      // Apply filters
      const filterResult = this.filterService.filterJob({
        title: job.title,
        company: job.company,
        location: job.location,
        job_description: job.job_description,
      });

      const jobData = {
        title: job.title,
        company: job.company,
        location: job.location,
        date: job.date,
        job_url: job.job_url,
        job_description: job.job_description || '',
        applied: 0,
        hidden: 0,
        interview: 0,
        rejected: 0,
        blocked: 0,
        date_loaded: new Date().toISOString(),
      };

      if (filterResult.passed) {
        jobsToAdd.push(this.jobsRepository.create(jobData));
      } else {
        // Add to filtered jobs with reason (stored in notes field)
        jobsToFilter.push(
          this.filteredJobsRepository.create({
            ...jobData,
            notes: `Filtered: ${filterResult.reason || 'Unknown reason'}`,
          }),
        );
      }
    }

    // Save to database
    if (jobsToAdd.length > 0) {
      await this.jobsRepository.save(jobsToAdd);
      this.logger.log(`Added ${jobsToAdd.length} jobs to database`);
    }

    if (jobsToFilter.length > 0) {
      await this.filteredJobsRepository.save(jobsToFilter);
      this.logger.log(`Added ${jobsToFilter.length} filtered jobs to database`);
    }

    return {
      jobsAdded: jobsToAdd.length,
      jobsFiltered: jobsToFilter.length,
    };
  }

  /**
   * Remove duplicate jobs from array
   */
  private removeDuplicates(jobs: ScrapedJob[]): ScrapedJob[] {
    const seen = new Set<string>();
    return jobs.filter((job) => {
      if (seen.has(job.job_url)) {
        return false;
      }
      seen.add(job.job_url);
      return true;
    });
  }

  /**
   * Apply initial filters (title, company, location) before fetching descriptions
   */
  private applyInitialFilters(jobs: ScrapedJob[]): ScrapedJob[] {
    return jobs.filter((job) => {
      const result = this.filterService.filterJob({
        title: job.title,
        company: job.company,
        location: job.location,
      });
      return result.passed;
    });
  }

  /**
   * Check if job date is recent enough
   */
  private isJobRecent(dateStr: string, daysThreshold: number): boolean {
    if (!dateStr) return true; // If no date, include it

    try {
      const jobDate = new Date(dateStr);
      const now = new Date();
      const diffDays = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= daysThreshold;
    } catch {
      return true; // If date parsing fails, include the job
    }
  }

  /**
   * Fetch URL with retry logic
   */
  private async fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<string | null> {
    const headers = this.configService.get<Record<string, string>>('scraper.headers', {});

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers,
            timeout: 10000,
          }),
        );

        return response.data;
      } catch (error) {
        this.logger.warn(`Fetch attempt ${attempt + 1}/${retries} failed for ${url}: ${error.message}`);
        if (attempt < retries - 1) {
          await this.sleep(delay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    return null;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
