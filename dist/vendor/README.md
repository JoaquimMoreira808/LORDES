# Dependências locais dos laboratórios

Sem CDN em execução. Foram mantidos apenas bundles, módulos usados, fontes,
licenças e metadados de versão:

- Cheoma 0.1.0 (MIT): bundle de construção e planejamento. Reprodução em `cheoma/LORDES.md`.
- Three 0.185.1 (MIT): `three.module.js`, `three.core.js`, OrbitControls e BufferGeometryUtils.
- textmode.js 0.18.0: somente o módulo ESM e sua licença, usado pelo diagnóstico de glifos.
- DejaVu Sans Mono: fonte do diagnóstico; licença em `fonts/LICENSE-DejaVu.txt`.
- threejs-city 0.1.0 (Apache-2.0): bundle de planejamento/geometria; reprodução e licenças em `threejs-city/LORDES.md`.

As distribuições completas, exemplos não usados e conversores substituídos foram
removidos. Os entrypoints pequenos dos bundles documentam suas APIs públicas.
