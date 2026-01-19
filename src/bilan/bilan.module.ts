import { Module } from '@nestjs/common';
import { BilanService } from './bilan.service';
import { BilanController } from './bilan.controller';
import { FichesTechniquesModule } from '../fiches-techniques/fiches-techniques.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MercModule } from '../merc/merc.module';

@Module({
  imports: [FichesTechniquesModule, InventoryModule, MercModule],
  providers: [BilanService],
  controllers: [BilanController],
})
export class BilanModule {}
