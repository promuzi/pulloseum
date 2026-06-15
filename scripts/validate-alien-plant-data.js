'use strict';

const AlienPlantGameData = require('../data/alien-plant-pvp-data.js');

const {
  gameData,
  validateGameData,
  createPlantInstance,
} = AlienPlantGameData;

const result = validateGameData(gameData);

if (!result.ok) {
  console.error('Alien plant PvP data validation failed:');
  result.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

const samplePlant = createPlantInstance({
  seed_id: gameData.seeds[0].id,
  custom_name: '검증용 배양체',
});

console.log('Alien plant PvP data validation passed.');
console.log(`Planets: ${gameData.planets.length}`);
console.log(`Regions: ${gameData.regions.length}`);
console.log(`Seeds: ${gameData.seeds.length}`);
console.log(`Traits: ${gameData.traits.length}`);
console.log(`Items: ${gameData.items.length}`);
console.log(`Tournaments: ${gameData.tournaments.length}`);
console.log(`Sample PlantInstance: ${samplePlant.unique_id} (${samplePlant.seed_id})`);
