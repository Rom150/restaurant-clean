import { FicheIngredientDto } from './fiche-ingredient.dto';

export class CreateFicheDto {
  produitId: number;
  rendement?: number;
  uniteRdt?: string;
  notes?: string;
  items: FicheIngredientDto[];
}
