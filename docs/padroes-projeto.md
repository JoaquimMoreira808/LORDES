# Padrões do LORDES definidos nesta conversa

Registro consolidado em 29/10/2026 para orientar próximas implementações. Este documento reúne os pedidos e as correções do usuário; os detalhes numéricos escolhidos durante a implementação são identificados separadamente. Novas instruções do usuário podem alterar estas decisões.

## Coleta nas áreas de ação

A unidade da ação é o cidadão: cada cidadão alocado completa **uma coleta por ciclo**. O resultado é **um único tipo de item** sorteado entre as entradas da loot table. A quantidade desse item pode variar conforme a entrada.

Exemplo: quatro cidadãos que completam um ciclo fazem quatro sorteios individuais. Eles podem encontrar itens iguais ou diferentes. Um cidadão não tenta coletar todos os itens da tabela em paralelo.

Regras a preservar:

- Um único tempo de coleta por área e um único relógio por cidadão (`progress.coleta`).
- As probabilidades dos resultados são mutuamente exclusivas e somam 100%.
- O nome de uma área não obriga que ela produza o recurso do título: a madeira foi retirada da Floresta de Carvalho.
- Usar tabelas pequenas. A lista vigente substitui as propostas anteriores de 11 itens e de 2 comuns, 1 raro e 1 lendário.
- O último item das listas abaixo deve ser bem raro. O primeiro é comum; os intermediários são incomuns. Na pedreira, o terceiro é o último e recebe a exceção de ser bem raro.
- O aumento solicitado de 50% no tempo já foi aplicado a todas as áreas. Não reaplicá-lo automaticamente a cada alteração.

## Conteúdo vigente das áreas iniciais

Itens e ordem pedidos pelo usuário:

| Área | Comum | Incomuns | Último, bem raro |
| --- | --- | --- | --- |
| Pedreira de Granito | Cascalho | Granito | Minério de ferro |
| Floresta de Carvalho | Fibra vegetal | Frutas silvestres, sementes silvestres | Semente de maçã |

Probabilidades e quantidades abaixo são **o balanceamento atualmente implementado**, escolhido para concretizar o pedido. Não houve aprovação explícita de cada número. Consultar `dist/game/catalog.mjs` e atualizar esta tabela ao rebalancear.

| Área | Item | Chance por coleta | Quantidade |
| --- | --- | --- | --- |
| Pedreira | Cascalho | 89,9% | 1–4 |
| Pedreira | Granito | 10% | 1–2 |
| Pedreira | Minério de ferro | 0,1% | 1 |
| Floresta | Fibra vegetal | 79,9% | 1–4 |
| Floresta | Frutas silvestres | 10% | 1–2 |
| Floresta | Sementes silvestres | 10% | 1–2 |
| Floresta | Semente de maçã | 0,1% | 1 |

Tempos atuais por cidadão: floresta 6 s; pedreira 7,5 s; campos de trigo 4,5 s; pomar de maçãs 6 s.

## O que a interface deve revelar

Os detalhes da área não devem listar os itens possíveis, suas chances ou suas taxas individuais. Mostrar uma barra de coleta geral, o tempo por cidadão e informações operacionais de alocação.

Os recursos obtidos aparecem no inventário e nos avisos de coleta. Isso não autoriza expor antecipadamente a loot table no painel da área.

## Sidebars

### Seus recursos

- Exibir somente itens com estoque positivo, inclusive itens antigos que já não saem nas tabelas atuais.
- Não preencher a lista com itens ainda não possuídos.
- Ter pesquisa pelo nome dos recursos possuídos. A implementação ignora acentos, maiúsculas e espaços externos e mostra um estado sem resultados.
- Recolhida, manter uma faixa cinza lateral e o botão de expansão. Ocultar conteúdo e pesquisa.

### Decks e ações

- Seguir o mesmo padrão visual da sidebar de recursos: dimensões, cores, espaçamento e controle de recolhimento.
- Permanecer na lateral direita; recursos ficam na esquerda.
- Ter as abas Ações e Decks no topo. Ações oferece criação de áreas, conforme solicitação de 29/10/2026; preservar a aba Decks.
- Preservar o conteúdo de decks, alocação por cartas e devolução de cidadãos.
- Manter rótulos acessíveis, foco visível e navegação das abas por teclado.

## Avisos de coleta

O usuário pediu posições aleatórias dentro de limites, em vez de um ponto fixo. Preservar a animação de subida e a duração dos avisos ao variar sua origem.

Limites atuais de implementação:

- Avisos na área: origem entre 35% e 65% da largura e da altura.
- Ganhos na sidebar: deslocamento à direita entre 0 e 24 px; posição superior entre 9 e 21 px.

Esses limites são escolhas de implementação, não coordenadas exigidas pelo usuário. Ajustes devem manter os avisos próximos do contexto de coleta e legíveis.

## Ícones e imagens

O usuário prefere uma solução simples: buscar uma imagem/ícone pelo nome em uma biblioteca, aplicar efeito 8-bit e usá-la como ícone, sem salvar imagens no projeto. Não iniciar geração de artes para cadastrar itens.

Implementação atual em `dist/game/resource-icons.mjs`:

- Pesquisa na coleção Game Icons via API Iconify; termos em inglês ficam em `searchNames`.
- Rasterização em 24 × 24 pixels, paleta RGB 3-3-2 de até 256 cores, transparência binária e ampliação sem suavização.
- Cache de resultados e requisições em memória durante a sessão, sem gravar imagens nos saves ou no repositório.
- Enquanto carrega ou em caso de falha, manter a arte local existente ou o símbolo provisório.
- Preservar os créditos e a licença da biblioteca ao adaptar imagens.

