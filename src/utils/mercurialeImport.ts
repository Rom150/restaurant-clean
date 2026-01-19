const mercurialeUtil = {
  parseIngredientsFromText: (text: string) => (text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
  validateIngredients: (arr: string[]) => arr,
  detectDuplicates: (existing: string[], arr: string[]) => ({ duplicates: [], toAdd: arr }),
};

export = mercurialeUtil;
