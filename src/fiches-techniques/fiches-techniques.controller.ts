import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { FichesTechniquesService } from './fiches-techniques.service';
import { CreateFicheDto } from './dto/create-fiche.dto';
import { UpdateFicheDto } from './dto/update-fiche.dto';
import { MercService } from '../merc/merc.service';
import { InventoryService } from '../inventory/inventory.service';

@Controller('fiches-techniques')
export class FichesTechniquesController {
  constructor(
    private service: FichesTechniquesService,
    private readonly mercService: MercService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Post()
  create(@Body() dto: CreateFicheDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFicheDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }

  @Get(':id/cout')
  calculerCout(
    @Param('id') id: string,
    @Query('etablissementId') etablissementId?: string,
  ) {
    return this.service.calculerCout(
      Number(id),
      etablissementId ? Number(etablissementId) : undefined,
    );
  }

  // Nouvel endpoint léger d'import (ne persiste pas dans la base, utile pour tests rapides)
  // Accepte: { name?: string, text?: string, ingredients?: string[] }
  @Post('import')
  importLight(@Body() body: { name?: string; text?: string; ingredients?: string[] }) {
    const raw = body.text ? (body.text || '') : '';
    const ingredients = body.text
      ? raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      : (body.ingredients || []);

    const resolved = ingredients.map(ing => {
      const found = (this.mercService as any).findByName(ing);
      const price = found ? found.price : null;
      return { name: ing, matched: !!found, unitPrice: price };
    });

    const totalCost = resolved.reduce((s, r) => s + (r.unitPrice || 0), 0);

    // Consommation simple : décrémente 1 unité pour chaque ingrédient trouvé
    for (const r of resolved) {
      if (r.matched) {
        // InventoryService.consume est synchrone dans la version in-memory
        try {
          (this.inventoryService as any).consume(r.name, 1);
        } catch (e) {
          // ignore errors in demo consume
        }
      }
    }

    const fiche = {
      id: Date.now(),
      name: body.name || `Fiche import ${new Date().toISOString()}`,
      ingredients: resolved,
      totalCost,
      createdAt: new Date().toISOString(),
    };

    return fiche;
  }
}
