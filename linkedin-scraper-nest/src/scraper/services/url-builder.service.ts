import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchQuery {
  keywords: string;
  location: string;
  f_WT?: string; // Work type (1=Onsite, 2=Remote, 3=Hybrid)
  f_JT?: string; // Job type (F=Full-time, P=Part-time, C=Contract, T=Temporary, I=Internship, V=Volunteer, O=Other)
  f_TPR?: string; // Time posted recently (r86400=24h, r604800=week, r2592000=month)
  [key: string]: string | undefined; // Allow additional LinkedIn filter parameters
}

@Injectable()
export class UrlBuilderService {
  private readonly BASE_URL = 'https://www.linkedin.com/jobs/search/';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Build a LinkedIn job search URL from a search query
   * @param query Search query parameters
   * @param start Pagination start (default: 0)
   * @returns Full LinkedIn search URL
   */
  buildSearchUrl(query: SearchQuery, start = 0): string {
    const params = new URLSearchParams();

    // Add keywords
    if (query.keywords) {
      params.append('keywords', query.keywords);
    }

    // Add location
    if (query.location) {
      params.append('location', query.location);
    }

    // Add work type filter (f_WT)
    if (query.f_WT) {
      params.append('f_WT', query.f_WT);
    }

    // Add job type filter (f_JT)
    if (query.f_JT) {
      params.append('f_JT', query.f_JT);
    }

    // Add time posted filter (f_TPR)
    if (query.f_TPR) {
      params.append('f_TPR', query.f_TPR);
    }

    // Add any other filter parameters
    Object.keys(query).forEach((key) => {
      if (!['keywords', 'location', 'f_WT', 'f_JT', 'f_TPR'].includes(key) && query[key]) {
        params.append(key, query[key] as string);
      }
    });

    // Add pagination
    if (start > 0) {
      params.append('start', start.toString());
    }

    return `${this.BASE_URL}?${params.toString()}`;
  }

  /**
   * Get all search queries from configuration
   * @returns Array of search queries
   */
  getSearchQueries(): SearchQuery[] {
    return this.configService.get<SearchQuery[]>('scraper.searchQueries', []);
  }

  /**
   * Get timespan from configuration
   * @returns Timespan string (e.g., 'r5256000' for 2 months)
   */
  getTimespan(): string {
    return this.configService.get<string>('scraper.timespan', 'r5256000');
  }

  /**
   * Get number of pages to scrape from configuration
   * @returns Number of pages
   */
  getPagesToScrape(): number {
    return this.configService.get<number>('scraper.pagesToScrape', 10);
  }

  /**
   * Get scraper rounds from configuration
   * @returns Number of rounds
   */
  getRounds(): number {
    return this.configService.get<number>('scraper.rounds', 1);
  }

  /**
   * Get days to scrape from configuration
   * @returns Number of days
   */
  getDaysToScrape(): number {
    return this.configService.get<number>('scraper.daysToScrape', 10);
  }

  /**
   * Build all search URLs from configuration
   * @returns Array of search URLs for each query
   */
  buildAllSearchUrls(): string[] {
    const queries = this.getSearchQueries();
    const timespan = this.getTimespan();

    return queries.map((query) => {
      // Add timespan if not already present
      const queryWithTimespan = {
        ...query,
        f_TPR: query.f_TPR || timespan,
      };

      return this.buildSearchUrl(queryWithTimespan);
    });
  }

  /**
   * Build paginated URLs for a single query
   * @param query Search query
   * @param numPages Number of pages
   * @returns Array of URLs with pagination
   */
  buildPaginatedUrls(query: SearchQuery, numPages: number): string[] {
    const urls: string[] = [];
    const resultsPerPage = 25; // LinkedIn shows 25 jobs per page

    for (let page = 0; page < numPages; page++) {
      const start = page * resultsPerPage;
      urls.push(this.buildSearchUrl(query, start));
    }

    return urls;
  }
}
