import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { OpenrouterService } from './openrouter.service';
import { PdfReaderService } from './pdf-reader.service';

@Injectable()
export class CoverLetterService {
  constructor(
    private readonly openrouterService: OpenrouterService,
    private readonly pdfReaderService: PdfReaderService,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  /**
   * Generate a cover letter for a job using a 2-pass approach
   * @param jobId Job ID
   * @param model Optional model override
   * @returns Generated cover letter
   */
  async generateCoverLetter(jobId: number, model?: string): Promise<string> {
    console.log('CoverLetter generation started for job:', jobId);

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

    // First pass: Generate initial cover letter
    const firstPassPrompt =
      `You are a career coach with over 15 years of experience helping job seekers land their dream jobs in tech. You are helping a candidate to write a cover letter for the below role. Approach this task in three steps. Step 1. Identify main challenges someone in this position would face day to day. Step 2. Write an attention grabbing hook for your cover letter that highlights your experience and qualifications in a way that shows you empathize and can successfully take on challenges of the role. Consider incorporating specific examples of how you tackled these challenges in your past work, and explore creative ways to express your enthusiasm for the opportunity. Put emphasis on how the candidate can contribute to company as opposed to just listing accomplishments. Keep your hook within 100 words or less. Step 3. Finish writing the cover letter based on the resume and keep it within 250 words. Respond with final cover letter only. \n job description: ${job.job_description}\n company: ${job.company}\n title: ${job.title}\n resume: ${resume}` +
      (consideration ? `\nConsider incorporating that ${consideration}` : '');

    let response = await this.openrouterService.callAPI(
      firstPassPrompt,
      'cover_letter',
      model,
    );

    if (!response) {
      throw new BadRequestException('Failed to get a response from OpenRouter API');
    }

    // Second pass: Improve the cover letter (formality scale 7)
    const secondPassPrompt =
      `You are young but experienced career coach helping job seekers land their dream jobs in tech. I need your help crafting a cover letter. Here is a job description: ${job.job_description}\nhere is my resume: ${resume}\nHere's the cover letter I got so far: ${response}\nI need you to help me improve it. Let's approach this in following steps. \nStep 1. Please set the formality scale as follows: 1 is conversational English, my initial Cover letter draft is 10. Step 2. Identify three to five ways this cover letter can be improved, and elaborate on each way with at least one thoughtful sentence. Step 4. Suggest an improved cover letter based on these suggestions with the Formality Score set to 7. Avoid subjective qualifiers such as drastic, transformational, etc. Keep the final cover letter within 250 words. Please respond with the final cover letter only.`;

    response = await this.openrouterService.callAPI(
      secondPassPrompt,
      'cover_letter',
      model,
    );

    if (!response) {
      throw new BadRequestException('Failed to get a response from OpenRouter API on second pass');
    }

    // Store the cover letter in the database
    job.cover_letter = response;
    await this.jobsRepository.save(job);

    console.log('Cover letter generated and saved for job:', jobId);
    return response;
  }

  /**
   * Get existing cover letter for a job
   * @param jobId Job ID
   * @returns Cover letter
   */
  async getCoverLetter(jobId: number): Promise<string> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.cover_letter) {
      throw new NotFoundException(`Cover letter not found for job ${jobId}`);
    }

    return job.cover_letter;
  }
}
