import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OpenrouterService } from '../../ai/services/openrouter.service';
import { Job } from '../../jobs/entities/job.entity';

@Injectable()
export class PageParserService {
  private readonly logger = new Logger(PageParserService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly openrouterService: OpenrouterService,
  ) {}

  /**
   * Parse a job page using AI
   * Fetches the HTML and uses OpenRouter to extract job information
   */
  async parseJobPage(url: string): Promise<Partial<Job>> {
    this.logger.log(`Parsing job page with AI: ${url}`);

    try {
      // Step 1: Fetch the page HTML
      const html = await this.fetchPageHtml(url);

      // Step 2: Use AI to extract job information
      const jobData = await this.extractJobDataWithAI(html, url);

      // Step 3: Return parsed job data
      this.logger.log(`Successfully parsed job page: ${jobData.title} at ${jobData.company}`);
      return jobData;

    } catch (error) {
      this.logger.error(`Error parsing job page ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch HTML content from a URL
   */
  private async fetchPageHtml(url: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 10000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch page HTML: ${error.message}`);
      throw new Error(`Could not fetch page: ${error.message}`);
    }
  }

  /**
   * Use AI to extract job data from HTML
   */
  private async extractJobDataWithAI(html: string, url: string): Promise<Partial<Job>> {
    // Create prompt for AI
    const prompt = this.buildExtractionPrompt(html, url);

    try {
      // Call OpenRouter with page_scraper operation type
      const aiResponse = await this.openrouterService.callAPI(prompt, 'page_scraper');

      // Parse the JSON response
      const jobData = this.parseAIResponse(aiResponse, url);

      return jobData;

    } catch (error) {
      this.logger.error(`AI extraction failed: ${error.message}`);
      throw new Error(`Could not extract job data with AI: ${error.message}`);
    }
  }

  /**
   * Build the AI prompt for job extraction
   */
  private buildExtractionPrompt(html: string, url: string): string {
    // Truncate HTML if too long (keep first 50000 chars to avoid token limits)
    const truncatedHtml = html.length > 50000 ? html.substring(0, 50000) + '...' : html;

    return `Please analyze this job page and extract the job information in JSON format.

The JSON should contain the following fields:
- title: Job title (string)
- company: Company name (string)
- location: Job location (string)
- date: Job posting date in YYYY-MM-DD format (string, use today's date if not found)
- job_url: The URL "${url}" (string)
- job_description: Full job description text (string, extract all relevant content)

HTML content:
${truncatedHtml}

IMPORTANT: Return ONLY the raw JSON object with no markdown formatting, no code blocks, no backticks. Start with { and end with }.`;
  }

  /**
   * Parse the AI response and convert to Job data
   */
  private parseAIResponse(aiResponse: string, url: string): Partial<Job> {
    let jobData: any;

    try {
      // Try to parse as-is
      jobData = JSON.parse(aiResponse);
    } catch (e) {
      // Try to clean markdown formatting
      try {
        const cleaned = aiResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        jobData = JSON.parse(cleaned);
      } catch (e2) {
        this.logger.error(`Failed to parse AI response: ${aiResponse.substring(0, 200)}`);
        throw new Error('AI response is not valid JSON');
      }
    }

    // Validate and return job data with defaults
    return {
      title: jobData.title || 'Unknown Title',
      company: jobData.company || 'Unknown Company',
      location: jobData.location || 'Unknown Location',
      date: this.validateDate(jobData.date),
      job_url: url,
      job_description: jobData.job_description || 'No description available',
      applied: 0,
      hidden: 0,
      interview: 0,
      rejected: 0,
      blocked: 0,
      date_loaded: new Date().toISOString(),
    };
  }

  /**
   * Validate and format date
   */
  private validateDate(dateStr: string): string {
    if (!dateStr) {
      return new Date().toISOString().split('T')[0];
    }

    // Try to parse the date
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }
}
