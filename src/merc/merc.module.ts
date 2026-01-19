import { Module } from '@nestjs/common';
import { MercController } from './merc.controller';
import { MercService } from './merc.service';

@Module({
  controllers: [MercController],
  providers: [MercService],
  exports: [MercService],
})
export class MercModule {}
