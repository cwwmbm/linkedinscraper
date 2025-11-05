import { Test, TestingModule } from '@nestjs/testing';
import { JobAnalyzerService } from './job-analyzer.service';

describe('JobAnalyzerService', () => {
  let service: JobAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobAnalyzerService],
    }).compile();

    service = module.get<JobAnalyzerService>(JobAnalyzerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
