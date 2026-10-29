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
  for (const [id, action] of Object.entries(catalog.areaActions || {})) {
    requireThat(validId(id) && Object.hasOwn(catalog.areas, action.definitionId), `Ação inválida: ${id}`);
    requireThat(Array.isArray(action.custos) && action.custos.length > 0, `Custos ausentes: ${id}`);
    const items = new Set();
    for (const [itemId, amount] of action.custos) {
      requireThat(Object.hasOwn(catalog.items, itemId) && !items.has(itemId) && Number.isSafeInteger(amount) && amount > 0, `Custo inválido: ${id}`);
      items.add(itemId);
    }
  }

  for (const area of Object.values(catalog.areas)) {
    requireThat(area.tipo === 'gerar', `Tipo ainda não implementado: ${area.tipo}`);
    requireThat(typeof area.descricao === 'string', `Descrição ausente: ${area.id}`);
    requireThat(Array.isArray(area.gera) && area.gera.length > 0, `Gerações ausentes: ${area.id}`);
    requireThat(Number.isFinite(area.tempoPraColetar) && area.tempoPraColetar > 0, `Tempo inválido: ${area.id}`);
    const ids = new Set();
    for (const rule of area.gera) {
      requireThat(validId(rule.id) && !ids.has(rule.id), `Regra repetida ou inválida: ${rule.id}`); ids.add(rule.id);
      requireThat(Object.hasOwn(catalog.items, rule.itemId), `Item desconhecido: ${rule.itemId}`);
      requireThat(Number.isSafeInteger(rule.quantidadeMaxima) && rule.quantidadeMaxima >= 1, `Quantidade máxima inválida: ${rule.id}`);
      requireThat(Number.isFinite(rule.chanceDeGerar) && rule.chanceDeGerar >= 0 && rule.chanceDeGerar <= 1, `Chance inválida: ${rule.id}`);
    }
    requireThat(Math.abs(area.gera.reduce((sum, rule) => sum + rule.chanceDeGerar, 0) - 1) < 1e-9, `Chances devem somar 100%: ${area.id}`);
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

// Consulta e compra compartilham a mesma regra, sem depender da interface.
export function canCreateArea(game, catalog, actionId) {
  const action = Object.hasOwn(catalog.areaActions || {}, actionId) ? catalog.areaActions[actionId] : null;
  return !!action && action.custos.every(([id, amount]) => game.inventory[id] >= amount);
}
export function createAreaFromAction(game, catalog, actionId) {
  if (!canCreateArea(game, catalog, actionId)) return null;
  const action = catalog.areaActions[actionId];
  let index = 1;
  while (Object.hasOwn(game.areas, `${action.definitionId}-${index}`)) index++;
  const area = addArea(game, catalog, {id: `${action.definitionId}-${index}`, definitionId: action.definitionId});
  for (const [id, amount] of action.custos) game.inventory[id] -= amount;
  return area;
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
  for (const id of picked) {
    const citizen = game.citizens[id];
    citizen.areaId = destination === 'idle' ? null : destination;
    // Só o trabalhador movido começa de novo. Os demais preservam seus ciclos.
    citizen.progress = destination === 'idle' ? {} : { coleta: 0 };
  }
  return true;
}

export function expectedRates(game, catalog, areaId) {
  const rates = {};
  for (const area of Object.values(game.areas)) {
    if (areaId !== undefined && area.id !== areaId) continue;
    const count = citizenIds(game, area.id).length;
    const definition = catalog.areas[area.definitionId];
    for (const rule of definition.gera) {
      const mean = (rule.quantidadeMaxima + 1) / 2;
      rates[rule.itemId] = (rates[rule.itemId] || 0) + count * rule.chanceDeGerar * mean / definition.tempoPraColetar;
    }
  }
  return rates;
}

// Um relógio por cidadão; a barra mostra quem termina a próxima coleta.
export function collectionProgress(game, catalog, areaId) {
  const area = game.areas[areaId], duration = catalog.areas[area.definitionId].tempoPraColetar;
  return citizenIds(game, areaId).reduce((max, id) => Math.max(max, (game.citizens[id].progress.coleta || 0) / duration), 0);
}

export function advanceGame(game, catalog, seconds, random = Math.random) {
  requireThat(nonnegative(seconds), 'Intervalo inválido');
  if (game.paused || seconds === 0) return [];
  const events = new Map();
  for (const citizen of Object.values(game.citizens)) {
    if (citizen.areaId === null) continue;
    const area = game.areas[citizen.areaId], definition = catalog.areas[area.definitionId];
    const elapsed = (citizen.progress.coleta || 0) + seconds;
    const attempts = Math.floor(elapsed / definition.tempoPraColetar);
    citizen.progress.coleta = elapsed % definition.tempoPraColetar;
    for (let i = 0; i < attempts; i++) {
      const draw = random();
      let cumulative = 0;
      const rule = definition.gera.find(entry => {
        cumulative += entry.chanceDeGerar;
        return draw < cumulative;
      }) || definition.gera[definition.gera.length - 1];
      const amount = 1 + Math.floor(random() * rule.quantidadeMaxima);
      game.inventory[rule.itemId] += amount;
      const key = `${area.id}/${rule.itemId}`;
      if (!events.has(key)) events.set(key, { areaId: area.id, itemId: rule.itemId, attempts: 0, successes: 0, amount: 0 });
      const event = events.get(key);
      event.attempts++; event.successes++; event.amount += amount;
    }
  }
  // Agrupa resultados por área/item para limitar os efeitos visuais.
  return [...events.values()];
}
