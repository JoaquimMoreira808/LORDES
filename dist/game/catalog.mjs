// Conteúdo reutilizável. IDs são estáveis; nomes e apresentação podem mudar.
export const catalog = {
  items: {
    'sementes-silvestres': { id: 'sementes-silvestres', nome: 'Sementes silvestres', raridade: 'incomum', cor: '#93bf8c' },
    'semente-maca': { id: 'semente-maca', nome: 'Semente de maçã', raridade: 'raro', cor: '#86afe0' },
    'fibra-vegetal': { id: 'fibra-vegetal', nome: 'Fibra vegetal', raridade: 'comum', cor: '#b9bdb5' },
    'folhas-secas': { id: 'folhas-secas', nome: 'Folhas secas', raridade: 'comum', cor: '#b9bdb5' },
    'bolota': { id: 'bolota', nome: 'Bolota', raridade: 'comum', cor: '#b9bdb5' },
    'cogumelo-silvestre': { id: 'cogumelo-silvestre', nome: 'Cogumelo silvestre', raridade: 'comum', cor: '#b9bdb5' },
    'frutas-silvestres': { id: 'frutas-silvestres', nome: 'Frutas silvestres', raridade: 'incomum', cor: '#93bf8c' },
    'resina': { id: 'resina', nome: 'Resina', raridade: 'incomum', cor: '#93bf8c' },
    'erva-medicinal': { id: 'erva-medicinal', nome: 'Erva medicinal', raridade: 'incomum', cor: '#93bf8c' },
    'musgo-prateado': { id: 'musgo-prateado', nome: 'Musgo prateado', raridade: 'incomum', cor: '#93bf8c' },
    'trufa-negra': { id: 'trufa-negra', nome: 'Trufa negra', raridade: 'raro', cor: '#86afe0' },
    'ambar': { id: 'ambar', nome: 'Âmbar', raridade: 'raro', cor: '#86afe0' },
    'semente-ancestral': { id: 'semente-ancestral', nome: 'Semente ancestral', raridade: 'lendario', cor: '#e2bb6d' },
    'cascalho': { id: 'cascalho', nome: 'Cascalho', raridade: 'comum', cor: '#b9bdb5' },
    'argila': { id: 'argila', nome: 'Argila', raridade: 'comum', cor: '#b9bdb5' },
    'areia-mineral': { id: 'areia-mineral', nome: 'Areia mineral', raridade: 'comum', cor: '#b9bdb5' },
    'calcario': { id: 'calcario', nome: 'Calcário', raridade: 'comum', cor: '#b9bdb5' },
    'quartzo': { id: 'quartzo', nome: 'Quartzo', raridade: 'incomum', cor: '#93bf8c' },
    'mica': { id: 'mica', nome: 'Mica', raridade: 'incomum', cor: '#93bf8c' },
    'minerio-ferro': { id: 'minerio-ferro', nome: 'Minério de ferro', raridade: 'raro', cor: '#86afe0' },
    'ametista': { id: 'ametista', nome: 'Ametista', raridade: 'raro', cor: '#86afe0' },
    'pepita-ouro': { id: 'pepita-ouro', nome: 'Pepita de ouro', raridade: 'raro', cor: '#86afe0' },
    'diamante': { id: 'diamante', nome: 'Diamante', raridade: 'lendario', cor: '#e2bb6d' },
    carvalho: { id: 'carvalho', nome: 'Carvalho', arte: 'assets/pixel-art/carvalho.png', cor: '#b6c894' },
    maca: { id: 'maca', nome: 'Maçã', arte: 'assets/pixel-art/maca.png', cor: '#d09d90' },
    granito: { id: 'granito', nome: 'Granito', raridade: 'incomum', arte: 'assets/pixel-art/granito.png', cor: '#a7bdcc' },
    trigo: { id: 'trigo', nome: 'Trigo', arte: 'assets/pixel-art/trigo.png', cor: '#c7bb7e' }
  },
  areas: {
    'campos-trigo': {
      id: 'campos-trigo', nome: 'Campos de Trigo', descricao: 'Campos férteis onde seu povo cultiva trigo.',
      tipo: 'gerar', tempoPraColetar: 4.5, oficio: 'Agricultores', atividade: 'Cultivando',
      gera: [{ id: 'colher-trigo', itemId: 'trigo', quantidadeMaxima: 3, chanceDeGerar: 1 }]
    },
    'floresta-carvalho': {
      id: 'floresta-carvalho', nome: 'Floresta de Carvalho', descricao: 'Uma floresta antiga, rica em plantas, fungos e tesouros naturais.',
      tipo: 'gerar', tempoPraColetar: 6, oficio: 'Coletores', atividade: 'Explorando', arte: 'assets/locations/floresta-carvalho.png',
      gera: [
        { id: 'coletar-fibra-vegetal', itemId: 'fibra-vegetal', quantidadeMaxima: 4, chanceDeGerar: 0.799 },
        { id: 'coletar-frutas-silvestres', itemId: 'frutas-silvestres', quantidadeMaxima: 2, chanceDeGerar: 0.1 },
        { id: 'coletar-sementes-silvestres', itemId: 'sementes-silvestres', quantidadeMaxima: 2, chanceDeGerar: 0.1 },
        { id: 'coletar-semente-maca', itemId: 'semente-maca', quantidadeMaxima: 1, chanceDeGerar: 0.001 }
      ]
    },
    'pedreira-granito': {
      id: 'pedreira-granito', nome: 'Pedreira de Granito', descricao: 'Uma encosta rochosa marcada por veios profundos e antigas escavações.',
      tipo: 'gerar', tempoPraColetar: 7.5, oficio: 'Mineradores', atividade: 'Escavando',
      gera: [
        { id: 'coletar-cascalho', itemId: 'cascalho', quantidadeMaxima: 4, chanceDeGerar: 0.899 },
        { id: 'extrair-granito', itemId: 'granito', quantidadeMaxima: 2, chanceDeGerar: 0.1 },
        { id: 'coletar-minerio-ferro', itemId: 'minerio-ferro', quantidadeMaxima: 1, chanceDeGerar: 0.001 }
      ]
    },
    'pomar-macas': {
      id: 'pomar-macas', nome: 'Pomar de Maçãs', descricao: 'Árvores carregadas de maçãs prontas para colher.',
      tipo: 'gerar', tempoPraColetar: 6, oficio: 'Coletores', atividade: 'Colhendo',
      gera: [{ id: 'colher-maca', itemId: 'maca', quantidadeMaxima: 4, chanceDeGerar: 1 }]
    }
  },
  decks: {
    'povo-norte': { id: 'povo-norte', nome: 'Povo Do Norte', runa: 'ᚾ', arte: 'assets/pixel-art/povo-do-norte.png' }
  },
  bundles: {
    'norte-commonners': { id: 'norte-commonners', deckId: 'povo-norte', nome: 'Commonners', cartaNome: 'Commonner', arte: 'assets/pixel-art/povo-do-norte.png' }
  }
};

// Partidas novas: apenas o povo inicial e duas áreas, sem trabalhadores alocados.
export const initialSetup = {
  areas: [
    { id: 'wood', definitionId: 'floresta-carvalho' },
    { id: 'mine', definitionId: 'pedreira-granito' }
  ],
  populations: [{ bundleId: 'norte-commonners', quantidade: 100 }],
  assignments: []
};
