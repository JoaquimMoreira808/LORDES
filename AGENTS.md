# Orientações para implementar no LORDES

Antes de alterar regras ou interface, leia [os padrões do projeto](docs/padroes-projeto.md) e a documentação técnica pertinente:

- [Entidades e coleta](docs/entidades.md).
- [Interface](docs/design-system.md).
- [Saves](docs/saves.md).

Preserve as decisões do usuário registradas nesses documentos. Uma nova instrução explícita do usuário prevalece; atualize a documentação quando ela mudar o padrão.

Pontos essenciais:

- Cada cidadão tem um ciclo de coleta e sorteia um único tipo de item por ciclo. Não criar ciclos ou testes independentes por item.
- Não revelar a loot table nos detalhes das áreas. Mostrar apenas o progresso geral e o tempo de coleta.
- A sidebar de recursos mostra apenas estoque positivo e permite pesquisa pelo nome.
- Padronizar as duas sidebars; recolhidas, manter uma faixa cinza lateral. Preservar as abas Ações e Decks, com Ações vazia até nova solicitação.
- Preferir ícones carregados por nome e pixelizados em tempo de execução; não gerar ou gravar novas artes sem necessidade autorizada.
- Preservar saves, IDs estáveis e itens já coletados. Remover um resultado da loot table não significa apagar seu estoque ou sua definição.
- Separar catálogo, motor puro e apresentação. Atualizar os testes relevantes quando mudar comportamento.

Distinguir requisitos do usuário de valores escolhidos durante a implementação. Não tratar ajustes numéricos atuais ou uma implementação ainda sem verificação visual como aprovação explícita do usuário.
