import { IsOptional, IsBoolean, IsInt, IsIn, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JobQueryDto {
  // Filtering
  @ApiPropertyOptional({ description: 'Include hidden jobs (default: false)', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hidden?: boolean = false;

  @ApiPropertyOptional({ description: 'Filter by applied status', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  applied?: boolean;

  @ApiPropertyOptional({ description: 'Filter by interview status', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  interview?: boolean;

  @ApiPropertyOptional({ description: 'Filter by rejected status', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  rejected?: boolean;

  @ApiPropertyOptional({ description: 'Filter by blocked status', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  blocked?: boolean;

  // Pagination
  @ApiPropertyOptional({ description: 'Number of results (default: 100, max: 1000)', type: Number })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 100;

  @ApiPropertyOptional({ description: 'Pagination offset (default: 0)', type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;

  // Sorting
  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['id', 'date', 'company', 'title', 'date_loaded'],
    default: 'id'
  })
  @IsOptional()
  @IsIn(['id', 'date', 'company', 'title', 'date_loaded'])
  sort?: string = 'id';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC'
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
