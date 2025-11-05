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
exports.CreateManualJobDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateManualJobDto {
    title;
    company;
    location;
    job_description;
    job_url;
}
exports.CreateManualJobDto = CreateManualJobDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Job title (AI will extract if not provided)',
        example: 'Senior Backend Developer'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateManualJobDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Company name (AI will extract if not provided)',
        example: 'Acme Inc.'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateManualJobDto.prototype, "company", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Job location (AI will extract if not provided)',
        example: 'Remote, New York, USA'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateManualJobDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Job description text (required). AI will extract missing fields from this.',
        example: 'We are looking for a Senior Backend Developer with 5+ years experience in Node.js...'
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Job description is required' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateManualJobDto.prototype, "job_description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Job URL (optional)',
        example: 'https://example.com/careers/123'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateManualJobDto.prototype, "job_url", void 0);
//# sourceMappingURL=create-manual-job.dto.js.map