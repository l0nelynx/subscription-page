import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { getJWTConfig } from '@common/config/jwt/jwt.config';

import { AccountHubController } from './account-hub.controller';
import { WebpageController } from './webpage.controller';
import { WebpageService } from './webpage.service';

@Module({
    imports: [JwtModule.registerAsync(getJWTConfig())],
    controllers: [AccountHubController, WebpageController],
    providers: [WebpageService],
    exports: [WebpageService],
})
export class WebpageModule {}
