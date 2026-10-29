# Entidades e expansão do LORDES

Consulte também [os padrões definidos pelo usuário](padroes-projeto.md).

## Arquivos

- `dist/game/catalog.mjs`: definições de itens, áreas, decks, bundles e configuração inicial.
- `dist/game/engine.mjs`: estado da partida, criação de instâncias, movimentação e produção. Não acessa DOM nem animações.
- `dist/app.js`: apresentação e interações; traduz eventos do motor em efeitos visuais.
- `tests/engine.test.mjs`: verificações das regras, com sorteios controlados.

O projeto continua sem build ou dependências. Sirva `dist/` por HTTP (`./deploy.sh`); os arquivos JavaScript são módulos ES. Abrir `index.html` diretamente com `file://` não carrega os módulos em navegadores comuns.

## Definições e instâncias

Uma definição descreve um conteúdo reutilizável. Uma instância é um local concreto da partida. IDs são strings estáveis, minúsculas, com letras, números e hífens.

```js
// catalog.areas
'floresta-carvalho': {
  id: 'floresta-carvalho',
  nome: 'Floresta de Carvalho',
  descricao: 'Uma floresta antiga e misteriosa.',
  tipo: 'gerar',
  oficio: 'Coletores',          // apresentação opcional
  atividade: 'Explorando',         // apresentação opcional
  arte: 'assets/locations/floresta-carvalho.png', // opcional
  tempoPraColetar: 6,         // um ciclo por cidadão, em segundos
  gera: [
    { id: 'coletar-fibra-vegetal', itemId: 'fibra-vegetal', quantidadeMaxima: 4, chanceDeGerar: 0.799 },
    { id: 'coletar-frutas-silvestres', itemId: 'frutas-silvestres', quantidadeMaxima: 2, chanceDeGerar: 0.1 },
    { id: 'coletar-sementes-silvestres', itemId: 'sementes-silvestres', quantidadeMaxima: 2, chanceDeGerar: 0.1 },
    { id: 'coletar-semente-maca', itemId: 'semente-maca', quantidadeMaxima: 1, chanceDeGerar: 0.001 }
  ]
}
```

`initialSetup.areas` contém `{ id: 'wood', definitionId: 'floresta-carvalho' }`. Acrescentar outra entrada com um ID diferente cria outra floresta independente. Opcionalmente, `nome` dá um nome próprio à instância. O motor também exporta `addArea(game, catalog, configuration)`; a interface deve renderizar novamente após criar uma instância em tempo de execução.

## Geração

Cada cidadão tem **um único relógio de coleta** (`progress.coleta`). Ao completar `tempoPraColetar` segundos, faz um sorteio cumulativo entre as entradas de `gera`. As probabilidades `chanceDeGerar` devem somar 1. O resultado é um único tipo de item, em quantidade inteira uniforme de **1 até quantidadeMaxima**, inclusive.

Na floresta, fibra vegetal tem 79,9%, frutas e sementes silvestres têm 10% cada e semente de maçã tem 0,1%. Na pedreira, cascalho tem 89,9%, granito tem 10% e minério de ferro tem 0,1%. Os ciclos duram 6 s na floresta, 7,5 s na pedreira, 4,5 s nos campos e 6 s no pomar. Não existem testes independentes por item ou vários resultados para uma mesma coleta. Os sorteios são individuais por cidadão e ciclo.

A taxa esperada por item é `cidadãos × chance × (máximo + 1) / 2 / tempoPraColetar`. A sidebar mostra apenas recursos com estoque positivo. Os detalhes das áreas mostram uma única barra e o tempo de coleta, sem revelar a tabela ou taxas por item.

O motor processa todos os ciclos ao avançar vários segundos e agrega eventos por área/item: `{ areaId, itemId, attempts, successes, amount }`. Aqui `attempts` e `successes` contam coletas que resultaram naquele item. Saves anteriores migram para um relógio usando o maior progresso entre as entradas ainda presentes na tabela, sem somar relógios nem gerar itens durante a restauração.

