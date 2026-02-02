/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UniteService } from '../unites/unite.service';

@Injectable()
export class FichesTechniquesService {
  constructor(
    private prisma: PrismaService,
    private uniteService: UniteService,
  ) {}

  async create(data: any) {
    const fiche = await this.prisma.ficheTechnique.create({
      data: {
        produitId: data.produitId,
        rendement: data.rendement ?? 1,
        uniteRdt: data.uniteRdt ?? 'unit',
        notes: data.notes ?? '',
        items: {
          create: data.items.map((it) => ({
            ingredientId: it.ingredientId,
            quantite: it.quantite,
            unite: it.unite,
            ordre: it.ordre ?? 0,
            notes: it.notes ?? '',
          })),
        },
      },
      include: { items: true },
    });
    return fiche;
  }

  async findAll() {
    return this.prisma.ficheTechnique.findMany({
      include: { items: true, produit: true },
    });
  }

  async findOne(id: number) {
    const f = await this.prisma.ficheTechnique.findUnique({
      where: { id },
      include: { items: true, produit: true },
    });
    if (!f) throw new NotFoundException('Fiche non trouvée');
    return f;
  }

  async update(id: number, data: any) {
    await this.prisma.ficheIngredient.deleteMany({ where: { ficheId: id } });
    const updated = await this.prisma.ficheTechnique.update({
      where: { id },
      data: {
        rendement: data.rendement,
        uniteRdt: data.uniteRdt,
        notes: data.notes,
        items: {
          create: data.items.map((it) => ({
            ingredientId: it.ingredientId,
            quantite: it.quantite,
            unite: it.unite,
            ordre: it.ordre ?? 0,
            notes: it.notes ?? '',
          })),
        },
      },
      include: { items: true },
    });
    return updated;
  }

  async remove(id: number) {
    await this.prisma.ficheIngredient.deleteMany({ where: { ficheId: id } });
    await this.prisma.ficheTechnique.delete({ where: { id } });
    return { ok: true };
  }

  async calculerCout(id: number, etablissementId?: number) {
    const fiche = await this.findOne(id);
    let total = 0;
    for (const it of fiche.items) {
      const produit = await this.prisma.product.findUnique({
        where: { id: it.ingredientId },
      });
      let prix = produit?.prixParDefaut ?? 0;

      if (etablissementId) {
        const prixEntry = await this.prisma.prix.findFirst({
          where: { produitId: it.ingredientId, etablissementId },
          orderBy: { valableDepuis: 'desc' },
        });
        if (prixEntry) prix = prixEntry.montant;
      }

      const uniteCible = produit?.uniteParDefaut ?? 'unit';
      let quantiteNormalisee = it.quantite;
      try {
        quantiteNormalisee = await this.uniteService.convertir(
          it.quantite,
          it.unite,
          uniteCible,
          it.ingredientId,
        );
      } catch (e) {
        quantiteNormalisee = it.quantite;
      }

      total += quantiteNormalisee * prix;
    }

    return Number(total.toFixed(2));
  }
}
