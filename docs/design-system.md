# Interface

Os tokens e estilos compartilhados ficam em `dist/design-system.css`, carregado depois dos estilos de estrutura do jogo.

- Usar as variáveis de cor, espaçamento, raio e sombra desse arquivo.
- Bordas: 8 px em controles e cartas, 12 px em grupos, 18 px em painéis.
- Usar IBM Plex Sans para controles e títulos. Manter a marca LORDES na fonte original. Nos nomes das áreas de ação, usar Instrument Serif em tamanho maior, com degradê branco a cinza dentro das letras e contorno cinza, integrado à moldura da carta. Manter o título em uma linha, medindo o texto na fonte carregada e ajustando o tamanho ao espaço disponível. Preservar as ilustrações sem fade.
- Reutilizar as ilustrações existentes. Acrescentar assets apenas quando solicitados.
- Adicionar apenas os textos pedidos e os rótulos necessários para operar os controles.
- Evitar runas decorativas, brilho contínuo, texturas e explicações permanentes.
- Manter nomes, quantidades e ações em destaque; informações de produção ficam no painel de detalhes.
- Preservar foco visível, rótulos acessíveis e os estados de interação.

## Regras de interação das sidebars e efeitos

Seguir [os padrões do projeto](padroes-projeto.md) para pesquisa de recursos, estados recolhidos, abas Ações/Decks, avisos aleatórios e ícones pixelizados em tempo de execução. As duas sidebars compartilham largura de 280 px quando abertas e faixa de 48 px quando recolhidas, com ajustes para telas pequenas. Ícones de itens podem ser carregados remotamente em vez de criar novos assets.


A aba Ações contém cartões de criação com nome, estoque/custo e botão indisponível até reunir materiais. A Refinaria de Pedra aparece como planejada. Reutilizar tokens e controles das sidebars; a criação informa o resultado em região de status acessível.

## Protótipo de vila ASCII — 30/10/2026

Por solicitação do usuário, as áreas de ação ficam num painel recolhível na parte inferior do espaço central. O botão “Áreas de ação” abre as cartas existentes, preservando detalhes, alocação e transferência. A aba Ações da sidebar continua responsável por criar locais.

A vila ocupa o centro e usa `dist/game/village-view.mjs`: formas simples desenhadas num Canvas em memória são convertidas por luminosidade para caracteres num elemento `pre`. Floresta, pedreira, trigo, pomar e madeireira têm representações distintas. Cada instância de área acrescenta um local; a composição se ajusta à quantidade de locais. Não há novos assets, construções habitáveis ou regras de habitação.

Pessoas andando são um efeito visual, sem interferência na localização ou produção dos cidadãos. O protótipo limita a representação a 50 figuras e 8 quadros por segundo; esses números, a cor verde e o painel inicialmente recolhido são escolhas de implementação, não aprovação estética do usuário. Respeitar `prefers-reduced-motion` e suspender o desenho em aba oculta. Posições não fazem parte dos saves.

Verificação: sintaxe dos módulos e testes existentes de motor, saves e servidor passaram. Aparência e interações em navegador ainda não verificadas.

## Experimento Cheoma + textmode — 30/10/2026

Pedido do usuário: testar as duas bibliotecas juntas. `dist/village-lab.html`, acessível pelo link “Testar Cheoma + ASCII” no jogo, compara a mesma cena 3D com a conversão do textmode.js. As dependências estão em `dist/vendor/`, com versões fixas e licenças originais; não dependem de CDN em execução.

Cheoma fornece o plano procedural (lotes e vias) e modelos de casas. O adaptador usa terreno plano e representação simplificada dos caminhos e moradores, sem carregar todo o ambiente do Cheoma. Seed, escala, tamanho do caractere, cores e movimento podem ser ajustados; arrastar/zoom na cena original também muda o enquadramento convertido. É um laboratório isolado, sem vínculo com estoques, cidadãos ou áreas do save. A arquitetura coreana pertence à biblioteca e não é uma decisão estética definitiva para LORDES.

Verificação: página carregada em Chrome headless com WebGL por software e captura visual das duas renderizações. Isso verifica a integração básica, não aprovação visual do usuário nem desempenho em GPU real.

