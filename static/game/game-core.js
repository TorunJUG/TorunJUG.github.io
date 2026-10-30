(() => {
const DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const tileKey = ({ x, y }) => `${x}:${y}`;

const findReachableTiles = (start, isWalkable) => {
  const queue = [{ ...start }];
  const visited = new Set([tileKey(start)]);
  const reachable = [];

  while (queue.length > 0) {
    const current = queue.shift();
    reachable.push(current);

    DIRECTIONS.forEach((direction) => {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y,
      };
      const key = tileKey(next);

      if (!visited.has(key) && isWalkable(next.x, next.y)) {
        visited.add(key);
        queue.push(next);
      }
    });
  }

  return reachable;
};

const placeCollectibles = ({ start, count, isWalkable, random = Math.random }) => {
  const candidates = findReachableTiles(start, isWalkable).filter((tile) => {
    const distanceFromStart = Math.abs(tile.x - start.x) + Math.abs(tile.y - start.y);
    return distanceFromStart > 1;
  });

  if (candidates.length < count) {
    throw new Error(`Mapa musi zawierać co najmniej ${count} osiągalnych pól na pierniki.`);
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[targetIndex]] = [candidates[targetIndex], candidates[index]];
  }

  return candidates.slice(0, count);
};

const computeDistanceField = (target, isWalkable) => {
  const distances = new Map([[tileKey(target), 0]]);
  const queue = [{ ...target }];

  while (queue.length > 0) {
    const current = queue.shift();
    const distance = distances.get(tileKey(current));

    DIRECTIONS.forEach((direction) => {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y,
      };
      const key = tileKey(next);

      if (!distances.has(key) && isWalkable(next.x, next.y)) {
        distances.set(key, distance + 1);
        queue.push(next);
      }
    });
  }

  return distances;
};

const pickSpawnTile = ({ start, avoid, minDistance, isWalkable, random = Math.random }) => {
  const distances = computeDistanceField(avoid, isWalkable);
  const reachable = findReachableTiles(start, isWalkable);
  const farTiles = reachable.filter((tile) => distances.get(tileKey(tile)) >= minDistance);
  const candidates = farTiles.length > 0 ? farTiles : reachable;
  return candidates[Math.floor(random() * candidates.length)];
};

const chooseChaseStep = ({ from, distances, isWalkable, isBlocked = () => false, wander = 0, random = Math.random }) => {
  const neighbours = DIRECTIONS
    .map((direction) => ({ x: from.x + direction.x, y: from.y + direction.y }))
    .filter((tile) => isWalkable(tile.x, tile.y) && !isBlocked(tile));

  if (neighbours.length === 0) return undefined;

  if (random() < wander) {
    return neighbours[Math.floor(random() * neighbours.length)];
  }

  const ranked = neighbours
    .map((tile) => ({ tile, distance: distances.get(tileKey(tile)) ?? Infinity }))
    .sort((a, b) => a.distance - b.distance || random() - 0.5);

  return ranked[0].tile;
};

window.TjugGameCore = Object.freeze({
  chooseChaseStep,
  computeDistanceField,
  findReachableTiles,
  pickSpawnTile,
  placeCollectibles,
});
})();
