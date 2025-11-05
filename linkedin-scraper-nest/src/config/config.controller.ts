import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller('config')
@ApiTags('config')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get sanitized configuration for frontend' })
  getConfig() {
    // Return only safe config (no API keys)
    return {
      analysis_questions: this.configService.get('ai.analysisQuestions'),
      filters: {
        title_exclude: this.configService.get('filters.titleExclude'),
        title_include: this.configService.get('filters.titleInclude'),
        company_exclude: this.configService.get('filters.companyExclude'),
        country_exclude: this.configService.get('filters.countryExclude'),
        languages: this.configService.get('filters.languages'),
      },
      scraper: {
        pages_to_scrape: this.configService.get('scraper.pagesToScrape'),
        rounds: this.configService.get('scraper.rounds'),
        days_to_scrape: this.configService.get('scraper.daysToScrape'),
        timespan: this.configService.get('scraper.timespan'),
      },
    };
  }
}
