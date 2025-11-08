import { IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScrapeSingleDto {
  @ApiProperty({
    description: 'URL of the job posting to scrape',
    example: 'https://www.linkedin.com/jobs/view/1234567890/',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
