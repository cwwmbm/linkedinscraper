import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class GenerateCoverLetterDto {
  @ApiPropertyOptional({ description: 'Optional model override' })
  @IsOptional()
  @IsString()
  model?: string;
}

export class CoverLetterResponseDto {
  @ApiProperty({ description: 'Generated cover letter' })
  @IsString()
  coverLetter: string;

  @ApiProperty({ description: 'Job ID' })
  jobId: number;
}
