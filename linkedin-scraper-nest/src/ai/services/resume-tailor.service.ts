import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { OpenrouterService } from './openrouter.service';
import { PdfReaderService } from './pdf-reader.service';

@Injectable()
export class ResumeTailorService {
  constructor(
    private readonly openrouterService: OpenrouterService,
    private readonly pdfReaderService: PdfReaderService,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  /**
   * Generate a tailored resume for a job
   * @param jobId Job ID
   * @param model Optional model override
   * @returns Tailored resume
   */
  async generateTailoredResume(jobId: number, model?: string): Promise<string> {
    console.log('Resume tailoring started for job:', jobId);

    // Fetch job from database
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.job_description) {
      throw new BadRequestException(`Job ${jobId} has no job description`);
    }

    // Read resume
    const resume = await this.pdfReaderService.readResume();

    if (!resume) {
      throw new BadRequestException('Resume not found or could not be read');
    }

    const consideration = '';

    // Generate tailored resume
    const prompt =
      `You are a career coach with a client that is applying for a job as a ${job.title} at ${job.company}. They have a resume that you need to review and suggest how to tailor it for the job. Approach this task in the following steps: \n 1. Highlight three to five most important responsibilities for this role based on the job description. \n2. Based on these most important responsibilities from the job description, please tailor the resume for this role. Do not make information up. Respond with the final resume only. \n\n Here is the job description: ${job.job_description}\n\n Here is the resume: ${resume}` +
      (consideration ? `\nConsider incorporating that ${consideration}` : '');

    const response = await this.openrouterService.callAPI(prompt, 'resume', model);

    if (!response) {
      throw new BadRequestException('Failed to get response from OpenRouter API');
    }

    // Store the tailored resume in the database
    job.resume = response;
    await this.jobsRepository.save(job);

    console.log('Tailored resume generated and saved for job:', jobId);
    return response;
  }

  /**
   * Get existing tailored resume for a job
   * @param jobId Job ID
   * @returns Tailored resume
   */
  async getTailoredResume(jobId: number): Promise<string> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.resume) {
      throw new NotFoundException(`Tailored resume not found for job ${jobId}`);
    }

    return job.resume;
  }
}
