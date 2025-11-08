import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Job } from './entities/job.entity';
import { FilteredJob } from './entities/filtered-job.entity';
import { NotFoundException } from '@nestjs/common';
import { JobQueryDto } from './dto/job-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

describe('JobsService', () => {
  let service: JobsService;
  let jobsRepository: Repository<Job>;
  let filteredJobsRepository: Repository<FilteredJob>;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockJobsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockFilteredJobsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(Job),
          useValue: mockJobsRepository,
        },
        {
          provide: getRepositoryToken(FilteredJob),
          useValue: mockFilteredJobsRepository,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jobsRepository = module.get<Repository<Job>>(getRepositoryToken(Job));
    filteredJobsRepository = module.get<Repository<FilteredJob>>(
      getRepositoryToken(FilteredJob),
    );

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated jobs with defaults', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Software Engineer',
          company: 'Tech Corp',
          hidden: 0,
        },
        {
          id: 2,
          title: 'Frontend Developer',
          company: 'Web Inc',
          hidden: 0,
        },
      ];

      const query: JobQueryDto = {
        limit: 100,
        offset: 0,
        sort: 'id',
        order: 'DESC',
      };

      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue(mockJobs);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: mockJobs,
        total: 2,
        limit: 100,
        offset: 0,
      });
      expect(mockJobsRepository.createQueryBuilder).toHaveBeenCalledWith('job');
    });

    it('should filter by hidden status', async () => {
      const query: JobQueryDto = {
        hidden: false,
        limit: 100,
        offset: 0,
        sort: 'id',
        order: 'DESC',
      };

      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'job.hidden = :hidden',
        { hidden: 0 },
      );
    });

    it('should filter by applied status', async () => {
      const query: JobQueryDto = {
        applied: true,
        limit: 100,
        offset: 0,
        sort: 'id',
        order: 'DESC',
      };

      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'job.applied = :applied',
        { applied: 1 },
      );
    });

    it('should filter by search term', async () => {
      const query: JobQueryDto = {
        search: 'engineer',
        limit: 100,
        offset: 0,
        sort: 'id',
        order: 'DESC',
      };

      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(job.title) LIKE :search'),
        { search: '%engineer%' },
      );
    });

    it('should apply pagination correctly', async () => {
      const query: JobQueryDto = {
        limit: 10,
        offset: 20,
        sort: 'title',
        order: 'ASC',
      };

      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(query);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('job.title', 'ASC');
    });
  });

  describe('findOne', () => {
    it('should return a job by id', async () => {
      const mockJob = {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
      };

      mockJobsRepository.findOne.mockResolvedValue(mockJob);

      const result = await service.findOne(1);

      expect(result).toEqual(mockJob);
      expect(mockJobsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when job not found', async () => {
      mockJobsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save a new job', async () => {
      const createJobDto: CreateJobDto = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco',
        job_url: 'https://example.com/job/1',
        job_description: 'Great opportunity',
      };

      const mockCreatedJob = {
        ...createJobDto,
        id: 1,
        date_loaded: new Date().toISOString(),
      };

      mockJobsRepository.create.mockReturnValue(mockCreatedJob);
      mockJobsRepository.save.mockResolvedValue(mockCreatedJob);

      const result = await service.create(createJobDto);

      expect(result).toEqual(mockCreatedJob);
      expect(mockJobsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createJobDto,
          date_loaded: expect.any(String),
        }),
      );
      expect(mockJobsRepository.save).toHaveBeenCalledWith(mockCreatedJob);
    });
  });

  describe('update', () => {
    it('should update a job', async () => {
      const mockJob = {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        applied: 0,
        interview: 0,
        rejected: 0,
        blocked: 0,
      };

      const updateJobDto: UpdateJobDto = {
        applied: 1,
      };

      mockJobsRepository.findOne.mockResolvedValue(mockJob);
      mockJobsRepository.save.mockResolvedValue({
        ...mockJob,
        ...updateJobDto,
      });

      const result = await service.update(1, updateJobDto);

      expect(mockJobsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockJobsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent job', async () => {
      mockJobsRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a job', async () => {
      const mockJob = {
        id: 1,
        title: 'Software Engineer',
      };

      mockJobsRepository.findOne.mockResolvedValue(mockJob);
      mockJobsRepository.remove.mockResolvedValue(mockJob);

      const result = await service.remove(1);

      expect(mockJobsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockJobsRepository.remove).toHaveBeenCalledWith(mockJob);
    });
  });
});
