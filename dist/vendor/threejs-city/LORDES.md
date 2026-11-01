threejs-city 0.1.0 (Apache-2.0), usado no laboratório pelo adaptador game/city-generator.mjs.
O bundle contém apenas a API de planejamento e geometria de lordes-entry.mjs e suas dependências.
Materiais TSL/WebGPU, clima, população global e integração de terreno do City.create não são usados.

Reprodução (em diretório temporário):

    npm install --ignore-scripts --legacy-peer-deps esbuild@0.28.2 threejs-city@0.1.0 three@0.186.0

Copiar lordes-entry.mjs para esse diretório e executar esbuild com --bundle --format=esm --platform=browser --minify --legal-comments=eof.
O resultado é lordes-bundle.mjs. Dependências transitivas desta compilação: threejs-biomes 0.1.0 e threejs-heightfield 0.1.0.
Licenças preservadas em LICENSE e licenses/. Nenhum CDN é necessário durante o jogo.

A biblioteca utiliza seu próprio Three para operações de dados/geometria. O adaptador transfere arrays para o Three do LORDES, sem misturar cenas, materiais ou instâncias gráficas das duas versões.
