import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validationSchema } from './validation.schema';
import { ConfigController } from './config.controller';

@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true, // Make config available globally
      cache: true, // Cache config for better performance
    }),
  ],
  controllers: [ConfigController],
})
export class ConfigModule {}
