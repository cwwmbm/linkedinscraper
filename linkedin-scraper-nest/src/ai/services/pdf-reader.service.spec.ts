import { Test, TestingModule } from '@nestjs/testing';
import { PdfReaderService } from './pdf-reader.service';

describe('PdfReaderService', () => {
  let service: PdfReaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfReaderService],
    }).compile();

    service = module.get<PdfReaderService>(PdfReaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
