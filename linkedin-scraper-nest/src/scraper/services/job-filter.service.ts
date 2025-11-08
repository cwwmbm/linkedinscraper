import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { franc } from 'franc';

export interface FilterResult {
  passed: boolean;
  reason?: string;
}

export interface JobToFilter {
  title: string;
  company: string;
  location: string;
  job_description?: string;
}

@Injectable()
export class JobFilterService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Apply all filters to a job
   * @param job Job data to filter
   * @returns FilterResult indicating whether job passed filters
   */
  filterJob(job: JobToFilter): FilterResult {
    // Title exclude filter
    const titleExcludeResult = this.filterTitleExclude(job.title);
    if (!titleExcludeResult.passed) {
      return titleExcludeResult;
    }

    // Title include filter (if configured)
    const titleIncludeResult = this.filterTitleInclude(job.title);
    if (!titleIncludeResult.passed) {
      return titleIncludeResult;
    }

    // Company exclude filter
    const companyResult = this.filterCompany(job.company);
    if (!companyResult.passed) {
      return companyResult;
    }

    // Country/location exclude filter
    const locationResult = this.filterLocation(job.location);
    if (!locationResult.passed) {
      return locationResult;
    }

    // Description keywords filter (if description is provided)
    if (job.job_description) {
      const descriptionResult = this.filterDescription(job.job_description);
      if (!descriptionResult.passed) {
        return descriptionResult;
      }

      // Language detection (if description is provided)
      const languageResult = this.filterLanguage(job.job_description);
      if (!languageResult.passed) {
        return languageResult;
      }
    }

    return { passed: true };
  }

  /**
   * Filter by title exclusions
   */
  private filterTitleExclude(title: string): FilterResult {
    const titleExclude = this.configService.get<string[]>('filters.titleExclude', []);

    if (titleExclude.length === 0) {
      return { passed: true };
    }

    // Handle null/undefined title
    if (!title) {
      return { passed: true };
    }

    const matchedWords = titleExclude.filter((word) =>
      title.toLowerCase().includes(word.toLowerCase()),
    );

    if (matchedWords.length > 0) {
      return {
        passed: false,
        reason: `Contains excluded keyword in title: ${JSON.stringify(matchedWords)}`,
      };
    }

    return { passed: true };
  }

  /**
   * Filter by title inclusions (if configured, job must contain at least one)
   */
  private filterTitleInclude(title: string): FilterResult {
    const titleInclude = this.configService.get<string[]>('filters.titleInclude', []);

    if (titleInclude.length === 0) {
      return { passed: true };
    }

    // Handle null/undefined title
    if (!title) {
      return {
        passed: false,
        reason: `Title is required but missing`,
      };
    }

    const hasMatch = titleInclude.some((word) =>
      title.toLowerCase().includes(word.toLowerCase()),
    );

    if (!hasMatch) {
      return {
        passed: false,
        reason: `Does not contain any required title keyword from: ${JSON.stringify(titleInclude)}`,
      };
    }

    return { passed: true };
  }

  /**
   * Filter by company exclusions
   */
  private filterCompany(company: string): FilterResult {
    const companyExclude = this.configService.get<string[]>('filters.companyExclude', []);

    if (companyExclude.length === 0) {
      return { passed: true };
    }

    // Handle null/undefined company
    if (!company) {
      return { passed: true };
    }

    const matchedCompanies = companyExclude.filter((excludedCompany) =>
      company.toLowerCase().includes(excludedCompany.toLowerCase()),
    );

    if (matchedCompanies.length > 0) {
      return {
        passed: false,
        reason: `Contains excluded company: ${JSON.stringify(matchedCompanies)}`,
      };
    }

    return { passed: true };
  }

  /**
   * Filter by location/country exclusions
   */
  private filterLocation(location: string): FilterResult {
    const countryExclude = this.configService.get<string[]>('filters.countryExclude', []);

    if (countryExclude.length === 0) {
      return { passed: true };
    }

    // Handle null/undefined location
    if (!location) {
      return { passed: true };
    }

    const matchedCountries = countryExclude.filter((excludedCountry) =>
      location.toLowerCase().includes(excludedCountry.toLowerCase()),
    );

    if (matchedCountries.length > 0) {
      return {
        passed: false,
        reason: `Contains excluded location: ${JSON.stringify(matchedCountries)}`,
      };
    }

    return { passed: true };
  }

  /**
   * Filter by description keywords (job must contain at least one if configured)
   */
  private filterDescription(description: string): FilterResult {
    const descWords = this.configService.get<string[]>('filters.descWords', []);

    if (descWords.length === 0) {
      return { passed: true };
    }

    // Handle null/undefined description
    if (!description) {
      return {
        passed: false,
        reason: `Description is required but missing`,
      };
    }

    const hasMatch = descWords.some((word) =>
      description.toLowerCase().includes(word.toLowerCase()),
    );

    if (!hasMatch) {
      return {
        passed: false,
        reason: `Description does not contain any required keyword from: ${JSON.stringify(descWords)}`,
      };
    }

    return { passed: true };
  }

  /**
   * Filter by language detection
   */
  private filterLanguage(description: string): FilterResult {
    const allowedLanguages = this.configService.get<string[]>('filters.languages', ['en']);

    if (allowedLanguages.length === 0) {
      return { passed: true };
    }

    try {
      // Use franc for language detection
      const detectedLang = franc(description, { minLength: 50 });

      // franc returns ISO 639-3 codes, but we use ISO 639-1 in config
      // Map common codes
      const langMap: Record<string, string> = {
        eng: 'en',
        nld: 'nl',
        fra: 'fr',
        ita: 'it',
        deu: 'de',
        spa: 'es',
        por: 'pt',
      };

      const mappedLang = langMap[detectedLang] || detectedLang;

      if (!allowedLanguages.includes(mappedLang)) {
        return {
          passed: false,
          reason: `Language '${mappedLang}' not in allowed languages: ${JSON.stringify(allowedLanguages)}`,
        };
      }

      return { passed: true };
    } catch (error) {
      // If language detection fails, pass the job
      console.warn('Language detection failed:', error.message);
      return { passed: true };
    }
  }
}
