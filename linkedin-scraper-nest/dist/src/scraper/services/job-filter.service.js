"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobFilterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const franc_1 = require("franc");
let JobFilterService = class JobFilterService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    filterJob(job) {
        const titleExcludeResult = this.filterTitleExclude(job.title);
        if (!titleExcludeResult.passed) {
            return titleExcludeResult;
        }
        const titleIncludeResult = this.filterTitleInclude(job.title);
        if (!titleIncludeResult.passed) {
            return titleIncludeResult;
        }
        const companyResult = this.filterCompany(job.company);
        if (!companyResult.passed) {
            return companyResult;
        }
        const locationResult = this.filterLocation(job.location);
        if (!locationResult.passed) {
            return locationResult;
        }
        if (job.job_description) {
            const descriptionResult = this.filterDescription(job.job_description);
            if (!descriptionResult.passed) {
                return descriptionResult;
            }
            const languageResult = this.filterLanguage(job.job_description);
            if (!languageResult.passed) {
                return languageResult;
            }
        }
        return { passed: true };
    }
    filterTitleExclude(title) {
        const titleExclude = this.configService.get('filters.titleExclude', []);
        if (titleExclude.length === 0) {
            return { passed: true };
        }
        if (!title) {
            return { passed: true };
        }
        const matchedWords = titleExclude.filter((word) => title.toLowerCase().includes(word.toLowerCase()));
        if (matchedWords.length > 0) {
            return {
                passed: false,
                reason: `Contains excluded keyword in title: ${JSON.stringify(matchedWords)}`,
            };
        }
        return { passed: true };
    }
    filterTitleInclude(title) {
        const titleInclude = this.configService.get('filters.titleInclude', []);
        if (titleInclude.length === 0) {
            return { passed: true };
        }
        if (!title) {
            return {
                passed: false,
                reason: `Title is required but missing`,
            };
        }
        const hasMatch = titleInclude.some((word) => title.toLowerCase().includes(word.toLowerCase()));
        if (!hasMatch) {
            return {
                passed: false,
                reason: `Does not contain any required title keyword from: ${JSON.stringify(titleInclude)}`,
            };
        }
        return { passed: true };
    }
    filterCompany(company) {
        const companyExclude = this.configService.get('filters.companyExclude', []);
        if (companyExclude.length === 0) {
            return { passed: true };
        }
        if (!company) {
            return { passed: true };
        }
        const matchedCompanies = companyExclude.filter((excludedCompany) => company.toLowerCase().includes(excludedCompany.toLowerCase()));
        if (matchedCompanies.length > 0) {
            return {
                passed: false,
                reason: `Contains excluded company: ${JSON.stringify(matchedCompanies)}`,
            };
        }
        return { passed: true };
    }
    filterLocation(location) {
        const countryExclude = this.configService.get('filters.countryExclude', []);
        if (countryExclude.length === 0) {
            return { passed: true };
        }
        if (!location) {
            return { passed: true };
        }
        const matchedCountries = countryExclude.filter((excludedCountry) => location.toLowerCase().includes(excludedCountry.toLowerCase()));
        if (matchedCountries.length > 0) {
            return {
                passed: false,
                reason: `Contains excluded location: ${JSON.stringify(matchedCountries)}`,
            };
        }
        return { passed: true };
    }
    filterDescription(description) {
        const descWords = this.configService.get('filters.descWords', []);
        if (descWords.length === 0) {
            return { passed: true };
        }
        if (!description) {
            return {
                passed: false,
                reason: `Description is required but missing`,
            };
        }
        const hasMatch = descWords.some((word) => description.toLowerCase().includes(word.toLowerCase()));
        if (!hasMatch) {
            return {
                passed: false,
                reason: `Description does not contain any required keyword from: ${JSON.stringify(descWords)}`,
            };
        }
        return { passed: true };
    }
    filterLanguage(description) {
        const allowedLanguages = this.configService.get('filters.languages', ['en']);
        if (allowedLanguages.length === 0) {
            return { passed: true };
        }
        try {
            const detectedLang = (0, franc_1.franc)(description, { minLength: 50 });
            const langMap = {
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
        }
        catch (error) {
            console.warn('Language detection failed:', error.message);
            return { passed: true };
        }
    }
};
exports.JobFilterService = JobFilterService;
exports.JobFilterService = JobFilterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JobFilterService);
//# sourceMappingURL=job-filter.service.js.map