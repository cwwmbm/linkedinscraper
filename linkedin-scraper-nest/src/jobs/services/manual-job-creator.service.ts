import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { CreateManualJobDto } from '../dto/create-manual-job.dto';
import { OpenrouterService } from '../../ai/services/openrouter.service';
import { JobAnalyzerService } from '../../ai/services/job-analyzer.service';

@Injectable()
export class ManualJobCreatorService {
  private readonly logger = new Logger(ManualJobCreatorService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    private readonly openrouterService: OpenrouterService,
    private readonly jobAnalyzerService: JobAnalyzerService,
  ) {}

  /**
   * Create a job manually with AI field extraction
   * @param dto Manual job creation data
   * @returns Created job with analysis
   */
  async createManualJob(dto: CreateManualJobDto): Promise<Job> {
    this.logger.log('Creating manual job entry');

    try {
      // Build AI prompt to extract missing fields
      const userProvidedInfo: string[] = [];
      if (dto.title) userProvidedInfo.push(`Title: ${dto.title}`);
      if (dto.company) userProvidedInfo.push(`Company: ${dto.company}`);
      if (dto.location) userProvidedInfo.push(`Location: ${dto.location}`);

      const userInfoText = userProvidedInfo.length > 0
        ? userProvidedInfo.join('\n')
        : 'No fields provided by user';

      const prompt = `Please analyze this job posting text and extract the job information in JSON format.

The JSON should contain:
- title: Job title (string)
- company: Company name (string)
- location: Job location (string)
- date: Job posting date in YYYY-MM-DD format (string, use today's date if not found)
- job_description: Cleaned and structured job description (string)

User provided information:
${userInfoText}

Job description text:
${dto.job_description}

IMPORTANT: Return ONLY the raw JSON object with no markdown formatting, no code blocks, no backticks, no additional text or explanation. Start your response directly with { and end with }.
If the user provided a field above, use that value. Only extract fields that are missing.`;

      // Call AI to extract fields
      this.logger.log('Calling AI to extract job fields');
      const aiResponse = await this.openrouterService.callAPI(prompt, 'page_scraper');

      // Parse AI response
      const extractedData = this.parseAIResponse(aiResponse);

      // Merge user-provided fields with AI-extracted fields (user data takes precedence)
      const finalTitle = dto.title || extractedData.title || 'Unknown Title';
      const finalCompany = dto.company || extractedData.company || 'Unknown Company';
      const finalLocation = dto.location || extractedData.location || 'Unknown Location';
      const finalDate = extractedData.date || new Date().toISOString().split('T')[0];
      const finalDescription = extractedData.job_description || dto.job_description;

      // Create job entity
      const job = this.jobsRepository.create({
        title: finalTitle,
        company: finalCompany,
        location: finalLocation,
        date: finalDate,
        job_url: dto.job_url || '',
        job_description: finalDescription,
        applied: 0,
        hidden: 0,
        interview: 0,
        rejected: 0,
        blocked: 0,
        date_loaded: new Date().toISOString(),
      });

      // Save job to database
      const savedJob = await this.jobsRepository.save(job);
      this.logger.log(`Job created with ID: ${savedJob.id}`);

      // Automatically analyze the job
      try {
        this.logger.log(`Auto-analyzing job ${savedJob.id}`);
        await this.jobAnalyzerService.analyzeJob(savedJob.id);

        // Fetch the updated job with analysis
        const updatedJob = await this.jobsRepository.findOne({ where: { id: savedJob.id } });
        return updatedJob || savedJob;
      } catch (analysisError) {
        this.logger.warn(`Failed to analyze job ${savedJob.id}: ${analysisError.message}`);
        // Return job even if analysis fails
        return savedJob;
      }

    } catch (error) {
      this.logger.error(`Error creating manual job: ${error.message}`);
      throw new BadRequestException(`Failed to create job: ${error.message}`);
    }
  }

  /**
   * Parse AI response and clean markdown formatting
   */
  private parseAIResponse(aiResponse: string): any {
    try {
      // Try to parse as-is
      return JSON.parse(aiResponse);
    } catch (e) {
      // Try to clean markdown formatting
      try {
        const cleaned = aiResponse
          .trim()
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        return JSON.parse(cleaned);
      } catch (e2) {
        this.logger.error(`Failed to parse AI response: ${aiResponse.substring(0, 200)}`);
        throw new BadRequestException('AI returned invalid JSON format');
      }
    }
  }
}
