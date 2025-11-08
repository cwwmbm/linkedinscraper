import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export type OperationType = 'job_analysis' | 'cover_letter' | 'resume' | 'page_scraper';

@Injectable()
export class OpenrouterService {
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Call OpenRouter API with operation-specific configurations
   * @param prompt The prompt to send to the AI
   * @param operationType Type of operation (job_analysis, cover_letter, resume, page_scraper)
   * @param model Optional model override
   * @returns AI response content
   */
  async callAPI(
    prompt: string,
    operationType: OperationType = 'job_analysis',
    model?: string,
  ): Promise<string> {
    // Define configuration paths for each operation type
    const operationConfigs = {
      job_analysis: {
        apiKeyPath: 'ai.jobAnalysisApiKey',
        modelPath: 'ai.jobAnalysisModel',
      },
      cover_letter: {
        apiKeyPath: 'ai.coverLetterApiKey',
        modelPath: 'ai.coverLetterModel',
      },
      resume: {
        apiKeyPath: 'ai.resumeApiKey',
        modelPath: 'ai.resumeModel',
      },
      page_scraper: {
        apiKeyPath: 'ai.pageScraperApiKey',
        modelPath: 'ai.pageScraperModel',
      },
    };

    // Validate operation type
    if (!operationConfigs[operationType]) {
      throw new BadRequestException(
        `Invalid operation_type: ${operationType}. Must be one of: ${Object.keys(operationConfigs).join(', ')}`,
      );
    }

    // Get configuration for this operation
    const opConfig = operationConfigs[operationType];
    const apiKey = this.configService.get<string>(opConfig.apiKeyPath);
    const defaultModel = this.configService.get<string>(opConfig.modelPath);

    // Validate API key
    if (!apiKey) {
      throw new BadRequestException(
        `API key for ${operationType} is empty or missing: ${opConfig.apiKeyPath}`,
      );
    }

    // Use provided model or default for this operation
    const selectedModel = model || defaultModel;

    if (!selectedModel) {
      throw new BadRequestException(
        `Model for ${operationType} is empty or missing: ${opConfig.modelPath}`,
      );
    }

    // Prepare request
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const data = {
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.OPENROUTER_API_URL, data, { headers }),
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(`Error calling OpenRouter API for ${operationType}:`, error.message);
      throw new BadRequestException(
        `Failed to call OpenRouter API for ${operationType}: ${error.message}`,
      );
    }
  }
}
