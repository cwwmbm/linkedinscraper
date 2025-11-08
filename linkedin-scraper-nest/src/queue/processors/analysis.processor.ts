import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { JobAnalyzerService } from '../../ai/services/job-analyzer.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Job as JobEntity } from '../../jobs/entities/job.entity';

export interface AnalyzeSingleJobData {
  jobId: number;
  model?: string;
  timestamp: string;
}

export interface AnalyzeBatchJobData {
  mode: 'not-analyzed' | 'not-hidden' | 'all';
  timestamp: string;
}

@Processor('analysis')
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly jobAnalyzerService: JobAnalyzerService,
    @InjectRepository(JobEntity)
    private readonly jobsRepository: Repository<JobEntity>,
  ) {}

  /**
   * Process single job analysis
   */
  @Process('analyze-single')
  async handleAnalyzeSingle(job: Job<AnalyzeSingleJobData>): Promise<Record<string, any>> {
    this.logger.log(`[Job ${job.id}] Starting analysis for job ID ${job.data.jobId}`);

    try {
      // Update progress
      await job.progress(20);

      // Analyze the job
      const analysis = await this.jobAnalyzerService.analyzeJob(job.data.jobId, job.data.model);

      // Update progress
      await job.progress(100);

      this.logger.log(`[Job ${job.id}] Analysis completed for job ID ${job.data.jobId}`);

      return analysis;
    } catch (error) {
      this.logger.error(`[Job ${job.id}] Analysis failed for job ID ${job.data.jobId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process batch job analysis
   */
  @Process('analyze-batch')
  async handleAnalyzeBatch(job: Job<AnalyzeBatchJobData>): Promise<{ analyzed: number; failed: number; skipped: number }> {
    this.logger.log(`[Job ${job.id}] Starting batch analysis with mode: ${job.data.mode}`);

    try {
      // Update progress
      await job.progress(5);

      // Find jobs to analyze based on mode
      let jobsToAnalyze: JobEntity[] = [];

      switch (job.data.mode) {
        case 'not-analyzed':
          // Jobs without metadata (not yet analyzed)
          jobsToAnalyze = await this.jobsRepository.find({
            where: [
              { metadata: IsNull() },
              { metadata: '' },
            ],
          });
          break;

        case 'not-hidden':
          // All visible jobs
          jobsToAnalyze = await this.jobsRepository.find({
            where: { hidden: 0 },
          });
          break;

        case 'all':
          // All jobs
          jobsToAnalyze = await this.jobsRepository.find();
          break;

        default:
          throw new Error(`Unknown analysis mode: ${job.data.mode}`);
      }

      this.logger.log(`[Job ${job.id}] Found ${jobsToAnalyze.length} jobs to analyze`);

      if (jobsToAnalyze.length === 0) {
        await job.progress(100);
        return { analyzed: 0, failed: 0, skipped: 0 };
      }

      // Update progress
      await job.progress(10);

      let analyzed = 0;
      let failed = 0;
      let skipped = 0;

      // Analyze each job
      for (let i = 0; i < jobsToAnalyze.length; i++) {
        const jobEntity = jobsToAnalyze[i];

        // Skip jobs without description
        if (!jobEntity.job_description || jobEntity.job_description === 'Could not find Job Description') {
          this.logger.debug(`[Job ${job.id}] Skipping job ${jobEntity.id} - no valid description`);
          skipped++;
          continue;
        }

        try {
          this.logger.debug(`[Job ${job.id}] Analyzing job ${jobEntity.id} (${i + 1}/${jobsToAnalyze.length})`);

          // Analyze the job
          await this.jobAnalyzerService.analyzeJob(jobEntity.id);
          analyzed++;

          // Update progress based on completion
          const progress = 10 + Math.floor((i / jobsToAnalyze.length) * 90);
          await job.progress(progress);
        } catch (error) {
          this.logger.error(`[Job ${job.id}] Failed to analyze job ${jobEntity.id}: ${error.message}`);
          failed++;
        }
      }

      // Final progress
      await job.progress(100);

      this.logger.log(
        `[Job ${job.id}] Batch analysis completed: ${analyzed} analyzed, ${failed} failed, ${skipped} skipped`,
      );

      return { analyzed, failed, skipped };
    } catch (error) {
      this.logger.error(`[Job ${job.id}] Batch analysis failed: ${error.message}`);
      throw error;
    }
  }
}
