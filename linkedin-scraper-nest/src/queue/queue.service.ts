import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';

export interface JobStatus {
  id: string | number;
  name: string;
  data: any;
  progress: number | object;
  state: string;
  returnvalue?: any;
  failedReason?: string;
  attempts: number;
  timestamp: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('scraper') private scraperQueue: Queue,
    @InjectQueue('analysis') private analysisQueue: Queue,
    @InjectQueue('export') private exportQueue: Queue,
  ) {}

  /**
   * Add a full scraping job to the queue
   */
  async addScrapeAllJob(): Promise<Job> {
    this.logger.log('Adding scrape-all job to queue');
    return this.scraperQueue.add('scrape-all', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add a single page scraping job to the queue
   */
  async addScrapeSingleJob(url: string): Promise<Job> {
    this.logger.log(`Adding scrape-single job to queue for URL: ${url}`);
    return this.scraperQueue.add('scrape-single', {
      url,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add a refilter job to the queue
   */
  async addRefilterJob(): Promise<Job> {
    this.logger.log('Adding refilter job to queue');
    return this.scraperQueue.add('refilter', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add a retry-failed job to the queue
   */
  async addRetryFailedJob(): Promise<Job> {
    this.logger.log('Adding retry-failed job to queue');
    return this.scraperQueue.add('retry-failed', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add a single job analysis to the queue
   */
  async addAnalyzeSingleJob(jobId: number, model?: string): Promise<Job> {
    this.logger.log(`Adding analyze-single job to queue for job ID: ${jobId}`);
    return this.analysisQueue.add('analyze-single', {
      jobId,
      model,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add a batch analysis job to the queue
   */
  async addAnalyzeBatchJob(mode: 'not-analyzed' | 'not-hidden' | 'all' = 'not-analyzed'): Promise<Job> {
    this.logger.log(`Adding analyze-batch job to queue with mode: ${mode}`);
    return this.analysisQueue.add('analyze-batch', {
      mode,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add an export job to the queue
   */
  async addExportJob(
    format: 'csv' | 'json' = 'csv',
    filter: 'all' | 'visible' | 'hidden' = 'all',
  ): Promise<Job> {
    this.logger.log(`Adding export job to queue (format: ${format}, filter: ${filter})`);
    return this.exportQueue.add('export-jobs', {
      format,
      filter,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add a database backup job to the queue
   */
  async addBackupJob(): Promise<Job> {
    this.logger.log('Adding database backup job to queue');
    return this.exportQueue.add('backup-db', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get the status of a job from any queue
   */
  async getJobStatus(jobId: string | number): Promise<JobStatus> {
    // Try to find the job in all queues
    const queues = [
      { name: 'scraper', queue: this.scraperQueue },
      { name: 'analysis', queue: this.analysisQueue },
      { name: 'export', queue: this.exportQueue },
    ];

    for (const { name, queue } of queues) {
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          this.logger.debug(`Found job ${jobId} in ${name} queue`);

          const state = await job.getState();
          const progress = await job.progress();

          return {
            id: job.id,
            name: job.name,
            data: job.data,
            progress,
            state,
            returnvalue: job.returnvalue,
            failedReason: job.failedReason,
            attempts: job.attemptsMade,
            timestamp: job.timestamp,
          };
        }
      } catch (error) {
        this.logger.debug(`Job ${jobId} not found in ${name} queue`);
      }
    }

    throw new NotFoundException(`Job ${jobId} not found in any queue`);
  }

  /**
   * Get all jobs in a specific queue
   */
  async getQueueJobs(queueName: 'scraper' | 'analysis' | 'export', status: string = 'active'): Promise<Job[]> {
    const queueMap = {
      scraper: this.scraperQueue,
      analysis: this.analysisQueue,
      export: this.exportQueue,
    };

    const queue = queueMap[queueName];

    switch (status) {
      case 'active':
        return queue.getActive();
      case 'waiting':
        return queue.getWaiting();
      case 'completed':
        return queue.getCompleted();
      case 'failed':
        return queue.getFailed();
      default:
        return queue.getActive(); // Default to active if status is unrecognized
    }
  }

  /**
   * Clean completed jobs from a queue
   */
  async cleanQueue(queueName: 'scraper' | 'analysis' | 'export', status: string = 'completed'): Promise<void> {
    const queueMap = {
      scraper: this.scraperQueue,
      analysis: this.analysisQueue,
      export: this.exportQueue,
    };

    const queue = queueMap[queueName];

    this.logger.log(`Cleaning ${status} jobs from ${queueName} queue`);

    if (status === 'completed') {
      await queue.clean(0, 'completed');
    } else if (status === 'failed') {
      await queue.clean(0, 'failed');
    }
  }
}
