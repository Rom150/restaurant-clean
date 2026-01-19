import { Controller, Get, Post, Body } from '@nestjs/common';
import { MercService } from './merc.service';

@Controller('merc')
export class MercController {
  constructor(private readonly mercService: MercService) {}

  @Get('items')
  list() {
    return this.mercService.listItems();
  }

  @Post('items')
  add(@Body() body: { name: string; price: number }) {
    return this.mercService.addItem(body.name, body.price);
  }

  // POST /merc/import Body: { text: "..." }
  @Post('import')
  importText(@Body() body: { text: string }) {
    return { parsed: this.mercService.parseText(body.text || '') };
  }
}
