import { Injectable } from '@nestjs/common';
import { FichesTechniquesService } from '../fiches-techniques/fiches-techniques.service';
import { InventoryService } from '../inventory/inventory.service';
import { MercService } from '../merc/merc.service';

@Injectable()
export class BilanService {
  constructor(
    private readonly fichesService: FichesTechniquesService,
    private readonly inventoryService: InventoryService,
    private readonly mercService: MercService,
  ) {}

  // maintenant async car fichesService.findAll() est async (Prisma)
  async summary() {
    // récupère les fiches (prisma -> findMany)
    const fiches = (this.fichesService as any).findAll
      ? await (this.fichesService as any).findAll()
      : (this.fichesService as any).list
      ? (this.fichesService as any).list()
      : [];

    // totalFichesCost : si les fiches ont un champ totalCost (pré-calculé) sinon 0
    const totalFichesCost = (fiches || []).reduce((s: number, f: any) => s + (f.totalCost || 0), 0);

    // inventaire in-memory
    const stock = this.inventoryService.list ? this.inventoryService.list() : [];

    // valorisation du stock basée sur la mercuriale in-memory
    const stockValuation = (stock || []).reduce((s: number, it: any) => {
      const m = (this.mercService as any).findByName
        ? (this.mercService as any).findByName(it.name)
        : null;
      const price = m ? m.price : 0;
      return s + price * (it.qty || 0);
    }, 0);

    return {
      totalFiches: (fiches || []).length,
      totalFichesCost,
      stockValuation,
      fiches,
      stock,
    };
  }
}
