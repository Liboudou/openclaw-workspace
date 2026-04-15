// In-memory Pokemon database

const TYPES = {
  fire: '#F08030',
  water: '#6890F0',
  grass: '#78C850',
  electric: '#F8D030',
  psychic: '#F85888',
  ice: '#98D8D8',
  dragon: '#7038F8',
  dark: '#705848',
  fairy: '#EE99AC',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  steel: '#B8B8D0',
  normal: '#A8A878',
};

let nextId = 1;

const pokemon = new Map();

const seed = [
  { name: 'Charizard', type: 'fire', hp: 120, moves: ['Flamethrower', 'Fire Blast', 'Dragon Claw', 'Air Slash'], spriteId: 6 },
  { name: 'Blastoise', type: 'water', hp: 100, moves: ['Hydro Pump', 'Surf', 'Ice Beam', 'Skull Bash'], spriteId: 9 },
  { name: 'Venusaur', type: 'grass', hp: 100, moves: ['Solar Beam', 'Razor Leaf', 'Sludge Bomb', 'Earthquake'], spriteId: 3 },
  { name: 'Pikachu', type: 'electric', hp: 55, moves: ['Thunderbolt', 'Quick Attack', 'Iron Tail', 'Volt Tackle'], spriteId: 25 },
  { name: 'Mewtwo', type: 'psychic', hp: 150, moves: ['Psychic', 'Shadow Ball', 'Aura Sphere', 'Recover'], spriteId: 150 },
  { name: 'Gengar', type: 'ghost', hp: 85, moves: ['Shadow Ball', 'Sludge Bomb', 'Dream Eater', 'Hypnosis'], spriteId: 94 },
  { name: 'Dragonite', type: 'dragon', hp: 134, moves: ['Dragon Claw', 'Hyper Beam', 'Thunder Punch', 'Outrage'], spriteId: 149 },
  { name: 'Gyarados', type: 'water', hp: 125, moves: ['Hydro Pump', 'Dragon Dance', 'Crunch', 'Ice Fang'], spriteId: 130 },
  { name: 'Arcanine', type: 'fire', hp: 115, moves: ['Flare Blitz', 'Extreme Speed', 'Wild Charge', 'Close Combat'], spriteId: 59 },
  { name: 'Alakazam', type: 'psychic', hp: 75, moves: ['Psychic', 'Shadow Ball', 'Focus Blast', 'Calm Mind'], spriteId: 65 },
  { name: 'Machamp', type: 'fighting', hp: 130, moves: ['Dynamic Punch', 'Cross Chop', 'Earthquake', 'Bullet Punch'], spriteId: 68 },
  { name: 'Lapras', type: 'ice', hp: 130, moves: ['Ice Beam', 'Surf', 'Thunderbolt', 'Sing'], spriteId: 131 },
  { name: 'Snorlax', type: 'normal', hp: 160, moves: ['Body Slam', 'Rest', 'Earthquake', 'Crunch'], spriteId: 143 },
  { name: 'Eevee', type: 'normal', hp: 55, moves: ['Quick Attack', 'Bite', 'Swift', 'Last Resort'], spriteId: 133 },
  { name: 'Lucario', type: 'fighting', hp: 100, moves: ['Aura Sphere', 'Flash Cannon', 'Close Combat', 'Extreme Speed'], spriteId: 448 },
  { name: 'Garchomp', type: 'dragon', hp: 130, moves: ['Dragon Claw', 'Earthquake', 'Stone Edge', 'Swords Dance'], spriteId: 445 },
  { name: 'Umbreon', type: 'dark', hp: 95, moves: ['Dark Pulse', 'Moonlight', 'Toxic', 'Foul Play'], spriteId: 197 },
  { name: 'Gardevoir', type: 'fairy', hp: 90, moves: ['Moonblast', 'Psychic', 'Shadow Ball', 'Calm Mind'], spriteId: 282 },
  { name: 'Tyranitar', type: 'rock', hp: 140, moves: ['Stone Edge', 'Crunch', 'Earthquake', 'Dragon Dance'], spriteId: 248 },
  { name: 'Bulbasaur', type: 'grass', hp: 45, moves: ['Vine Whip', 'Tackle', 'Razor Leaf', 'Sleep Powder'], spriteId: 1 },
];

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Seed the database
seed.forEach((p) => {
  const id = nextId++;
  pokemon.set(id, {
    id,
    name: p.name,
    type: p.type,
    typeColor: TYPES[p.type] || '#A8A878',
    hp: p.hp,
    moves: p.moves,
    image: spriteUrl(p.spriteId),
  });
});

function getAll({ type, search } = {}) {
  let results = [...pokemon.values()];
  if (type) {
    results = results.filter((p) => p.type === type.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((p) => p.name.toLowerCase().includes(q));
  }
  return results;
}

function getById(id) {
  return pokemon.get(Number(id)) || null;
}

function add({ name, type, hp, moves }) {
  const id = nextId++;
  const entry = {
    id,
    name,
    type: type.toLowerCase(),
    typeColor: TYPES[type.toLowerCase()] || '#A8A878',
    hp: Number(hp),
    moves: Array.isArray(moves) ? moves : moves.split(',').map((m) => m.trim()),
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png`,
  };
  pokemon.set(id, entry);
  return entry;
}

function remove(id) {
  return pokemon.delete(Number(id));
}

function getTypes() {
  return TYPES;
}

module.exports = { getAll, getById, add, remove, getTypes };
