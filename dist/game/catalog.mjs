// Conteúdo reutilizável. IDs são estáveis; nomes e apresentação podem mudar.
export const catalog = {
  items: {
    carvalho: { id: 'carvalho', nome: 'Carvalho', arte: 'assets/pixel-art/carvalho.png', cor: '#b6c894' },
    maca: { id: 'maca', nome: 'Maçã', arte: 'assets/pixel-art/maca.png', cor: '#d09d90' },
    granito: { id: 'granito', nome: 'Granito', arte: 'assets/pixel-art/granito.png', cor: '#a7bdcc' },
    trigo: { id: 'trigo', nome: 'Trigo', arte: 'assets/pixel-art/trigo.png', cor: '#c7bb7e' }
  },
  areas: {
    'campos-trigo': {
      id: 'campos-trigo', nome: 'Campos de Trigo', descricao: 'Campos férteis onde seu povo cultiva trigo.',
      tipo: 'gerar', oficio: 'Agricultores', atividade: 'Cultivando',
      gera: [{ id: 'colher-trigo', itemId: 'trigo', quantidadeMaxima: 3, tempoPraGerar: 3, chanceDeGerar: 1 }]
    },
    'floresta-carvalho': {
      id: 'floresta-carvalho', nome: 'Floresta de Carvalho', descricao: 'Uma floresta antiga, rica em madeira de carvalho.',
      tipo: 'gerar', oficio: 'Lenhadores', atividade: 'Cortando', arte: 'assets/locations/floresta-carvalho.png',
      gera: [{ id: 'cortar-carvalho', itemId: 'carvalho', quantidadeMaxima: 4, tempoPraGerar: 4, chanceDeGerar: 1 }]
    },
    'pedreira-granito': {
      id: 'pedreira-granito', nome: 'Pedreira de Granito', descricao: 'Rocha abundante para extrair granito.',
      tipo: 'gerar', oficio: 'Mineradores', atividade: 'Escavando',
      gera: [{ id: 'extrair-granito', itemId: 'granito', quantidadeMaxima: 5, tempoPraGerar: 5, chanceDeGerar: 1 }]
    },
    'pomar-macas': {
      id: 'pomar-macas', nome: 'Pomar de Maçãs', descricao: 'Árvores carregadas de maçãs prontas para colher.',
      tipo: 'gerar', oficio: 'Coletores', atividade: 'Colhendo',
      gera: [{ id: 'colher-maca', itemId: 'maca', quantidadeMaxima: 4, tempoPraGerar: 4, chanceDeGerar: 1 }]
    }
  },
  decks: {
    'povo-norte': { id: 'povo-norte', nome: 'Povo Do Norte', runa: 'ᚾ', arte: 'assets/pixel-art/povo-do-norte.png' }
  },
  bundles: {
    'norte-commonners': { id: 'norte-commonners', deckId: 'povo-norte', nome: 'Commonners', cartaNome: 'Commonner', arte: 'assets/pixel-art/povo-do-norte.png' }
  }
};

export const initialSetup = {
  areas: [
    { id: 'farm', definitionId: 'campos-trigo' },
    { id: 'wood', definitionId: 'floresta-carvalho' },
    { id: 'mine', definitionId: 'pedreira-granito' },
    { id: 'fruit', definitionId: 'pomar-macas' }
  ],
  populations: [{ bundleId: 'norte-commonners', quantidade: 100 }],
  assignments: [{ citizenId: 1, areaId: 'farm' }, { citizenId: 2, areaId: 'wood' }, { citizenId: 3, areaId: 'mine' }, { citizenId: 4, areaId: 'fruit' }]
};
