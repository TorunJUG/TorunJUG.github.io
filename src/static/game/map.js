(() => {
const TILE_SIZE = 32;
const MAP_WIDTH = 24;
const MAP_HEIGHT = 16;

// Every level uses the same tile alphabet; the theme only changes how tiles are drawn:
// "." floor, ":" path (both walkable), "~" hazard and "#" wall (both blocking).
const LEVEL_DEFINITIONS = [
  {
    id: "garden",
    name: "Piernikowy ogród",
    theme: "garden",
    startTile: { x: 2, y: 8 },
    map: [
      "########################",
      "#......................#",
      "#..######.......####...#",
      "#..#...............#...#",
      "#..#..~~~~~~.......#...#",
      "#.....~~~~~~~~.........#",
      "#.....~~~~~~...........#",
      "#..#######.....#####...#",
      "#::::::::::::::::::::::#",
      "#...#####...#####......#",
      "#...#.........#........#",
      "#...#..##.##..#........#",
      "#......#...#...........#",
      "#..#####...#####.......#",
      "#::::::::::::::::::::::#",
      "########################",
    ],
  },
  {
    id: "dungeon",
    name: "Lochy pod Starówką",
    theme: "dungeon",
    startTile: { x: 2, y: 6 },
    map: [
      "########################",
      "#.....#.........#......#",
      "#.....#..~~~....#......#",
      "#.....#..~~~...........#",
      "#..............#...##..#",
      "###.#####..#####...##..#",
      "#::::::::::::::::::::::#",
      "#..#####.####..#####.###",
      "#..#.........#......#..#",
      "#..#..~~~....#......#..#",
      "#.....~~~....#..##.....#",
      "#..#.........#..##..#..#",
      "#..#####.#####......#..#",
      "#::::::::::::::::::::::#",
      "#......#........#......#",
      "########################",
    ],
  },
  {
    id: "sky",
    name: "Podniebne chmury",
    theme: "sky",
    startTile: { x: 1, y: 7 },
    map: [
      "########################",
      "#......~~~~......##....#",
      "#..##..~~~~..........~~#",
      "#..##::::::::::::....~~#",
      "#......~~~~......##....#",
      "#~~~...~~~~...~~~##..###",
      "#~~~..........~~~......#",
      "#::::::...##.....::::::#",
      "#.....~~~.##..~~~......#",
      "###...~~~.....~~~..##..#",
      "#.......##........##...#",
      "#..~~~..##..~~~~~......#",
      "#..~~~::::::::~~~...~~~#",
      "#......##....~~~~...~~~#",
      "#......##..............#",
      "########################",
    ],
  },
  {
    id: "city",
    name: "Gotyckie miasto",
    theme: "city",
    startTile: { x: 1, y: 4 },
    map: [
      "########################",
      "#..###..###..###..###..#",
      "#..###..###..###..###..#",
      "#......................#",
      "#::::::::::::::::::::::#",
      "#......................#",
      "#..####...~~~~...####..#",
      "#..####...~~~~...####..#",
      "#..####..........####..#",
      "#::::::::::::::::::::::#",
      "#..##..###....###..##..#",
      "#..##..###....###..##..#",
      "#......###....###......#",
      "#::::::::::::::::::::::#",
      "#....##............##..#",
      "########################",
    ],
  },
];

const createLevel = (definition) => {
  const { map, startTile } = definition;
  const isWalkable = (x, y) => {
    const tile = map[y]?.[x];
    return tile === "." || tile === ":";
  };

  if (map.length !== MAP_HEIGHT || map.some((row) => row.length !== MAP_WIDTH)) {
    throw new Error(`Plansza "${definition.id}" musi mieć wymiary ${MAP_WIDTH}x${MAP_HEIGHT}.`);
  }
  if (!isWalkable(startTile.x, startTile.y)) {
    throw new Error(`Pole startowe planszy "${definition.id}" musi być dostępne.`);
  }

  return Object.freeze({
    ...definition,
    map: Object.freeze([...map]),
    startTile: Object.freeze({ ...startTile }),
    isWalkable,
  });
};

const LEVELS = Object.freeze(LEVEL_DEFINITIONS.map(createLevel));

// Draws a level at random, skipping the previous one so a restart always brings a new board.
const pickRandomLevel = (previous, random = Math.random) => {
  const candidates = LEVELS.filter((level) => level !== previous);
  return candidates[Math.floor(random() * candidates.length)];
};

window.TjugGameMap = Object.freeze({
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  LEVELS,
  pickRandomLevel,
});
})();
