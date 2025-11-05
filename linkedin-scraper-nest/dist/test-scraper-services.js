"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const job_filter_service_1 = require("./src/scraper/services/job-filter.service");
const url_builder_service_1 = require("./src/scraper/services/url-builder.service");
const configuration_1 = __importDefault(require("./src/config/configuration"));
const mockConfig = (0, configuration_1.default)();
const configService = {
    get: (key, defaultValue) => {
        const keys = key.split('.');
        let value = mockConfig;
        for (const k of keys) {
            value = value?.[k];
        }
        return value !== undefined ? value : defaultValue;
    },
};
console.log('=== Testing JobFilterService ===\n');
const filterService = new job_filter_service_1.JobFilterService(configService);
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
const excludedTitleJob = {
    title: 'Frontend Developer',
    company: 'Tech Corp',
    location: 'Belgium',
};
console.log('Test 2: Job with excluded title (should fail)');
console.log('Job:', excludedTitleJob);
const result2 = filterService.filterJob(excludedTitleJob);
console.log('Result:', result2, '\n');
const excludedCompanyJob = {
    title: 'Backend Developer',
    company: 'Bending Spoons',
    location: 'Belgium',
};
console.log('Test 3: Job with excluded company (should fail)');
console.log('Job:', excludedCompanyJob);
const result3 = filterService.filterJob(excludedCompanyJob);
console.log('Result:', result3, '\n');
const excludedLocationJob = {
    title: 'Backend Developer',
    company: 'Tech Corp',
    location: 'Poland',
};
console.log('Test 4: Job with excluded location (should fail)');
console.log('Job:', excludedLocationJob);
const result4 = filterService.filterJob(excludedLocationJob);
console.log('Result:', result4, '\n');
console.log('=== Testing UrlBuilderService ===\n');
const urlService = new url_builder_service_1.UrlBuilderService(configService);
const query = {
    keywords: 'backend developer',
    location: 'Belgium',
    f_WT: '1',
    f_JT: 'F',
};
console.log('Test 1: Build search URL');
console.log('Query:', query);
const url = urlService.buildSearchUrl(query);
console.log('URL:', url, '\n');
console.log('Test 2: Build paginated URLs (3 pages)');
const paginatedUrls = urlService.buildPaginatedUrls(query, 3);
paginatedUrls.forEach((url, index) => {
    console.log(`Page ${index + 1}:`, url);
});
console.log();
console.log('Test 3: Get search queries from config');
const searchQueries = urlService.getSearchQueries();
console.log(`Found ${searchQueries.length} search queries`);
if (searchQueries.length > 0) {
    console.log('First query:', searchQueries[0]);
}
console.log();
console.log('Test 4: Build all search URLs from config');
const allUrls = urlService.buildAllSearchUrls();
console.log(`Generated ${allUrls.length} URLs`);
if (allUrls.length > 0) {
    console.log('First URL:', allUrls[0]);
}
console.log('\n=== Tests Complete ===');
//# sourceMappingURL=test-scraper-services.js.map