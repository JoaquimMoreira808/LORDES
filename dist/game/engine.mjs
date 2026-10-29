// Motor puro: sem DOM, relógio de navegador ou efeitos visuais.
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const validId = id => typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id);
const nonnegative = n => Number.isFinite(n) && n >= 0;

export function validateCatalog(catalog) {
  for (const name of ['items', 'areas', 'decks', 'bundles']) requireThat(catalog[name] && typeof catalog[name] === 'object', `Catálogo ausente: ${name}`);
  for (const name of ['items', 'areas', 'decks', 'bundles']) {
    for (const [id, definition] of Object.entries(catalog[name])) {
      requireThat(validId(id) && definition.id === id, `ID inválido em ${name}: ${id}`);
      requireThat(typeof definition.nome === 'string' && definition.nome.length > 0, `Nome ausente: ${id}`);
    }
  }
  for (const bundle of Object.values(catalog.bundles)) requireThat(Object.hasOwn(catalog.decks, bundle.deckId), `Deck desconhecido: ${bundle.deckId}`);
  for (const area of Object.values(catalog.areas)) {
    requireThat(area.tipo === 'gerar', `Tipo ainda não implementado: ${area.tipo}`);
    requireThat(typeof area.descricao === 'string', `Descrição ausente: ${area.id}`);
    requireThat(Array.isArray(area.gera) && area.gera.length > 0, `Gerações ausentes: ${area.id}`);
    const ids = new Set();
    for (const rule of area.gera) {
      requireThat(validId(rule.id) && !ids.has(rule.id), `Regra repetida ou inválida: ${rule.id}`); ids.add(rule.id);
      requireThat(Object.hasOwn(catalog.items, rule.itemId), `Item desconhecido: ${rule.itemId}`);
      requireThat(Number.isSafeInteger(rule.quantidadeMaxima) && rule.quantidadeMaxima >= 1, `Quantidade máxima inválida: ${rule.id}`);
      requireThat(Number.isFinite(rule.tempoPraGerar) && rule.tempoPraGerar > 0, `Tempo inválido: ${rule.id}`);
      requireThat(Number.isFinite(rule.chanceDeGerar) && rule.chanceDeGerar >= 0 && rule.chanceDeGerar <= 1, `Chance inválida: ${rule.id}`);
    }
  }
}

export function createGame(catalog, setup) {
  validateCatalog(catalog);
  const game = { version: 1, paused: false, inventory: Object.fromEntries(Object.keys(catalog.items).map(id => [id, 0])), areas: {}, citizens: {} };
  for (const area of setup.areas) addArea(game, catalog, area);
  let id = 1;
  for (const population of setup.populations) {
    const bundle = catalog.bundles[population.bundleId];
    requireThat(bundle && Number.isSafeInteger(population.quantidade) && population.quantidade >= 0, 'População inválida');
    for (let i = 0; i < population.quantidade; i++, id++) game.citizens[id] = { id, deckId: bundle.deckId, bundleId: bundle.id, areaId: null, progress: {} };
  }
  for (const assignment of setup.assignments || []) requireThat(moveCitizens(game, catalog, assignment.citizenId, 'idle', assignment.areaId, 1), 'Alocação inicial inválida');
  return game;
}

export function addArea(game, catalog, { id, definitionId, nome }) {
  requireThat(validId(id) && id !== 'idle' && !Object.hasOwn(game.areas, id), `Instância repetida ou inválida: ${id}`);
  requireThat(Object.hasOwn(catalog.areas, definitionId), `Área desconhecida: ${definitionId}`);
  game.areas[id] = { id, definitionId, ...(nome ? { nome } : {}) };
  return game.areas[id];
}

