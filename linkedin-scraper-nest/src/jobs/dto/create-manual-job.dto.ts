import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManualJobDto {
  @ApiPropertyOptional({
    description: 'Job title (AI will extract if not provided)',
    example: 'Senior Backend Developer'
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Company name (AI will extract if not provided)',
    example: 'Acme Inc.'
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description: 'Job location (AI will extract if not provided)',
    example: 'Remote, New York, USA'
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Job description text (required). AI will extract missing fields from this.',
    example: 'We are looking for a Senior Backend Developer with 5+ years experience in Node.js...'
  })
  @IsNotEmpty({ message: 'Job description is required' })
  @IsString()
  job_description: string;

  @ApiPropertyOptional({
    description: 'Job URL (optional)',
    example: 'https://example.com/careers/123'
  })
  @IsOptional()
  @IsString()
  job_url?: string;
}
