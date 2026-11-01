# Cheoma no LORDES

Cheoma 0.1.0, MIT. `lordes-bundle.mjs` contém somente as APIs exportadas por
`lordes-entry.mjs`; Three é uma dependência externa compartilhada com o laboratório.

Para reproduzir o bundle, baixe a distribuição oficial `cheoma@0.1.0` do npm em
um diretório temporário, copie `lordes-entry.mjs` para a raiz extraída (ao lado de
`src/`) e execute com esbuild 0.28.2:

```sh
esbuild lordes-entry.mjs --bundle --format=esm --platform=browser --external:three --external:three/* --minify --legal-comments=eof --outfile=lordes-bundle.mjs
```

Copie o resultado para esta pasta. O código-fonte original não precisa permanecer
no repositório. Licença e metadados originais foram preservados.
