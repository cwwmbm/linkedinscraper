import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { OpenrouterService } from './openrouter.service';

@Injectable()
export class JobAnalyzerService {
  constructor(
    private readonly openrouterService: OpenrouterService,
    private readonly configService: ConfigService,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  /**
   * Analyze a job description using predefined questions from config
   * @param jobId Job ID to analyze
   * @param model Optional model override
   * @returns Analysis results
   */
  async analyzeJob(jobId: number, model?: string): Promise<Record<string, any>> {
    console.log(`Analyzing job ${jobId}`);

    // Fetch job from database
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.job_description) {
      throw new BadRequestException(`Job ${jobId} has no job description to analyze`);
    }

    // Get analysis questions from config
    const analysisQuestions = this.configService.get<any[]>('ai.analysisQuestions');

    if (!analysisQuestions || analysisQuestions.length === 0) {
      throw new BadRequestException('No analysis questions defined in configuration');
    }

    // Analyze each question
    const analysisResults: Record<string, any> = {};
    const jobDescription = job.job_description;

    for (const questionConfig of analysisQuestions) {
      let questionText: string;
      let questionTitle: string;

      // Handle both old string format and new object format for backward compatibility
      if (typeof questionConfig === 'string') {
        // Old format - use the question string as both question and key
        questionText = questionConfig;
        questionTitle = questionConfig;
      } else {
        // New format - use the question and title from the object
        questionText = questionConfig.question || '';
        questionTitle = questionConfig.title || questionText;
      }

      if (!questionText) {
        continue;
      }

      const prompt = `Based on the following job description, please answer this question in markdown: ${questionText}

Job Description:
${jobDescription}

Please provide a concise and relevant answer based only on the information provided in the job description.`;

      try {
        const answer = await this.openrouterService.callAPI(
          prompt,
          'job_analysis',
          model,
        );
        analysisResults[questionTitle] = answer || 'Unable to analyze';
      } catch (error) {
        console.error(`Error analyzing question '${questionTitle}':`, error.message);
        analysisResults[questionTitle] = 'Error during analysis';
      }
    }

    // Store results in metadata column
    const metadataJson = JSON.stringify(analysisResults, null, 2);
    job.metadata = metadataJson;
    await this.jobsRepository.save(job);

    return analysisResults;
  }
}
