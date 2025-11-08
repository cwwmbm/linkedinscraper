import { Test, TestingModule } from '@nestjs/testing';
import { OpenrouterService } from './openrouter.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('OpenrouterService', () => {
  let service: OpenrouterService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenrouterService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<OpenrouterService>(OpenrouterService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('callAPI', () => {
    it('should successfully call OpenRouter API for job_analysis', async () => {
      // Arrange
      const prompt = 'Analyze this job posting';
      const mockApiKey = 'test-api-key';
      const mockModel = 'gpt-4';
      const mockResponse = 'This is a great job opportunity';

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ai.jobAnalysisApiKey') return mockApiKey;
        if (key === 'ai.jobAnalysisModel') return mockModel;
        return null;
      });

      const axiosResponse: AxiosResponse = {
        data: {
          choices: [{ message: { content: mockResponse } }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      // Act
      const result = await service.callAPI(prompt, 'job_analysis');

      // Assert
      expect(result).toBe(mockResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: mockModel,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should successfully call OpenRouter API for cover_letter', async () => {
      const prompt = 'Generate a cover letter';
      const mockApiKey = 'cover-letter-key';
      const mockModel = 'gpt-3.5-turbo';
      const mockResponse = 'Dear Hiring Manager...';

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ai.coverLetterApiKey') return mockApiKey;
        if (key === 'ai.coverLetterModel') return mockModel;
        return null;
      });

      const axiosResponse: AxiosResponse = {
        data: {
          choices: [{ message: { content: mockResponse } }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await service.callAPI(prompt, 'cover_letter');

      expect(result).toBe(mockResponse);
    });

    it('should use custom model when provided', async () => {
      const prompt = 'Test prompt';
      const customModel = 'custom-model';
      const mockApiKey = 'test-key';

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ai.jobAnalysisApiKey') return mockApiKey;
        if (key === 'ai.jobAnalysisModel') return 'default-model';
        return null;
      });

      const axiosResponse: AxiosResponse = {
        data: {
          choices: [{ message: { content: 'response' } }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await service.callAPI(prompt, 'job_analysis', customModel);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: customModel,
        }),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for invalid operation type', async () => {
      await expect(
        service.callAPI('test', 'invalid_operation' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when API key is missing', async () => {
      mockConfigService.get.mockReturnValue(null);

      await expect(
        service.callAPI('test', 'job_analysis'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when model is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ai.jobAnalysisApiKey') return 'test-key';
        return null;
      });

      await expect(
        service.callAPI('test', 'job_analysis'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle API errors gracefully', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ai.jobAnalysisApiKey') return 'test-key';
        if (key === 'ai.jobAnalysisModel') return 'test-model';
        return null;
      });

      const error = new Error('Network error');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      await expect(
        service.callAPI('test', 'job_analysis'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should work with all operation types', async () => {
      const operationTypes = ['job_analysis', 'cover_letter', 'resume', 'page_scraper'] as const;

      for (const operationType of operationTypes) {
        mockConfigService.get.mockImplementation((key: string) => {
          if (key.includes('ApiKey')) return 'test-key';
          if (key.includes('Model')) return 'test-model';
          return null;
        });

        const axiosResponse: AxiosResponse = {
          data: {
            choices: [{ message: { content: 'response' } }],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        mockHttpService.post.mockReturnValue(of(axiosResponse));

        const result = await service.callAPI('test', operationType);
        expect(result).toBe('response');
      }
    });
  });
});
