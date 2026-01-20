const parseIngredientsFromText = (text: string): string[] =>
  (text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

const validateIngredients = (arr: string[]): string[] => arr;

const detectDuplicates = (existing: string[], arr: string[]) => ({ duplicates: [], toAdd: arr });

export { parseIngredientsFromText, validateIngredients, detectDuplicates };
export default { parseIngredientsFromText, validateIngredients, detectDuplicates };
