import { Module } from '@nestjs/common';
import { FichesTechniquesService } from './fiches-techniques.service';
import { FichesTechniquesController } from './fiches-techniques.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UnitesModule } from '../unites/unites.module';
import { MercModule } from '../merc/merc.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, UnitesModule, MercModule, InventoryModule],
  controllers: [FichesTechniquesController],
  providers: [FichesTechniquesService],
  exports: [FichesTechniquesService],
})
export class FichesTechniquesModule {}