O estado tem `version: 1` e é salvo no servidor por nome em `saves/*.json`. Ao entrar, áreas conquistadas, inventário, cidadãos e progresso são restaurados. Não há geração offline: o período entre sair e entrar não produz recursos. Veja `docs/saves.md`.

## Itens e apresentação

Itens existem fora das áreas. Cada um tem `id`, `nome` e, opcionalmente, `arte` e `cor`. O inventário usa `itemId` como chave. Os ícones são buscados em tempo de execução e pixelizados; a arte local ou um símbolo serve de fallback. Não é necessário gerar imagens para cadastrar conteúdo.

## Cidadãos, decks e bundles

- Deck: identidade de um povo, com nome, runa e arte opcionais.
- Bundle: pertence a um deck e define o tipo de carta, como Commonners.
- Cidadão: identidade individual, `deckId`, `bundleId`, `areaId` e progresso de coleta.

`areaId: null` significa disponível no deck. A localização de cada cidadão é a fonte única de verdade: quantidades, grupos e disponibilidade são calculados, sem listas de cidadãos ou contadores duplicados.

A mão só reúne cidadãos do **mesmo deck e mesmo bundle**, e da mesma origem. Devolver preserva ambas as identidades. Qualquer cidadão pode trabalhar em qualquer área. Não há capacidade máxima nem esgotamento dos locais.

Movimentar não altera cidadãos que permaneceram: seus relógios continuam. Quem entra numa área inicia seu ciclo do zero. Devolver limpa apenas o progresso dos devolvidos.

## Futuro: refinar

`tipo` é o discriminador da operação. Hoje o motor só implementa `gerar` e rejeita tipos desconhecidos explicitamente. Uma refinaria deverá usar `tipo: 'refinar'` e `refina`, sem fingir que transformação é geração gratuita.

Contrato sugerido, ainda não operacional:

```js
{
  tipo: 'refinar',
  refina: [{
    id: 'fundir-ferro',
    entradas: [['minerio-ferro', 2], ['carvao', 1]],
    saidas: [['barra-ferro', 1]],
    tempoPraRefinar: 8
  }]
}
```

As tuplas são `[itemId, quantidade]`. Antes de implementar: decidir quando consumir entradas, o que ocorre sem insumos e como cancelar/refazer ciclos. Essa operação terá validador e execução próprios.

## Verificação

```bash
node tests/engine.test.mjs
```

## Ícones de recursos em tempo de execução

`dist/game/resource-icons.mjs` pesquisa nomes em inglês na coleção Game Icons da API Iconify. Para itens novos, acrescente uma tradução em `searchNames` ou use um nome pesquisável em `item.nome`. A imagem é rasterizada em 24 × 24 pixels, com paleta RGB 3-3-2 (256 cores), alfa binário e ampliação sem suavização.

Resultados e requisições são reutilizados em memória durante a sessão. Não há gravação de imagens no projeto ou no save. Enquanto carrega ou se a API falhar, o ícone local existente ou o símbolo provisório continua visível. A sidebar credita Lorc, Delapouite e colaboradores (Game-icons.net, CC BY 3.0); os ícones foram modificados pela rasterização e redução de cores.


## Ações para criar áreas

`catalog.areaActions` associa ID da ação a `definitionId`, nome, verbo e `custos` em tuplas `[itemId, quantidade]`. `canCreateArea` consulta disponibilidade; `createAreaFromAction` valida estoque, cria um ID livre com sufixo numérico e desconta materiais. Falta de recursos ou ação desconhecida retorna `null` sem mutação. Áreas repetidas são permitidas pelo mesmo preço. A interface renderiza a nova área e solicita save. Madeireira usa o item estável `carvalho` para troncos; trigo e pomar reutilizam definições existentes. Custos e cálculos estão em [padrões](padroes-projeto.md).