Limite de verificação: essa integração foi checada com respostas simuladas. O acesso real à API e o resultado visual não foram validados nesta conversa, pois o ambiente estava sem resolução de DNS. Não registrar essa aparência como aprovada visualmente pelo usuário.

## Organização e compatibilidade

- `dist/game/catalog.mjs`: conteúdo, raridades, probabilidades, quantidades e tempos.
- `dist/game/engine.mjs`: sorteio, ciclos, produção e movimentação, sem DOM.
- `dist/game/save.mjs`: restauração e compatibilidade dos saves.
- `dist/game/resource-icons.mjs`: busca e transformação dos ícones.
- `dist/app.js`: interface, pesquisa, abas e efeitos visuais.
- `dist/design-system.css`: tokens e estilos compartilhados, carregados após `style.css`.

Ao retirar itens das tabelas, preservar suas definições enquanto saves puderem referenciá-los. Não apagar JSONs de jogadores nem zerar recursos para adaptar o jogo. Os relógios antigos por item são migrados para um único progresso de coleta, sem somar tempos ou conceder produção na restauração.

## Verificação de mudanças

Para alterações de regras e saves, executar os testes pertinentes:

```bash
node tests/engine.test.mjs
node tests/save.test.mjs
python3 -m unittest discover -s tests -p 'test_server.py'
```

Para interface, verificar a sintaxe de módulo e as interações alteradas. A validação visual deve ser relatada como pendente quando não houver navegador disponível. Não confundir testes de lógica com aprovação visual.

Ideias futuras ficam em [ideias-futuras.md](ideias-futuras.md); não devem virar funcionalidades sem uma solicitação correspondente. Detalhes técnicos adicionais estão em [entidades.md](entidades.md), [design-system.md](design-system.md) e [saves.md](saves.md).


## Criação de áreas em Ações — 29/10/2026

Requisito do usuário: permitir novas áreas, entendidas na lore como construções ou locais descobertos. Começar com pomar de maçãs, Madeireira de Carvalho e plantação de trigo; solicitar sugestões para a Refinaria de Pedra. A aba agora mostra materiais possuídos/exigidos e libera o botão quando houver estoque. Cada clique paga uma vez e cria uma instância independente, sem alocação automática; repetições têm preço fixo. A criação é salva imediatamente. Saves anteriores preservam IDs e estoques; `carvalho` passa a ser exibido como Tronco de carvalho.

### Balanceamento inicial escolhido na implementação

Estes valores são ajustáveis, sem aprovação explícita do usuário. Não há moeda nem mercado: usamos tempo de trabalho acumulado para comparar custos, não retorno financeiro. Fórmula de produção média: `60 × chance × (máximo + 1) / tempo`, por minuto e cidadão.

| Área criada | Custo fixo | Produção média por cidadão/min |
| --- | --- | --- |
| Madeireira de Carvalho | 80 fibras vegetais + 60 cascalhos | 16 troncos; 1–3 a cada 7,5 s |
| Plantação de trigo (definição Campos de Trigo) | 12 sementes silvestres + 40 fibras + 30 cascalhos | 26,67 trigos; 1–3 a cada 4,5 s |
| Pomar de Maçãs | 1 semente de maçã + 40 fibras + 30 cascalhos | 25 maçãs; 1–4 a cada 6 s |

Estimativas internas das áreas iniciais: fibra 19,975/min, sementes silvestres 1,5/min e semente de maçã 0,01/min por cidadão na floresta; cascalho 17,98/min e granito 1,2/min na pedreira. Essas contas ficam na documentação, sem expor loot tables nos detalhes das áreas.

Como os materiais da floresta vêm dos mesmos ciclos, o tempo aproximado é o maior requisito dessa floresta, somado ao trabalho da pedreira: madeireira ≈ 7,34 cidadãos-minuto; trigo ≈ 9,67; pomar ≈ 101,67. Com 50 cidadãos na floresta e 50 na pedreira, os recursos chegam em cerca de 4,8 s para a madeireira, 9,6 s para o trigo e 120 s em média para o pomar. São estimativas contínuas: ciclos discretos, sorteios e gastos anteriores alteram a espera real. O gargalo do pomar é a semente rara; o prazo não é garantido. Sem utilidade/consumo definidos para os produtos, não é possível calcular um payback econômico.

### Refinaria de Pedra: sugestão, não regra operacional

A interface mostra a refinaria como planejada. Proposta: consumir 2 granitos para produzir 1 Laje de Pedra em 12 s por cidadão. Preferir granito ao cascalho para representar pedra talhada; não introduzir um item genérico “pedra” duplicando recursos existentes. Consumo e entrega juntos na conclusão do ciclo; sem insumos, aguardar com no máximo um ciclo pronto, sem acumular produção retroativa. Resolver ciclos por instante de conclusão e, em empates, por ID do cidadão, para compartilhar estoque sem duplicação; devolver trabalhador limpa o progresso sem perder insumos. A oferta de granito sustenta cerca de 0,6 laje/min por minerador; um refinador cheio teria capacidade de 5 lajes/min, exigindo aproximadamente 8,33 mineradores para abastecê-lo. Sugestão de construção: 40 troncos + 20 granitos, a revisar após definir usos das lajes. Receita, custo e operação ainda não implementados.

Verificação desta mudança: testes automatizados do motor, saves e servidor e sintaxe do módulo da interface passaram. Aparência e interação em navegador ainda não verificadas neste ambiente.


## População inicial — atualização de 29/10/2026

Por pedido explícito do usuário, novas partidas começam com **25 cidadãos**, em vez de 100. Partidas existentes preservam todos os cidadãos do save. Os custos das áreas permanecem os mesmos; estimativas anteriores com 50 trabalhadores são exemplos de escala, não uma alocação possível na população inicial atual.
