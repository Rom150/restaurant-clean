import { Controller, Post, Body } from '@nestjs/common';
import { MercService } from './merc.service';

@Controller('merc')
export class MercController {
  constructor(private readonly mercService: MercService) {}

  // POST /merc/import   Body: { "text": "contenu extrait de la mercuriale" }
  @Post('import')
  import(@Body('text') text: string) {
    return this.mercService.importText(text);
  }
}
