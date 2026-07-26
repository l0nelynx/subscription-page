import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { getJWTConfig } from '@common/config/jwt/jwt.config';

import { SubpageConfigService } from './subpage-config.service';
import { RootController } from './root.controller';
import { RootService } from './root.service';
import { AccountHubController } from './account-hub.controller';

@Module({
    imports: [JwtModule.registerAsync(getJWTConfig())],
    controllers: [AccountHubController, RootController],
    providers: [RootService, SubpageConfigService],
})
export class RootModule {}
