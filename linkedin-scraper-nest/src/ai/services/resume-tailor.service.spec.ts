import { Test, TestingModule } from '@nestjs/testing';
import { ResumeTailorService } from './resume-tailor.service';

describe('ResumeTailorService', () => {
  let service: ResumeTailorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResumeTailorService],
    }).compile();

    service = module.get<ResumeTailorService>(ResumeTailorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
