# Entidades e expansão do LORDES

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
  descricao: 'Uma floresta antiga, rica em madeira.',
  tipo: 'gerar',
  oficio: 'Lenhadores',          // apresentação opcional
  atividade: 'Cortando',         // apresentação opcional
  arte: 'assets/locations/floresta-carvalho.png', // opcional
  gera: [
    {
      id: 'cortar-carvalho',    // único dentro da definição
      itemId: 'carvalho',       // referência a catalog.items
      quantidadeMaxima: 4,
      tempoPraGerar: 4,         // segundos
      chanceDeGerar: 1          // probabilidade entre 0 e 1
    }
  ]
}
```

`initialSetup.areas` contém `{ id: 'wood', definitionId: 'floresta-carvalho' }`. Acrescentar outra entrada com um ID diferente cria outra floresta independente. Opcionalmente, `nome` dá um nome próprio à instância. O motor também exporta `addArea(game, catalog, configuration)`; a interface deve renderizar novamente após criar uma instância em tempo de execução.

## Geração

Cada regra de `gera` tem relógio próprio **por cidadão**. Cada cidadão testa a chance a cada `tempoPraGerar` segundos. Se acertar, recebe um inteiro uniforme de **1 até quantidadeMaxima**, inclusive. Se falhar, recebe zero e o relógio segue para o próximo ciclo.

Os resultados não competem: duas regras podem gerar no mesmo instante. Itens iguais produzidos por áreas diferentes entram no mesmo estoque. Para adicionar outro resultado, cadastre o item e acrescente outra regra de geração. Não é necessário alterar o motor, a sidebar ou as barras do painel.

A taxa exibida é uma estimativa estatística: `cidadãos × chance × (máximo + 1) / 2 / segundos`. Ela não promete uma quantidade fixa por segundo. A barra mostra o progresso do próximo cidadão a completar aquela geração.

O motor processa todas as tentativas ao avançar vários segundos, mas agrega os eventos por regra/área para evitar uma animação por pessoa. A UI recebe `{ areaId, ruleId, itemId, attempts, successes, amount }`.

O estado tem `version: 1` e é salvo no servidor por nome em `saves/*.json`. Ao entrar, áreas conquistadas, inventário, cidadãos e progresso são restaurados. Não há geração offline: o período entre sair e entrar não produz recursos. Veja `docs/saves.md`.

## Itens e apresentação

Itens existem fora das áreas. Cada um tem `id`, `nome` e, opcionalmente, `arte` e `cor`. O inventário usa `itemId` como chave. Um item sem arte recebe um símbolo na interface; não é necessário gerar imagens para cadastrar conteúdo.

## Cidadãos, decks e bundles

- Deck: identidade de um povo, com nome, runa e arte opcionais.
- Bundle: pertence a um deck e define o tipo de carta, como Commonners.
- Cidadão: identidade individual, `deckId`, `bundleId`, `areaId` e progresso por regra.

`areaId: null` significa disponível no deck. A localização de cada cidadão é a fonte única de verdade: quantidades, grupos e disponibilidade são calculados, sem listas de cidadãos ou contadores duplicados.

A mão só reúne cidadãos do **mesmo deck e mesmo bundle**, e da mesma origem. Devolver preserva ambas as identidades. Qualquer cidadão pode trabalhar em qualquer área. Não há capacidade máxima nem esgotamento dos locais.

Movimentar não altera cidadãos que permaneceram: seus relógios continuam. Quem entra numa área inicia seus próprios ciclos do zero. Devolver limpa apenas o progresso dos devolvidos.

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
