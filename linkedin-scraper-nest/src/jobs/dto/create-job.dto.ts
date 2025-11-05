import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ description: 'Job title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Company name' })
  @IsString()
  company: string;

  @ApiProperty({ description: 'Job location' })
  @IsString()
  location: string;

  @ApiPropertyOptional({ description: 'Job posting date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ description: 'Job URL' })
  @IsString()
  job_url: string;

  @ApiPropertyOptional({ description: 'Job description' })
  @IsOptional()
  @IsString()
  job_description?: string;

  @ApiPropertyOptional({ description: 'Applied status (0 or 1)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  applied?: number = 0;

  @ApiPropertyOptional({ description: 'Hidden status (0 or 1)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  hidden?: number = 0;

  @ApiPropertyOptional({ description: 'Interview status (0 or 1)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  interview?: number = 0;

  @ApiPropertyOptional({ description: 'Rejected status (0 or 1)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  rejected?: number = 0;

  @ApiPropertyOptional({ description: 'Blocked status (0 or 1)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  blocked?: number = 0;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
