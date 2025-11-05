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
exports.CoverLetterResponseDto = exports.GenerateCoverLetterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class GenerateCoverLetterDto {
    model;
}
exports.GenerateCoverLetterDto = GenerateCoverLetterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional model override' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateCoverLetterDto.prototype, "model", void 0);
class CoverLetterResponseDto {
    coverLetter;
    jobId;
}
exports.CoverLetterResponseDto = CoverLetterResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Generated cover letter' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CoverLetterResponseDto.prototype, "coverLetter", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job ID' }),
    __metadata("design:type", Number)
], CoverLetterResponseDto.prototype, "jobId", void 0);
//# sourceMappingURL=cover-letter.dto.js.map