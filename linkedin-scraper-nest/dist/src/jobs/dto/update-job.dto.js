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
exports.UpdateJobDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class UpdateJobDto {
    title;
    company;
    location;
    date;
    job_url;
    job_description;
    applied;
    hidden;
    interview;
    rejected;
    blocked;
    notes;
    cover_letter;
    resume;
    metadata;
}
exports.UpdateJobDto = UpdateJobDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Job title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Company name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "company", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Job location' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Job posting date (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Job URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "job_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Job description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "job_description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Applied status (boolean or 0/1)', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value === 'boolean')
            return value ? 1 : 0;
        return value === 'true' || value === 1 ? 1 : 0;
    }),
    __metadata("design:type", Number)
], UpdateJobDto.prototype, "applied", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Hidden status (boolean or 0/1)', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value === 'boolean')
            return value ? 1 : 0;
        return value === 'true' || value === 1 ? 1 : 0;
    }),
    __metadata("design:type", Number)
], UpdateJobDto.prototype, "hidden", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Interview status (boolean or 0/1)', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value === 'boolean')
            return value ? 1 : 0;
        return value === 'true' || value === 1 ? 1 : 0;
    }),
    __metadata("design:type", Number)
], UpdateJobDto.prototype, "interview", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Rejected status (boolean or 0/1)', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value === 'boolean')
            return value ? 1 : 0;
        return value === 'true' || value === 1 ? 1 : 0;
    }),
    __metadata("design:type", Number)
], UpdateJobDto.prototype, "rejected", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Blocked status (boolean or 0/1)', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value === 'boolean')
            return value ? 1 : 0;
        return value === 'true' || value === 1 ? 1 : 0;
    }),
    __metadata("design:type", Number)
], UpdateJobDto.prototype, "blocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cover letter' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "cover_letter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tailored resume' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "resume", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Metadata (JSON string)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateJobDto.prototype, "metadata", void 0);
//# sourceMappingURL=update-job.dto.js.map