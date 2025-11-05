import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DB_PATH: Joi.string().optional(),

  // AI API Keys (optional - will fallback to config.json)
  JOB_ANALYSIS_API_KEY: Joi.string().optional(),
  JOB_ANALYSIS_MODEL: Joi.string().optional(),
  COVER_LETTER_API_KEY: Joi.string().optional(),
  COVER_LETTER_MODEL: Joi.string().optional(),
  RESUME_API_KEY: Joi.string().optional(),
  RESUME_MODEL: Joi.string().optional(),
  PAGE_SCRAPER_API_KEY: Joi.string().optional(),
  PAGE_SCRAPER_MODEL: Joi.string().optional(),

  // Files
  RESUME_PATH: Joi.string().optional(),
});
