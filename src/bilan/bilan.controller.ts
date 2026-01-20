import { Controller, Get } from '@nestjs/common';
import { BilanService } from './bilan.service';

@Controller('bilan')
export class BilanController {
  constructor(private readonly bilanService: BilanService) {}

  @Get('summary')
  getSummary() {
    return this.bilanService.summary();
  }
}
