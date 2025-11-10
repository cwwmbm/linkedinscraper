import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { JobsService } from './jobs.service';
import { JobQueryDto } from './dto/job-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateManualJobDto } from './dto/create-manual-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobAnalyzerService } from '../ai/services/job-analyzer.service';
import { CoverLetterService } from '../ai/services/cover-letter.service';
import { ResumeTailorService } from '../ai/services/resume-tailor.service';
import { QueueService } from '../queue/queue.service';
import { ManualJobCreatorService } from './services/manual-job-creator.service';
import { PdfGeneratorService } from '../files/services/pdf-generator.service';
import { AnalyzeJobDto, JobAnalysisResultDto } from '../ai/dto/job-analysis.dto';
import { GenerateCoverLetterDto, CoverLetterResponseDto } from '../ai/dto/cover-letter.dto';
import { TailorResumeDto, TailoredResumeResponseDto } from '../ai/dto/resume.dto';

@Controller('jobs')
@ApiTags('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobAnalyzerService: JobAnalyzerService,
    private readonly coverLetterService: CoverLetterService,
    private readonly resumeTailorService: ResumeTailorService,
    private readonly queueService: QueueService,
    private readonly manualJobCreatorService: ManualJobCreatorService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all jobs with filtering and pagination',
    description: 'Get a paginated list of jobs with optional filtering by status fields. By default, hidden jobs are excluded.'
  })
  @ApiQuery({ name: 'hidden', required: false, type: Boolean, description: 'Include hidden jobs (default: false)' })
  @ApiQuery({ name: 'applied', required: false, type: Boolean, description: 'Filter by applied status' })
  @ApiQuery({ name: 'interview', required: false, type: Boolean, description: 'Filter by interview status' })
  @ApiQuery({ name: 'rejected', required: false, type: Boolean, description: 'Filter by rejected status' })
  @ApiQuery({ name: 'blocked', required: false, type: Boolean, description: 'Filter by blocked status' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 100, max: 1000)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset (default: 0)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['id', 'date', 'company', 'title', 'date_loaded'], description: 'Sort field (default: id)' })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' })
  @ApiResponse({ status: 200, description: 'Returns paginated jobs with total count' })
  async findAll(@Query() query: JobQueryDto) {
    return this.jobsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get job statistics',
    description: 'Returns counts for all job status categories'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns statistics',
    schema: {
      example: {
        total: 399,
        not_hidden: 127,
        applied: 95,
        interview: 1,
        rejected: 14,
        blocked: 9
      }
    }
  })
  async getStats() {
    return this.jobsService.getStats();
  }

  @Post(':id/analysis')
  @ApiOperation({
    summary: 'Analyze a job description',
    description: `Queue a background job to analyze a job description using predefined questions from configuration.

The analysis results are stored in the job's metadata field once completed.
Each question from the configuration is sent to the AI model with the job description.

Returns a job ID for tracking progress via GET /scraper/jobs/:jobId.

**Note**: Analysis may take several seconds depending on the number of analysis questions configured.`
  })
  @ApiParam({ name: 'id', description: 'Job ID to analyze', type: Number })
  @ApiBody({ type: AnalyzeJobDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Analysis job queued successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Queue job ID for tracking' },
        message: { type: 'string', description: 'Status message' },
        targetJobId: { type: 'number', description: 'Job ID being analyzed' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 400, description: 'Job has no description or no analysis questions configured' })
  async analyzeJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() analyzeJobDto?: AnalyzeJobDto,
  ) {
    const job = await this.queueService.addAnalyzeSingleJob(id, analyzeJobDto?.model);
    return {
      jobId: job.id,
      message: 'Job analysis queued successfully',
      targetJobId: id,
    };
  }

  @Post(':id/cover-letter')
  @ApiOperation({
    summary: 'Generate a cover letter for a job',
    description: `Generate a tailored cover letter using a 2-pass AI approach:

**Pass 1**: Experienced career coach (15 years) creates initial draft focusing on:
- Identifying main challenges of the role
- Writing attention-grabbing hook (100 words)
- Complete cover letter (250 words total)

**Pass 2**: Young career coach improves the draft:
- Adjusts formality from 10 to 7
- Identifies 3-5 improvements
- Avoids subjective qualifiers
- Final version within 250 words

The generated cover letter is stored in the job's cover_letter field.

**Note**: This operation may take 30-60 seconds due to the 2-pass generation process.`
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiBody({ type: GenerateCoverLetterDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Cover letter generated successfully',
    schema: {
      example: {
        cover_letter: 'Dear Hiring Manager,\n\nAs a seasoned backend developer...'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 400, description: 'Job has no description or resume not found' })
  async generateCoverLetter(
    @Param('id', ParseIntPipe) id: number,
    @Body() generateCoverLetterDto?: GenerateCoverLetterDto,
  ) {
    const coverLetter = await this.coverLetterService.generateCoverLetter(
      id,
      generateCoverLetterDto?.model,
    );
    return { cover_letter: coverLetter };
  }

  @Get(':id/cover-letter')
  @ApiOperation({
    summary: 'Get existing cover letter for a job',
    description: 'Retrieve the previously generated cover letter for a job.'
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns the cover letter',
    schema: {
      example: {
        cover_letter: 'Dear Hiring Manager,\n\nAs a seasoned backend developer...'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job or cover letter not found' })
  async getCoverLetter(@Param('id', ParseIntPipe) id: number) {
    const coverLetter = await this.coverLetterService.getCoverLetter(id);
    return { cover_letter: coverLetter };
  }

  @Post(':id/resume')
  @ApiOperation({
    summary: 'Generate a tailored resume for a job',
    description: `Tailor your resume for a specific job using AI career coach approach:

**Process**:
1. Identify 3-5 most important responsibilities from job description
2. Tailor resume to highlight relevant experience for those responsibilities
3. Preserve factual accuracy (no made-up information)
4. Return final tailored resume only

The tailored resume is stored in the job's resume field.

**Note**: This operation may take 20-40 seconds.`
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiBody({ type: TailorResumeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Resume tailored successfully',
    schema: {
      example: {
        resume: 'PROFESSIONAL SUMMARY\n\nExperienced Backend Developer...'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 400, description: 'Job has no description or resume not found' })
  async generateTailoredResume(
    @Param('id', ParseIntPipe) id: number,
    @Body() tailorResumeDto?: TailorResumeDto,
  ) {
    const resume = await this.resumeTailorService.generateTailoredResume(
      id,
      tailorResumeDto?.model,
    );
    return { resume };
  }

  @Get(':id/resume')
  @ApiOperation({
    summary: 'Get existing tailored resume for a job',
    description: 'Retrieve the previously generated tailored resume for a job.'
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns the tailored resume',
    schema: {
      example: {
        resume: 'PROFESSIONAL SUMMARY\n\nExperienced Backend Developer...'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job or tailored resume not found' })
  async getTailoredResume(@Param('id', ParseIntPipe) id: number) {
    const resume = await this.resumeTailorService.getTailoredResume(id);
    return { resume };
  }

  @Get(':id/resume/pdf')
  @ApiOperation({
    summary: 'Download tailored resume as PDF',
    description: `Generate and download the tailored resume as a professionally formatted PDF document.

**Features:**
- Professional formatting with proper typography
- Clean, ATS-friendly layout
- Includes job title and company information in header
- Converts markdown formatting to styled HTML

**Requirements:**
- Resume must be generated first (POST /api/jobs/:id/resume)

**Note:** PDF generation may take a few seconds on first request.`
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns PDF file',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job or resume not found' })
  async downloadResumePdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const job = await this.jobsService.findOne(id);
    const pdfBuffer = await this.pdfGeneratorService.generateResumePdf(id);

    const filename = `resume_${job.company.replace(/[^a-z0-9]/gi, '_')}_${job.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get(':id/cover-letter/pdf')
  @ApiOperation({
    summary: 'Download cover letter as PDF',
    description: `Generate and download the cover letter as a professionally formatted PDF document.

**Features:**
- Professional business letter format
- Serif font (Georgia) for formal appearance
- Includes date, company address, and greeting
- Proper spacing and margins

**Requirements:**
- Cover letter must be generated first (POST /api/jobs/:id/cover-letter)

**Note:** PDF generation may take a few seconds on first request.`
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns PDF file',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job or cover letter not found' })
  async downloadCoverLetterPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const job = await this.jobsService.findOne(id);
    const pdfBuffer = await this.pdfGeneratorService.generateCoverLetterPdf(id);

    const filename = `cover_letter_${job.company.replace(/[^a-z0-9]/gi, '_')}_${job.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns the job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new job',
    description: 'Create a new job entry. The date_loaded field is automatically set to the current timestamp.'
  })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Create a job manually with AI field extraction',
    description: `Create a new job entry by providing a job description. Optionally provide title, company, or location.

**How it works:**
1. User provides job description (required) and optionally title, company, location
2. AI extracts any missing fields from the description text
3. Job is created in the database
4. Job is automatically analyzed with predefined questions
5. Returns the complete job with analysis results

**Field Priority:**
- User-provided fields always take precedence over AI-extracted fields
- AI only fills in missing fields
- If AI cannot extract a field, defaults are used (e.g., "Unknown Title")

**Note:** This operation may take 20-40 seconds due to AI extraction and analysis.`
  })
  @ApiBody({ type: CreateManualJobDto })
  @ApiResponse({
    status: 201,
    description: 'Job created successfully with automatic analysis',
    schema: {
      example: {
        id: 123,
        title: 'Senior Backend Developer',
        company: 'Acme Inc.',
        location: 'Remote, USA',
        date: '2025-10-27',
        job_url: '',
        job_description: 'We are looking for...',
        applied: 0,
        hidden: 0,
        interview: 0,
        rejected: 0,
        blocked: 0,
        date_loaded: '2025-10-27T10:30:00.000Z',
        metadata: '{"Rate": "€500-600/day", "Remote from Belgium?": "Yes"}',
        notes: null,
        cover_letter: null,
        resume: null
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input or AI extraction failed' })
  async createManual(@Body() createManualJobDto: CreateManualJobDto) {
    return this.manualJobCreatorService.createManualJob(createManualJobDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a job (full replacement)',
    description: 'Replace all job fields. Mutual exclusivity applies to status fields (applied, interview, rejected, blocked).'
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJobDto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, updateJobDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update a job',
    description: `Update specific job fields. Supports updating any field including hidden, applied, interview, rejected, blocked, and notes.

**Mutual Exclusivity:** Status fields (applied, interview, rejected, blocked) are mutually exclusive.
When you set one to true/1, all others are automatically set to false/0.

**Examples:**
- Mark as applied: \`{ "applied": true }\` → clears interview, rejected, blocked
- Mark for interview: \`{ "interview": true }\` → clears applied, rejected, blocked
- Hide job: \`{ "hidden": true }\`
- Update notes: \`{ "notes": "Applied via LinkedIn" }\`
- Multiple updates: \`{ "applied": true, "notes": "Applied today" }\``
  })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() patchJobDto: Partial<UpdateJobDto>,
  ) {
    return this.jobsService.patch(id, patchJobDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a job' })
  @ApiParam({ name: 'id', description: 'Job ID', type: Number })
  @ApiResponse({ status: 204, description: 'Job deleted successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.jobsService.remove(id);
  }
}