Ajuste do laboratório após feedback de caracteres pouco legíveis: usar DejaVu Sans Mono vetorial local (licença em `dist/vendor/fonts/`), tamanho inicial de 12 px e controle de 9–24 px, substituindo as células bitmap de 6 px. A rampa inclui letras para tornar a composição tipográfica mais evidente. São ajustes para avaliação, não aprovação estética definitiva.

Após pedido para igualar a escala ao texto web, o laboratório passa a obter o tamanho inicial de `figcaption` via `getComputedStyle` (16 px CSS). A densidade do textmode é fixada em 1 para manter a unidade dos glifos alinhada aos pixels CSS, sem depender da densidade física do monitor. O controle exibe o tamanho atual e permite ajuste de 10–28 px.

## Conversão com contornos — laboratório ASCII

Após feedback de ilegibilidade, o laboratório passa a amostrar o quadro do Three em Canvas 2D, em uma grade de 3×3 amostras por célula. `dist/game/ascii-cells.mjs` combina gradientes Sobel com preenchimento por luminosidade: `|`, `-`, `/` e `\` acompanham a orientação das bordas. Regiões verdes uniformes e escuras ficam vazias; bordas isoladas do terreno são suprimidas e as cores dos glifos recebem um mínimo de brilho. A classificação por verde é uma heurística específica desta cena experimental, não uma regra para todos os materiais.

O textmode continua responsável pela fonte, grade e desenho dos caracteres, mas deixa de usar `createTexture`/`image` para converter o quadro ao vivo. Esse caminho foi contornado porque a imagem recebida do usuário mostrava glifos fragmentados e uma cópia pequena da cena; não foi confirmada a causa interna do artefato na biblioteca/driver. A conversão agora roda na CPU a até 10 atualizações/s, separada da animação 3D. A interface oferece contornos + luminosidade, luminosidade pura e diagnóstico de glifos. Esse diagnóstico desenha caracteres conhecidos sem depender da cena.

Verificação: testes de supressão de fundo, orientação de bordas e preenchimento claro em `tests/ascii-cells.test.mjs`; sintaxe dos módulos. Captura no Chrome com WebGL por software verificou glifos inteiros e ausência da miniatura no novo caminho. Validação no navegador e GPU do usuário continua necessária.

## Teste mínimo de uma casa

`dist/house-lab.html` abre pelo link no laboratório da vila. Cena isolada: uma casa `PRESETS.giwa` do Cheoma, fundo preto, iluminação e câmera orbital; sem terreno, moradores, plano procedural ou conversor próprio. A conversão usa `createTexture` → `image` do textmode, com dimensões explícitas da grade. A página referencia o exemplo oficial de integração.

A opção “Grade fixa” desenha letras, números e sinais diretamente por `char`/`point`, sem criar textura de entrada. Uma referência em texto HTML permite comparação. Fontes embutida e DejaVu e tamanhos 12/16/20 podem ser comparados. Trocas submetem o formulário e recarregam a página para separar estados gráficos. Nada acessa saves.

Verificação: sintaxe do módulo e capturas no Chrome headless com WebGL por software. A grade vetorial apresentou caracteres inteiros sem miniatura neste ambiente. A ausência desse defeito no navegador do usuário ainda precisa ser confirmada; isso não equivale à aprovação da qualidade da conversão da casa.

## Densidade por colunas — referência enviada pelo usuário

A referência de 100 caracteres por linha esclareceu a intenção: imagem preenchida por muitos caracteres pequenos, preservando a silhueta. Essa nova instrução substitui o ajuste de 16 px como padrão da imagem. Os laboratórios de casa e vila usam `dense-ascii.mjs`, com controle de colunas, brilho e contraste; o tamanho monoespaçado é calculado pela largura disponível, e as linhas pela proporção medida da fonte. A casa começa com 100 colunas, a vila com 160; são valores iniciais ajustáveis, não aprovação numérica do usuário.

A conversão amostra o quadro completo em blocos de 2×4 pixels e usa uma rampa longa de densidade, sem a supressão de terreno e sem contornos esparsos. Na casa, o fundo branco fica vazio e superfícies escuras recebem caracteres densos. A saída é texto HTML selecionável, evitando o atlas e a composição WebGL do textmode; o textmode foi preservado no diagnóstico isolado de glifos. Cheoma continua gerando as casas e o plano da vila. O laboratório não altera saves ou regras de produção.

Pedido posterior: usar configuração Arrow nos caracteres. Os dois laboratórios agora iniciam com o preset Arrow, implementado com a rampa ` .›»→⇒➜`; Extended permanece disponível para comparação. Esse conjunto é a escolha concreta da implementação, sem presumir que reproduz um preset de terceiros cujo código não foi fornecido. Captura final da casa no Chrome verificou a imagem completa com preenchimento de setas e grade de 100 colunas. O redimensionamento renderiza imediatamente o primeiro quadro, evitando capturar o canvas antes de ter dimensões válidas.

## Teste da vila com Arrow aprovado na casa

Após aprovação visual do teste da casa, o usuário solicitou testar o mesmo tratamento na vila. `village-lab.html` usa Arrow e 160 colunas ajustáveis. O passe de amostragem tem céu e solo brancos, com iluminação reduzida dos objetos para preservar caminhos e telhados na conversão invertida. Esse passe é temporário: fundo, material do solo e intensidades de luz são restaurados antes de apresentar a cena 3D original. Mantém câmera compartilhada, animação dos moradores e geração por seed/escala. Nenhuma integração com saves foi acrescentada.

Verificação: sintaxe e captura do laboratório no Chrome com WebGL por software, sem erros JavaScript observados. A aprovação anterior refere-se à casa; a vila permanece em avaliação.

## Cor somente nos moradores do ASCII

Por pedido do usuário, a vila ASCII mantém casas, caminhos e terreno na cor textual base; apenas células ocupadas por moradores visíveis recebem cor. Um passe de máscara renderiza os moradores em azul-claro e laranja e as demais superfícies em preto, mantendo o teste de profundidade para que pessoas atrás de casas não apareçam por cima. As cores são escolhas iniciais da implementação. O conversor aplica spans de cor somente às células correspondentes; sem máscara, a casa permanece com saída textual monocromática. Materiais e fundo originais são restaurados após cada passe e a máscara não é salva. Uma célula com morador pode usar `›` se a conversão de luminosidade a deixasse vazia, para preservar sua visibilidade em zoom distante.

## Cores amostradas da imagem original

Por solicitação do usuário, o laboratório da vila oferece três modos: Cores da imagem (inicial), Somente moradores e Monocromático. Cores da imagem captura a cena 3D com iluminação e materiais originais antes do passe de luminosidade e calcula a média RGB de cada célula de 2×4 amostras. Essa média colore o caractere correspondente. A saturação, ajustável de 0% a 200%, modifica a cor em torno da luminância, sem alterar o caractere escolhido. O ajuste fica desabilitado nos outros modos. Terreno vazio no passe ASCII continua vazio; a coloração não acrescenta preenchimento. O modo Somente moradores preserva a máscara anterior. Nenhum desses controles afeta saves ou produção.

Correção de atualização do módulo de cores: os módulos dos laboratórios passaram a importar `dense-ascii.mjs` com versão explícita na URL. Atualizar apenas a versão do módulo principal não invalida uma dependência com URL inalterada em navegadores/proxies que a mantêm em cache; isso pode apresentar controles novos junto com o conversor anterior. A captura do usuário com Cores da imagem selecionado e saída na cor base motivou essa correção. Os pontos de entrada HTML também tiveram suas versões atualizadas.

Após feedback de cores pouco vivas, a amostragem recebe ganho de luminosidade das cores separado do brilho/contraste dos glifos, com compensação suave dos tons escuros e limitação conjunta dos canais para preservar a proporção RGB. O laboratório inicia com luminosidade das cores em 150% (ajustável de 100% a 250%) e saturação em 140%. Esses valores são escolhas iniciais para avaliação. O efeito atua somente em Cores da imagem; não altera caracteres, fundo, cena original ou máscara dos moradores.

## Comparação com threejs-city

Por pedido do usuário, o laboratório inclui seletor Gerador para alternar Cheoma e threejs-city na mesma tela, preservando controles ASCII, cor, seed, escala e moradores. O teste inicia no novo gerador. A troca gera novamente a cena e reposiciona a câmera. O botão e o seletor ficam indisponíveis durante a geração para evitar solicitações concorrentes.

`city-generator.mjs` usa `planCity`, `buildingGeometry` e `roadGeometry` reais do threejs-city 0.1.0 num terreno plano, arquitetura temperada. O planejamento e as geometrias vêm da biblioteca; materiais WebGL simples são do adaptador. Não é a apresentação completa de `City.create`: fachadas procedurais TSL, clima e terreno de threejs-biomes não estão habilitados. O bundle local preserva licenças e tem instruções de reprodução em `dist/vendor/threejs-city/LORDES.md`. Mantém separada a versão de Three da biblioteca, transferindo apenas arrays de geometria ao Three do jogo; o navegador pode emitir aviso de múltiplas versões.

Verificação: testes de determinismo e geometria finita nas escalas povoado/vila em `tests/city-generator.test.mjs`, sintaxe dos módulos e captura da cena 3D/ASCII no Chrome com WebGL por software. Para seed 7, o novo gerador produziu 7 construções no povoado e 13 na vila. Quantidades não são regras de gameplay; o laboratório continua sem acesso aos saves.

## Grama ASCII com vento

Pedido do usuário: usar `i`, `l` e `/` verdes para lâminas de grama balançando. O laboratório identifica grama por uma máscara da malha do solo, não pela cor da imagem. Construções, vias e moradores ocluem o terreno pelo teste de profundidade. Só células com todas as oito amostras classificadas como solo recebem grama, preservando as bordas dos objetos.

`ascii-grass.mjs` mantém tufos esparsos em posições determinísticas e alterna a inclinação por ondas com defasagem espacial. Densidade inicial de 32% e três tons verdes são escolhas de implementação. A grama é uma camada verde própria, inclusive nos modos Monocromático e Somente moradores. A preferência de movimento reduzido e o controle Movimento congelam o vento. A cena original, geração e saves não são alterados. O efeito funciona nos dois geradores porque ambos compartilham a malha de terreno do laboratório.

Testes `tests/ascii-grass.test.mjs`: posições estáveis, alfabeto restrito, inclinação variável e congelamento em movimento reduzido. Sintaxe dos módulos verificada.

Ajuste explícito posterior: substituir `I` maiúsculo por `i` minúsculo nas lâminas de grama.

## Grama inspirada nas referências Moonlit Cave enviadas

O usuário pediu aproximar a grama das duas imagens fornecidas, sem flores. Características adotadas: lâminas mais altas que uma célula, alturas e inclinações variadas, sobreposição, tufos com densidade irregular e clareiras, verdes frios dessaturados com pequenas variações e vento defasado por lâmina. O conjunto continua `i`, `l` e `/`; transforms CSS alongam e inclinam cada lâmina sem alterar o avanço da grade. O vento modifica a inclinação continuamente em vez de alternar linhas inteiras entre caracteres. Movimento reduzido mantém uma inclinação estática.

A máscara de solo continua limitando a origem dos tufos ao terreno. Distribuição e proporções são aproximações de implementação para avaliação visual, não reprodução exata do material de referência. Sem flores, partículas ou brilhos adicionados. Testes verificam estabilidade das posições/cores, variação de inclinação e congelamento da animação.

## Limpeza das dependências dos laboratórios — 01/11/2026

Por solicitação do usuário, removidas as distribuições completas de bibliotecas. Cheoma foi empacotado apenas com PRESETS, buildBuilding, disposeBuilding e planVillage; Three mantém somente os dois módulos de runtime, OrbitControls e BufferGeometryUtils. Removidos o UMD não utilizado do textmode, a distribuição redundante do threejs-city e o conversor antigo ascii-cells com seus testes obsoletos. Bundles, versões, licenças, fonte do diagnóstico e instruções de reprodução permanecem em `dist/vendor/`. Referências históricas a caminhos `cheoma/src/` e ascii-cells descrevem versões anteriores, não os arquivos atuais.

Resultado da limpeza: arquivos novos não rastreados reduzidos de 799 para 35; dependências locais de 789 arquivos/15,9 MB para 25 arquivos/3,4 MB, incluindo documentação adicional de reprodução. Testes de grama e threejs-city passaram; Cheoma planejou povoado e vila usando o bundle reduzido, e a casa 3D/ASCII foi conferida visualmente no Chrome. Saves não foram alterados.
