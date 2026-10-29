# Saves por nome

## Executar

```bash
./deploy.sh
```

O script inicia `server.py` e o ngrok. Para jogar apenas localmente, sem ngrok:

```bash
python3 server.py --port 8080
```

Abra `http://127.0.0.1:8080`. O antigo servidor estático (`python3 -m http.server`) não atende as rotas de save. Se já houver uma versão antiga rodando, encerre-a e execute novamente `./deploy.sh`.

## Entrada e identidade

O formulário pede apenas o nome. Espaços extras são normalizados; maiúsculas e minúsculas identificam a mesma partida. Acentos são preservados. Nomes aceitam de 1 a 40 letras, números, espaços, pontos, hífens, apóstrofos e sublinhados.

Não há senha ou autenticação: quem informar o mesmo nome abre a mesma partida. Os saves ficam na máquina que executa `server.py`, então o mesmo nome pode continuar a partida em outro navegador pelo mesmo servidor/ngrok.

## Arquivos

Os JSONs ficam em `saves/`, na raiz do projeto, fora da pasta pública `dist/`. O nome do arquivo combina um trecho legível do nome com um hash, evitando caminhos arbitrários e colisões entre nomes semelhantes. Exemplo: `saves/joaquim-<hash>.json`.

Cada arquivo contém:

- `formatVersion`, `name`, `revision`, `savedAt`;
- `state.version` e pausa;
- `state.inventory`, indexado pelo ID dos itens;
- `state.areas`: todas as instâncias conquistadas, seus IDs, definição e nome próprio;
- `state.citizens`: identidade, deck, bundle, área atual e progresso de cada geração.

A lista de áreas salvas é restaurada integralmente: não é substituída pelas quatro áreas iniciais. Itens novos adicionados ao catálogo começam zerados. Referências a conteúdos removidos ou versões desconhecidas interrompem a entrada com uma mensagem, preservando o arquivo original.

## Quando salva

- Antes de entrar pela primeira vez com um nome novo.
- Automaticamente a cada 5 segundos.
- Após alocar, transferir ou devolver cidadãos.
- Ao clicar em **Salvar** ou **Sair**.
- Ao ocultar/fechar a página, tenta uma gravação final com `keepalive`. Fechar o navegador ou interromper a rede abruptamente ainda pode perder os últimos segundos; o salvamento periódico é a garantia principal.

A mão ainda arrastando não é gravada: movimentações são confirmadas apenas ao soltar num destino válido. Não existe produção offline.

A gravação usa arquivo temporário e troca atômica. Um JSON existente inválido não é substituído automaticamente. Erros de disco/conexão aparecem na interface. Revisões impedem duas abas de sobrescrever silenciosamente a mesma partida; ao detectar conflito, saia e entre novamente para carregar o save atual.

Para backup, copie a pasta `saves/` com o servidor parado. Os saves são ignorados pelo Git. Hospedagem puramente estática não oferece essas rotas: esta versão depende do servidor Python.

## Testes

```bash
node tests/engine.test.mjs
node tests/save.test.mjs
python3 -m unittest discover -s tests -p 'test_server.py' -v
```

## Estado inicial de novas partidas

- Apenas o deck Povo Do Norte, com 100 Commonners disponíveis.
- Apenas Floresta de Carvalho e Pedreira de Granito conquistadas.
- Nenhum cidadão alocado e todos os estoques zerados.

Campos de Trigo e Pomar de Maçãs continuam no catálogo para futuras conquistas. A mudança só vale para nomes sem save existente: partidas anteriores preservam suas áreas, cidadãos e alocações.
