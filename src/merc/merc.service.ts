import { Injectable } from '@nestjs/common';
/* eslint-disable @typescript-eslint/no-var-requires */
const merc = require('../utils/mercurialeImport');

@Injectable()
export class MercService {
  importText(text: string) {
    const parsed = merc.parseIngredientsFromText(text || '');
    const valid = merc.validateIngredients(parsed);
    const { duplicates, toAdd } = merc.detectDuplicates([], valid);
    return { parsed, valid, duplicates, toAdd };
  }
}
