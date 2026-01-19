import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  private stock = new Map<string, number>();

  list() {
    return Array.from(this.stock.entries()).map(([name, qty]) => ({ name, qty }));
  }

  add(name: string, qty = 1) {
    const key = name.trim().toLowerCase();
    const current = this.stock.get(key) || 0;
    this.stock.set(key, current + qty);
    return { name: key, qty: this.stock.get(key) };
  }

  consume(name: string, qty = 1) {
    const key = name.trim().toLowerCase();
    const current = this.stock.get(key) || 0;
    const next = Math.max(0, current - qty);
    this.stock.set(key, next);
    return { name: key, qty: next };
  }

  getQty(name: string) {
    return this.stock.get(name.trim().toLowerCase()) || 0;
  }
}
