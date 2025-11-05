import { Test, TestingModule } from '@nestjs/testing';
import { OpenrouterService } from './openrouter.service';

describe('OpenrouterService', () => {
  let service: OpenrouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenrouterService],
    }).compile();

    service = module.get<OpenrouterService>(OpenrouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
