import { Injectable } from '@nestjs/common';
import { parseIngredientsFromText, validateIngredients, detectDuplicates } from '../utils/mercurialeImport';

@Injectable()
export class MercService {
  importText(text: string) {
    const parsed = parseIngredientsFromText(text || '');
    const valid = validateIngredients(parsed);
    const { duplicates, toAdd } = detectDuplicates([], valid);
    return { parsed, valid, duplicates, toAdd };
  }
}