export function citizenIds(game, source = 'idle') {
  return Object.values(game.citizens).filter(citizen => (citizen.areaId ?? 'idle') === source).map(citizen => citizen.id);
}
export function similarCitizenIds(game, citizenId, source) {
  const selected = game.citizens[citizenId];
  if (!selected || (selected.areaId ?? 'idle') !== source) return [];
  return citizenIds(game, source).filter(id => game.citizens[id].deckId === selected.deckId && game.citizens[id].bundleId === selected.bundleId);
}
export function citizenGroups(game, source) {
  const groups = new Map();
  for (const id of citizenIds(game, source)) {
    const citizen = game.citizens[id], key = `${citizen.deckId}/${citizen.bundleId}`;
    if (!groups.has(key)) groups.set(key, { deckId: citizen.deckId, bundleId: citizen.bundleId, ids: [] });
    groups.get(key).ids.push(id);
  }
  return [...groups.values()];
}

export function moveCitizens(game, catalog, citizenId, source, destination, amount) {
  if (source === destination || !Number.isSafeInteger(amount) || amount < 1 || (destination !== 'idle' && !Object.hasOwn(game.areas, destination))) return false;
  const similar = similarCitizenIds(game, citizenId, source);
  if (similar.length < amount) return false;
  const picked = [citizenId, ...similar.filter(id => id !== citizenId)].slice(0, amount);
  const rules = destination === 'idle' ? [] : catalog.areas[game.areas[destination].definitionId].gera;
  for (const id of picked) {
    const citizen = game.citizens[id];
    citizen.areaId = destination === 'idle' ? null : destination;
    // Só o trabalhador movido começa de novo. Os demais preservam seus ciclos.
    citizen.progress = Object.fromEntries(rules.map(rule => [rule.id, 0]));
  }
  return true;
}

export function expectedRates(game, catalog, areaId) {
  const rates = {};
  for (const area of Object.values(game.areas)) {
    if (areaId !== undefined && area.id !== areaId) continue;
    const count = citizenIds(game, area.id).length;
    for (const rule of catalog.areas[area.definitionId].gera) {
      const mean = (rule.quantidadeMaxima + 1) / 2;
      rates[rule.itemId] = (rates[rule.itemId] || 0) + count * rule.chanceDeGerar * mean / rule.tempoPraGerar;
    }
  }
  return rates;
}

export function ruleProgress(game, catalog, areaId, ruleId) {
  const area = game.areas[areaId], rule = catalog.areas[area.definitionId].gera.find(rule => rule.id === ruleId);
  if (!rule) return 0;
  const ids = citizenIds(game, areaId);
  // A barra mostra o próximo trabalhador a completar esta geração.
  return ids.reduce((max, id) => Math.max(max, (game.citizens[id].progress[ruleId] || 0) / rule.tempoPraGerar), 0);
}

export function advanceGame(game, catalog, seconds, random = Math.random) {
  requireThat(nonnegative(seconds), 'Intervalo inválido');
  if (game.paused || seconds === 0) return [];
  const events = new Map();
  for (const citizen of Object.values(game.citizens)) {
    if (citizen.areaId === null) continue;
    const area = game.areas[citizen.areaId], definition = catalog.areas[area.definitionId];
    for (const rule of definition.gera) {
      const elapsed = (citizen.progress[rule.id] || 0) + seconds;
      const attempts = Math.floor(elapsed / rule.tempoPraGerar);
      citizen.progress[rule.id] = elapsed % rule.tempoPraGerar;
      if (!attempts) continue;
      const key = `${area.id}/${rule.id}`;
      if (!events.has(key)) events.set(key, { areaId: area.id, ruleId: rule.id, itemId: rule.itemId, attempts: 0, successes: 0, amount: 0 });
      const event = events.get(key); event.attempts += attempts;
      for (let i = 0; i < attempts; i++) {
        if (random() >= rule.chanceDeGerar) continue;
        event.successes++;
        const amount = 1 + Math.floor(random() * rule.quantidadeMaxima);
        event.amount += amount; game.inventory[rule.itemId] += amount;
      }
    }
  }
  // Um evento por regra/área, mesmo com milhares de trabalhadores. A UI decide os efeitos.
  return [...events.values()];
}
