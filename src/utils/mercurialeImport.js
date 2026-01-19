console.log('[merc-import] module chargé', { file: __filename });

let tesseractWorker = null;
const getTesseractWorker = async (lang = 'fra', onProgress) => {
  if (tesseractWorker) return tesseractWorker;
  console.log('[merc-import] initialising Tesseract worker');
  // placeholder worker — remplace par l'implé réelle si besoin
  tesseractWorker = { initialized: true };
  console.log('[merc-import] Tesseract worker ready');
  return tesseractWorker;
};

const parseIngredientsFromText = (text) => {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map(l => ({ nom: l, prix: 0, unite: null, quantite: 0 }));
};

const validateIngredients = (ingredients) => {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.filter(i => i && i.nom && i.nom.length >= 2);
};

const detectDuplicates = (existing = [], newItems = []) => {
  const duplicates = [];
  const toAdd = [];
  for (const item of newItems) {
    const dup = (existing || []).find(e => e.nom && item.nom && e.nom.toLowerCase() === item.nom.toLowerCase());
    if (dup) duplicates.push({ existing: dup, new: item });
    else toAdd.push(item);
  }
  return { duplicates, toAdd };
};

module.exports = {
  getTesseractWorker,
  parseIngredientsFromText,
  validateIngredients,
  detectDuplicates,
};
