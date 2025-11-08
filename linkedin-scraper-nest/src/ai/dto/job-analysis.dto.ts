import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class AnalyzeJobDto {
  @ApiPropertyOptional({ description: 'Optional model override' })
  @IsOptional()
  @IsString()
  model?: string;
}

export class JobAnalysisResultDto {
  @ApiProperty({ description: 'Analysis results as JSON object' })
  @IsObject()
  analysis: Record<string, any>;

  @ApiProperty({ description: 'Job ID that was analyzed' })
  jobId: number;
}
