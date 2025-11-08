import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportJobsDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'json'],
    default: 'csv',
    required: false,
  })
  @IsEnum(['csv', 'json'])
  @IsOptional()
  format?: 'csv' | 'json' = 'csv';

  @ApiProperty({
    description: 'Filter: all, visible, or hidden',
    enum: ['all', 'visible', 'hidden'],
    default: 'all',
    required: false,
  })
  @IsEnum(['all', 'visible', 'hidden'])
  @IsOptional()
  filter?: 'all' | 'visible' | 'hidden' = 'all';
}
