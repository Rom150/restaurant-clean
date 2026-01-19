/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service de gestion des unités et des conversions.
 */
@Injectable()
export class UniteService {
  constructor(private prisma: PrismaService) {}

  async getUnite(code: string) {
    if (!code) return null;
    return this.prisma.unite.findUnique({ where: { code } });
  }

  private arrondirSelon(unite: any, valeur: number) {
    if (!unite || typeof valeur !== 'number') return valeur;
    const prec =
      typeof unite.precision === 'number'
        ? unite.precision
        : unite.type === 'count'
          ? 0
          : 3;
    const factor = Math.pow(10, prec);
    return Math.round(valeur * factor) / factor;
  }

  async convertir(
    quantite: number,
    uniteFrom: string,
    uniteTo: string,
    produitId?: number,
  ): Promise<number> {
    if (quantite === null || quantite === undefined)
      throw new Error('quantite requise');
    if (uniteFrom === uniteTo) return Number(quantite);

    const [uFrom, uTo] = await Promise.all([
      this.getUnite(uniteFrom),
      this.getUnite(uniteTo),
    ]);
    if (!uFrom || !uTo)
      throw new Error(`Unité inconnue: \${!uFrom ? uniteFrom : uniteTo}`);

    if (uFrom.type === uTo.type) {
      const base = quantite * uFrom.facteur;
      const converted = base / uTo.facteur;
      return this.arrondirSelon(uTo, Number(converted));
    }

    const masseTypes = ['mass'];
    const volumeTypes = ['volume'];
    if (
      (masseTypes.includes(uFrom.type) && volumeTypes.includes(uTo.type)) ||
      (volumeTypes.includes(uFrom.type) && masseTypes.includes(uTo.type))
    ) {
      if (!produitId)
        throw new Error(
          'Produit requis pour conversion masse<->volume (densité manquante)',
        );
      const produit = await this.prisma.product.findUnique({
        where: { id: produitId },
      });
      if (!produit || !produit.densite)
        throw new Error(
          'Densité produit introuvable pour conversion masse<->volume',
        );

      if (uFrom.type === 'mass' && uTo.type === 'volume') {
        const g = quantite * uFrom.facteur;
        const ml = g / produit.densite;
        const converted = ml / uTo.facteur;
        return this.arrondirSelon(uTo, Number(converted));
      } else {
        const ml = quantite * uFrom.facteur;
        const g = ml * produit.densite;
        const converted = g / uTo.facteur;
        return this.arrondirSelon(uTo, Number(converted));
      }
    }

    throw new Error('Conversion non supportée');
  }

  async normaliserVersBase(quantite: number, codeUnite: string) {
    const u = await this.getUnite(codeUnite);
    if (!u) throw new Error(`Unité inconnue: \${codeUnite}`);
    const base = quantite * u.facteur;
    return { quantiteBase: base, type: u.type };
  }
}
