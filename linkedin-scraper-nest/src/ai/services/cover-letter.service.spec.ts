import { Test, TestingModule } from '@nestjs/testing';
import { CoverLetterService } from './cover-letter.service';

describe('CoverLetterService', () => {
  let service: CoverLetterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoverLetterService],
    }).compile();

    service = module.get<CoverLetterService>(CoverLetterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
