import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class TailorResumeDto {
  @ApiPropertyOptional({ description: 'Optional model override' })
  @IsOptional()
  @IsString()
  model?: string;
}

export class TailoredResumeResponseDto {
  @ApiProperty({ description: 'Tailored resume content' })
  @IsString()
  resume: string;

  @ApiProperty({ description: 'Job ID' })
  jobId: number;
}
