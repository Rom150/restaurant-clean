import { Controller, Get, Post, Body } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  list() {
    return this.inventoryService.list();
  }

  @Post('add')
  add(@Body() body: { name: string; qty?: number }) {
    return this.inventoryService.add(body.name, body.qty || 1);
  }

  @Post('consume')
  consume(@Body() body: { name: string; qty?: number }) {
    return this.inventoryService.consume(body.name, body.qty || 1);
  }
}
