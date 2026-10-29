// Cenário explícito de produção para testar o motor sem depender do início da partida.
export const productionSetup = {
 areas: [
  {id:'farm',definitionId:'campos-trigo'},
  {id:'wood',definitionId:'floresta-carvalho'},
  {id:'mine',definitionId:'pedreira-granito'},
  {id:'fruit',definitionId:'pomar-macas'}
 ],
 populations:[{bundleId:'norte-commonners',quantidade:100}],
 assignments:[{citizenId:1,areaId:'farm'},{citizenId:2,areaId:'wood'},{citizenId:3,areaId:'mine'},{citizenId:4,areaId:'fruit'}]
};
