import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto {
  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Job location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Job posting date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Job URL' })
  @IsOptional()
  @IsString()
  job_url?: string;

  @ApiPropertyOptional({ description: 'Job description' })
  @IsOptional()
  @IsString()
  job_description?: string;

  @ApiPropertyOptional({ description: 'Applied status (boolean or 0/1)', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value === 'true' || value === 1 ? 1 : 0;
  })
  applied?: number;

  @ApiPropertyOptional({ description: 'Hidden status (boolean or 0/1)', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value === 'true' || value === 1 ? 1 : 0;
  })
  hidden?: number;

  @ApiPropertyOptional({ description: 'Interview status (boolean or 0/1)', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value === 'true' || value === 1 ? 1 : 0;
  })
  interview?: number;

  @ApiPropertyOptional({ description: 'Rejected status (boolean or 0/1)', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value === 'true' || value === 1 ? 1 : 0;
  })
  rejected?: number;

  @ApiPropertyOptional({ description: 'Blocked status (boolean or 0/1)', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value === 'true' || value === 1 ? 1 : 0;
  })
  blocked?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Cover letter' })
  @IsOptional()
  @IsString()
  cover_letter?: string;

  @ApiPropertyOptional({ description: 'Tailored resume' })
  @IsOptional()
  @IsString()
  resume?: string;

  @ApiPropertyOptional({ description: 'Metadata (JSON string)' })
  @IsOptional()
  @IsString()
  metadata?: string;
}
