import { Injectable } from '@nestjs/common';

const parseIngredientsFromText = (text: string): string[] =>
  (text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

export interface MercItem {
  name: string;
  price: number;
}

@Injectable()
export class MercService {
  private items: MercItem[] = [];

  constructor() {
    // valeurs initiales
    this.items = [
      { name: 'tomate', price: 0.5 },
      { name: 'pommes', price: 0.4 },
      { name: 'fromage', price: 2.5 },
    ];
  }

  // utilisé par le controller GET /merc/items
  listItems(): MercItem[] {
    return this.items;
  }

  // utilisé par le controller POST /merc/items
  addItem(name: string, price: number) {
    if (!name) return null;
    const n = name.trim();
    const existing = this.items.find(i => i.name.toLowerCase() === n.toLowerCase());
    if (existing) {
      existing.price = price;
      return existing;
    }
    const it: MercItem = { name: n, price };
    this.items.push(it);
    return it;
  }

  // utilisé par le fiches-techniques service / controller pour résoudre ingrédients
  findByName(name?: string): MercItem | null {
    if (!name) return null;
    const n = name.trim().toLowerCase();
    return this.items.find(i => i.name.toLowerCase() === n) || null;
  }

  // parsing util
  parseText(text: string): string[] {
    return parseIngredientsFromText(text);
  }

  // helper backward-compatible: si d'autres parties appellent importText
  importText(text: string) {
    return { parsed: this.parseText(text) };
  }
}
