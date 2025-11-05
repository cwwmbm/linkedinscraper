// Simple test script for scraper services
import { ConfigService } from '@nestjs/config';
import { JobFilterService } from './src/scraper/services/job-filter.service';
import { UrlBuilderService } from './src/scraper/services/url-builder.service';
import configuration from './src/config/configuration';

// Mock ConfigService
const mockConfig = configuration();
const configService = {
  get: (key: string, defaultValue?: any) => {
    const keys = key.split('.');
    let value: any = mockConfig;
    for (const k of keys) {
      value = value?.[k];
    }
    return value !== undefined ? value : defaultValue;
  },
} as unknown as ConfigService;

// Test JobFilterService
console.log('=== Testing JobFilterService ===\n');
const filterService = new JobFilterService(configService);

// Test 1: Job that should pass all filters
const goodJob = {
  title: 'Backend Developer',
  company: 'Tech Corp',
  location: 'Belgium',
  job_description: 'We are looking for a backend developer with experience in Node.js and TypeScript.',
};

console.log('Test 1: Good job (should pass)');
console.log('Job:', goodJob);
const result1 = filterService.filterJob(goodJob);
console.log('Result:', result1, '\n');

// Test 2: Job with excluded title
const excludedTitleJob = {
  title: 'Frontend Developer', // 'Frontend' is in title_exclude
  company: 'Tech Corp',
  location: 'Belgium',
};

console.log('Test 2: Job with excluded title (should fail)');
console.log('Job:', excludedTitleJob);
const result2 = filterService.filterJob(excludedTitleJob);
console.log('Result:', result2, '\n');

// Test 3: Job with excluded company
const excludedCompanyJob = {
  title: 'Backend Developer',
  company: 'Bending Spoons', // In company_exclude
  location: 'Belgium',
};

console.log('Test 3: Job with excluded company (should fail)');
console.log('Job:', excludedCompanyJob);
const result3 = filterService.filterJob(excludedCompanyJob);
console.log('Result:', result3, '\n');

// Test 4: Job with excluded location
const excludedLocationJob = {
  title: 'Backend Developer',
  company: 'Tech Corp',
  location: 'Poland', // In country_exclude
};

console.log('Test 4: Job with excluded location (should fail)');
console.log('Job:', excludedLocationJob);
const result4 = filterService.filterJob(excludedLocationJob);
console.log('Result:', result4, '\n');

// Test UrlBuilderService
console.log('=== Testing UrlBuilderService ===\n');
const urlService = new UrlBuilderService(configService);

// Test 1: Build search URL
const query = {
  keywords: 'backend developer',
  location: 'Belgium',
  f_WT: '1', // Onsite
  f_JT: 'F', // Full-time
};

console.log('Test 1: Build search URL');
console.log('Query:', query);
const url = urlService.buildSearchUrl(query);
console.log('URL:', url, '\n');

// Test 2: Build paginated URLs
console.log('Test 2: Build paginated URLs (3 pages)');
const paginatedUrls = urlService.buildPaginatedUrls(query, 3);
paginatedUrls.forEach((url, index) => {
  console.log(`Page ${index + 1}:`, url);
});
console.log();

// Test 3: Get search queries from config
console.log('Test 3: Get search queries from config');
const searchQueries = urlService.getSearchQueries();
console.log(`Found ${searchQueries.length} search queries`);
if (searchQueries.length > 0) {
  console.log('First query:', searchQueries[0]);
}
console.log();

// Test 4: Build all search URLs from config
console.log('Test 4: Build all search URLs from config');
const allUrls = urlService.buildAllSearchUrls();
console.log(`Generated ${allUrls.length} URLs`);
if (allUrls.length > 0) {
  console.log('First URL:', allUrls[0]);
}

console.log('\n=== Tests Complete ===');
