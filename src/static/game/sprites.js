// Pixel-art sprites and map tiles. Every graphic is drawn pixel by pixel on a 32x32 grid
// and rendered 1:1 on the canvas (one world unit = one tile = 32 screen pixels).
(() => {
const { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } = window.TjugGameMap;

// Sprites are symmetric: each row lists the left 16 pixels and is mirrored to 32,
// then the top-left light highlights are painted on top.
const mirrorRows = (halves, highlights = []) => {
  const rows = halves.map((half) => [...half, ...[...half].reverse()]);
  highlights.forEach(([x, y, key]) => {
    rows[y][x] = key;
  });
  return rows.map((row) => row.join(""));
};

const GINGERBREAD2 = mirrorRows([
  "................",
  "................",
  "................",
  ".........ooooo..",
  "........oodlloo.",
  ".......ooddldloo",
  ".......oolddddlo",
  ".......ooddldddl",
  ".......ooddlddld",
  "........oodddddl",
  ".........ooddddd",
  "..........odddld",
  ".........oodlddd",
  "........oodddddl",
  ".......ooddldddd",
  ".......oolddddld",
  ".......ooddldddd",
  ".......oodddddld",
  "........oodddddd",
  ".........oodlddd",
  "..........oddldd",
  ".........ooldldd",
  "........oodddddd",
  ".......oooldlddd",
  ".......ooddldddl",
  ".......oolddldlo",
  ".......ooddddloo",
  "........oodlloo.",
  ".........ooooo..",
  "................",
  "................",
  "................",
], []);

const GINGERBREAD = mirrorRows([
  "................",
  "................",
  "................",
  ".............ooo",
  "............oddd",
  "...........odddd",
  "...........oddwd",
  "...........odddd",
  "...........odwdd",
  "...........oddww",
  "............oddd",
  ".......ooooooddd",
  "......oddddddddd",
  "......odwwdddddr",
  "......oddddddddd",
  ".......ooooodddd",
  "...........odddr",
  "...........odddd",
  "...........odddr",
  "...........odddd",
  "..........oddddd",
  "..........oddddo",
  ".........oddddo.",
  ".........owwwwo.",
  "........oddddo..",
  "........oddddo..",
  "........oooooo..",
  ".........xxxxxxx",
  "................",
  "................",
  "................",
  "................",
], [
  [13, 4, "l"], [14, 4, "l"], [15, 4, "l"], [16, 4, "l"],
  [12, 5, "l"], [13, 5, "l"], [12, 6, "l"],
  [7, 12, "l"], [8, 12, "l"], [9, 12, "l"], [10, 12, "l"], [11, 12, "l"], [12, 12, "l"],
  [12, 16, "l"], [12, 17, "l"], [10, 24, "l"],
]);

const GINGERBREAD_PALETTE = {
  o: "#4a1f0a",
  d: "#b8541f",
  l: "#d9793a",
  w: "#fff1d6",
  r: "#e0402a",
  x: "rgba(0, 0, 0, 0.28)",
};

// Drawn facing up; rotated in 90-degree steps, which keeps the pixel grid intact.
const BUG = mirrorRows([
  "................",
  "................",
  "................",
  "..........l.....",
  "...........l....",
  "............l...",
  ".............ooo",
  "............oddd",
  "............odwd",
  "............oddd",
  "..........oooooo",
  ".........osssssd",
  "...l....ossssssd",
  "....llllossssssd",
  "........ossssssd",
  "........osssddsd",
  "........osssddsd",
  "...lllllossssssd",
  "........ossssssd",
  "........osddsssd",
  "........osddsssd",
  "....llllossssssd",
  "...l....ossssssd",
  ".........osssssd",
  "..........ossssd",
  "...........ooooo",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], [
  [11, 11, "h"], [12, 11, "h"], [10, 12, "h"], [11, 12, "h"], [10, 13, "h"],
]);

const BUG_PALETTE = {
  o: "#0d290f",
  l: "#0d290f",
  s: "#33b82e",
  h: "#a6f272",
  d: "#12591a",
  w: "#e8ffe0",
};

const COLORS = {
  grass: ["#40924a", "#459850"],
  grassDark: "#357d3e",
  grassLight: "#6fbf57",
  flower: "#ffe08a",
  flowerAlt: "#f7f2ff",
  path: "#ab7038",
  pathDark: "#8c5730",
  pathLight: "#c98d4f",
  pathEdge: "#6e4224",
};

const GARDEN_WATER = {
  water: "#1473a6",
  waterDeep: "#0e5a86",
  waterLight: "#59ccdb",
  waterFoam: "#c8f4f6",
  shore: "#0b3e5c",
};

const GARDEN_BUSH = {
  shadow: "#0a3318",
  dark: "#145c2a",
  mid: "#1f7a35",
  light: "#3aa047",
  shine: "#7fd36a",
};

const DUNGEON = {
  stone: ["#4a4658", "#524d61"],
  stoneLight: "#6b6680",
  stoneDark: "#3d3a4a",
  mortar: "#2a2735",
  moss: "#3f6b45",
  carpet: "#8e1f2b",
  carpetDark: "#6a1520",
  carpetTrim: "#d8a93b",
  lava: "#e0521b",
  lavaDark: "#a8280f",
  lavaLight: "#ffb02e",
  lavaGlow: "#fff1a0",
  crust: "#2b1410",
  brick: "#5d4a44",
  brickLight: "#7a635a",
  brickDark: "#3b2e2b",
  wallTop: "#26212b",
  wallTopLight: "#3a3342",
  torch: "#5a3a1e",
};

const SKY = {
  cloud: "#f4f7ff",
  cloudShade: "#dfe6f7",
  cloudDeep: "#c4cfe8",
  sky: "#6fb4ec",
  skyDeep: "#5aa2e0",
  skyLight: "#a9d8f7",
  wisp: "#ffffff",
  rainbow: ["#e9483f", "#f59a3a", "#f7d84a", "#5cc25a", "#4a8fe0", "#8a5cd6"],
  lightning: "#ffe86b",
};

const STORM_CLOUD = {
  shadow: "#2c2a45",
  dark: "#45436a",
  mid: "#5c5a86",
  light: "#7b79a6",
  shine: "#a9a7cf",
};

const CITY = {
  // Grey field stones, a few of them with a rusty, iron-rich tint.
  cobbles: ["#8f8c88", "#9b9791", "#7f7c79", "#a5a099", "#968a80", "#9e8676", "#8a7b70"],
  joint: "#4f4a45",
  asphalt: "#45474f",
  asphaltDark: "#383a41",
  asphaltLight: "#565962",
  curb: "#9c978d",
  curbLight: "#d8d4ca",
  line: "#f2efe4",
  // Brick-red roof tiles in several firings, from pale orange to burnt brown.
  roofTiles: ["#a8432c", "#b54e33", "#963a27", "#c25a3a", "#8f3b2a", "#b8603f", "#7e3324"],
  roofMortar: "#4a1a12",
  roofRidge: "#d27450",
  roofEdge: "#3d1610",
  chimney: "#6d3b2c",
  chimneyTop: "#2a1a14",
  smoke: "#d9d6cf",
};

const CITY_WATER = {
  water: "#2f7fa8",
  waterDeep: "#21648a",
  waterLight: "#7fd0e0",
  waterFoam: "#d6f3f6",
  shore: "#6d6a64",
};

// Deterministic per-pixel noise, so the map looks the same on every reload.
const hash = (x, y, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const drawPixelArt = (rows, palette) => {
  const canvas = createCanvas(TILE_SIZE, TILE_SIZE);
  const context = canvas.getContext("2d");

  rows.forEach((row, y) => {
    [...row].forEach((key, x) => {
      if (!palette[key]) return;
      context.fillStyle = palette[key];
      context.fillRect(x, y, 1, 1);
    });
  });

  return canvas;
};

// The map being drawn; set by drawMap so tile painters can look at their neighbours.
let currentMap = [];
const tileAt = (x, y) => currentMap[y]?.[x] ?? "#";

const forEachPixel = (callback) => {
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      callback(x, y);
    }
  }
};

// --- Garden ---------------------------------------------------------------

const drawGrass = (put, tx, ty) => {
  const base = COLORS.grass[(tx + ty) % 2];

  forEachPixel((x, y) => {
    put(x, y, hash(tx * 32 + x, ty * 32 + y, 1) < 0.07 ? COLORS.grassDark : base);
  });

  // A few 3-pixel grass tufts per tile.
  for (let i = 0; i < 3; i += 1) {
    const x = 3 + Math.floor(hash(tx, ty, 10 + i) * 26);
    const y = 4 + Math.floor(hash(tx, ty, 20 + i) * 25);
    put(x - 1, y, COLORS.grassLight);
    put(x, y - 1, COLORS.grassLight);
    put(x + 1, y, COLORS.grassLight);
    put(x, y, COLORS.grassDark);
  }

  if (hash(tx, ty, 30) < 0.12) {
    const x = 6 + Math.floor(hash(tx, ty, 31) * 20);
    const y = 6 + Math.floor(hash(tx, ty, 32) * 20);
    const petal = hash(tx, ty, 33) < 0.5 ? COLORS.flower : COLORS.flowerAlt;
    put(x - 1, y, petal);
    put(x + 1, y, petal);
    put(x, y - 1, petal);
    put(x, y + 1, petal);
    put(x, y, "#f4512c");
  }
};

const drawPath = (put, tx, ty) => {
  const pathAbove = tileAt(tx, ty - 1) === ":";
  const pathBelow = tileAt(tx, ty + 1) === ":";

  forEachPixel((x, y) => {
    const noise = hash(tx * 32 + x, ty * 32 + y, 2);
    let color = noise < 0.1 ? COLORS.pathDark : noise > 0.94 ? COLORS.pathLight : COLORS.path;
    if ((!pathAbove && y < 2) || (!pathBelow && y > 29)) color = COLORS.pathEdge;
    else if ((!pathAbove && y < 4) || (!pathBelow && y > 27)) color = COLORS.pathDark;
    put(x, y, color);
  });

  // Pebbles: 2x2 stones with a highlight pixel.
  for (let i = 0; i < 2; i += 1) {
    const x = 4 + Math.floor(hash(tx, ty, 40 + i) * 23);
    const y = 7 + Math.floor(hash(tx, ty, 50 + i) * 17);
    put(x, y, COLORS.pathLight);
    put(x + 1, y, COLORS.pathDark);
    put(x, y + 1, COLORS.pathDark);
    put(x + 1, y + 1, COLORS.pathEdge);
  }
};

const drawWater = (put, tx, ty, frame, palette) => {
  const waterAbove = tileAt(tx, ty - 1) === "~";
  const waterBelow = tileAt(tx, ty + 1) === "~";
  const waterLeft = tileAt(tx - 1, ty) === "~";
  const waterRight = tileAt(tx + 1, ty) === "~";

  forEachPixel((x, y) => {
    let color = hash(tx * 32 + x, ty * 32 + y, 3) < 0.05 ? palette.waterDeep : palette.water;
    if (!waterAbove && y < 4) color = y < 2 ? palette.shore : palette.waterDeep;
    if (!waterBelow && y > 29) color = palette.waterFoam;
    if (!waterLeft && x < 2) color = palette.shore;
    if (!waterRight && x > 29) color = palette.shore;
    put(x, y, color);
  });

  // Short horizontal wave dashes, shifted by 2px between animation frames.
  for (let i = 0; i < 3; i += 1) {
    const x = 4 + Math.floor(hash(tx, ty, 60 + i) * 18) + frame * 2;
    const y = 7 + i * 8 + Math.floor(hash(tx, ty, 70 + i) * 3);
    for (let dx = 0; dx < 6; dx += 1) put(x + dx, y, palette.waterLight);
    put(x + 1, y - 1, palette.waterFoam);
    put(x + 2, y - 1, palette.waterFoam);
  }
};

// Bush clumps are pixel-quantised circles shaded from the top-left with a 1px dark outline.
const BUSH_CLUMPS = [
  { x: 9, y: 11, r: 9 },
  { x: 22, y: 10, r: 9 },
  { x: 15, y: 20, r: 10 },
  { x: 6, y: 23, r: 7 },
  { x: 26, y: 23, r: 7 },
];

const drawBush = (put, tx, ty, palette) => {
  const inside = (x, y) => BUSH_CLUMPS.find((c) => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r ** 2);

  forEachPixel((x, y) => {
    const clump = inside(x, y);

    if (!clump) {
      put(x, y, palette.shadow);
      return;
    }

    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    const light = (x - clump.x) + (y - clump.y);
    let color = palette.mid;
    if (light > clump.r * 0.55) color = palette.dark;
    else if (light < -clump.r * 0.75) color = palette.light;
    if (hash(tx * 32 + x, ty * 32 + y, 4) < 0.08) color = palette.dark;
    if (edge) color = palette.shadow;
    put(x, y, color);
  });

  BUSH_CLUMPS.forEach((c, i) => {
    if (hash(tx, ty, 80 + i) < 0.5) return;
    put(c.x - 3, c.y - 4, palette.shine);
    put(c.x - 2, c.y - 4, palette.shine);
    put(c.x - 3, c.y - 3, palette.shine);
  });
};

// --- Dungeon --------------------------------------------------------------

// Flagstones are 16x16 slabs in a running bond, with a lit top-left bevel.
const drawFlagstones = (put, tx, ty) => {
  forEachPixel((x, y) => {
    const gx = tx * 32 + x;
    const gy = ty * 32 + y;
    const row = Math.floor(gy / 16);
    const sx = gx + (row % 2) * 8;
    const slab = Math.floor(sx / 16);
    let color = DUNGEON.stone[hash(slab, row, 5) < 0.5 ? 0 : 1];
    if (hash(gx, gy, 6) < 0.06) color = DUNGEON.stoneDark;
    if (gy % 16 === 1 || sx % 16 === 1) color = DUNGEON.stoneLight;
    if (gy % 16 === 0 || sx % 16 === 0) {
      color = hash(gx, gy, 7) < 0.12 ? DUNGEON.moss : DUNGEON.mortar;
    }
    put(x, y, color);
  });

  if (hash(tx, ty, 8) < 0.2) {
    const x = 4 + Math.floor(hash(tx, ty, 9) * 20);
    const y = 4 + Math.floor(hash(tx, ty, 11) * 20);
    [[0, 0], [1, 1], [2, 1], [3, 2], [3, 3], [4, 4]].forEach(([dx, dy]) => put(x + dx, y + dy, DUNGEON.mortar));
  }
};

const drawCarpet = (put, tx, ty) => {
  const carpetAbove = tileAt(tx, ty - 1) === ":";
  const carpetBelow = tileAt(tx, ty + 1) === ":";
  const carpetLeft = tileAt(tx - 1, ty) === ":";
  const carpetRight = tileAt(tx + 1, ty) === ":";

  drawFlagstones(put, tx, ty);

  forEachPixel((x, y) => {
    if ((!carpetAbove && y < 3) || (!carpetBelow && y > 28)) return;
    if ((!carpetLeft && x < 3) || (!carpetRight && x > 28)) return;

    const gx = tx * 32 + x;
    const gy = ty * 32 + y;
    let color = hash(gx, gy, 12) < 0.06 ? DUNGEON.carpetDark : DUNGEON.carpet;
    // A repeating diamond motif woven into the runner.
    if (Math.abs((gx % 16) - 8) + Math.abs((gy % 16) - 8) === 5) color = DUNGEON.carpetDark;
    if ((!carpetAbove && y < 5) || (!carpetBelow && y > 26)) color = DUNGEON.carpetTrim;
    if ((!carpetLeft && x < 5) || (!carpetRight && x > 26)) color = DUNGEON.carpetTrim;
    put(x, y, color);
  });
};

const drawLava = (put, tx, ty, frame) => {
  const lavaAbove = tileAt(tx, ty - 1) === "~";
  const lavaBelow = tileAt(tx, ty + 1) === "~";
  const lavaLeft = tileAt(tx - 1, ty) === "~";
  const lavaRight = tileAt(tx + 1, ty) === "~";

  forEachPixel((x, y) => {
    let color = hash(tx * 32 + x, ty * 32 + y, 13) < 0.08 ? DUNGEON.lavaDark : DUNGEON.lava;
    const edgeDistance = Math.min(
      lavaAbove ? 99 : y,
      lavaBelow ? 99 : 31 - y,
      lavaLeft ? 99 : x,
      lavaRight ? 99 : 31 - x
    );
    if (edgeDistance < 2) color = DUNGEON.crust;
    else if (edgeDistance < 4) color = DUNGEON.lavaDark;
    put(x, y, color);
  });

  // Glowing streaks drift by 2px between frames, bubbles grow and pop.
  for (let i = 0; i < 2; i += 1) {
    const x = 5 + Math.floor(hash(tx, ty, 14 + i) * 16) + frame * 2;
    const y = 9 + i * 12 + Math.floor(hash(tx, ty, 16 + i) * 3);
    for (let dx = 0; dx < 5; dx += 1) put(x + dx, y, DUNGEON.lavaLight);
  }

  for (let i = 0; i < 2; i += 1) {
    const x = 7 + Math.floor(hash(tx, ty, 18 + i) * 18);
    const y = 7 + Math.floor(hash(tx, ty, 20 + i) * 18);
    if ((frame + i) % 2 === 0) {
      put(x, y, DUNGEON.lavaGlow);
    } else {
      put(x - 1, y, DUNGEON.lavaLight);
      put(x + 1, y, DUNGEON.lavaLight);
      put(x, y - 1, DUNGEON.lavaLight);
      put(x, y + 1, DUNGEON.lavaLight);
      put(x, y, DUNGEON.lavaGlow);
    }
  }
};

// A wall shows its brick face when open floor lies below it, otherwise only its dark top.
const drawDungeonWall = (put, tx, ty, frame) => {
  const faceVisible = tileAt(tx, ty + 1) !== "#";
  const faceTop = faceVisible ? 10 : TILE_SIZE;

  forEachPixel((x, y) => {
    const gx = tx * 32 + x;

    if (y < faceTop) {
      let color = hash(gx, ty * 32 + y, 22) < 0.07 ? DUNGEON.wallTopLight : DUNGEON.wallTop;
      if (faceVisible && y === faceTop - 1) color = DUNGEON.wallTopLight;
      put(x, y, color);
      return;
    }

    const by = y - faceTop;
    const row = Math.floor(by / 6);
    const bx = gx + (row % 2) * 8;
    let color = hash(Math.floor(bx / 16), row + ty * 8, 23) < 0.3 ? DUNGEON.brickLight : DUNGEON.brick;
    if (by % 6 === 1) color = DUNGEON.brickLight;
    if (by % 6 === 0 || bx % 16 === 0) color = DUNGEON.brickDark;
    if (y === TILE_SIZE - 1) color = DUNGEON.mortar;
    put(x, y, color);
  });

  if (!faceVisible || hash(tx, ty, 24) > 0.3) return;

  // Wall torch: a bracket with a two-frame flickering flame.
  for (let y = 20; y < 27; y += 1) {
    put(15, y, DUNGEON.torch);
    put(16, y, DUNGEON.torch);
  }
  const flame = frame === 0
    ? [[15, 19, "lavaGlow"], [16, 19, "lavaGlow"], [15, 18, "lavaLight"], [16, 18, "lavaLight"], [14, 18, "lava"], [17, 19, "lava"], [16, 17, "lavaLight"], [15, 16, "lava"], [16, 15, "lava"]]
    : [[15, 19, "lavaGlow"], [16, 19, "lavaGlow"], [15, 18, "lavaGlow"], [16, 18, "lavaLight"], [17, 18, "lava"], [14, 19, "lava"], [15, 17, "lavaLight"], [15, 16, "lavaLight"], [16, 16, "lava"], [15, 15, "lava"]];
  flame.forEach(([x, y, key]) => put(x, y, DUNGEON[key]));
};

// --- Sky ------------------------------------------------------------------

const drawCloudFloor = (put, tx, ty) => {
  forEachPixel((x, y) => {
    put(x, y, hash(tx * 32 + x, ty * 32 + y, 25) < 0.05 ? SKY.cloudShade : SKY.cloud);
  });

  // Soft puff contours: lower halves of small pixel circles.
  for (let i = 0; i < 2; i += 1) {
    const cx = 6 + Math.floor(hash(tx, ty, 26 + i) * 20);
    const cy = 6 + Math.floor(hash(tx, ty, 28 + i) * 18);
    const r = 4 + Math.floor(hash(tx, ty, 30 + i) * 3);
    for (let step = 0; step <= 12; step += 1) {
      const angle = (step / 12) * Math.PI;
      put(cx + Math.round(Math.cos(angle) * r), cy + Math.round(Math.sin(angle) * r), SKY.cloudShade);
    }
  }
};

const drawSkyHole = (put, tx, ty, frame) => {
  const sides = [
    { open: tileAt(tx, ty - 1), depth: (x, y) => y, along: (x) => x },
    { open: tileAt(tx, ty + 1), depth: (x, y) => 31 - y, along: (x) => x },
    { open: tileAt(tx - 1, ty), depth: (x) => x, along: (x, y) => y },
    { open: tileAt(tx + 1, ty), depth: (x) => 31 - x, along: (x, y) => y },
  ];

  forEachPixel((x, y) => {
    let color = y > 20 ? SKY.skyDeep : SKY.sky;
    if (hash(tx * 32 + x, ty * 32 + y, 32) < 0.03) color = SKY.skyLight;

    // Neighbouring clouds bulge into the hole with a scalloped rim.
    sides.forEach(({ open, depth, along }) => {
      if (open === "~" || open === ":") return;
      const position = along(x, y) + (open === "#" ? 3 : 0);
      const bulge = 3 + Math.round(2 * Math.abs(Math.sin(position / 3)));
      const d = depth(x, y);
      if (d < bulge) color = open === "#" ? STORM_CLOUD.dark : SKY.cloud;
      else if (d === bulge) color = open === "#" ? STORM_CLOUD.shadow : SKY.cloudDeep;
    });

    put(x, y, color);
  });

  // Small wisps drifting by 2px between frames.
  for (let i = 0; i < 2; i += 1) {
    const x = 6 + Math.floor(hash(tx, ty, 34 + i) * 14) + frame * 2;
    const y = 9 + i * 10 + Math.floor(hash(tx, ty, 36 + i) * 3);
    for (let dx = 0; dx < 7; dx += 1) put(x + dx, y, SKY.wisp);
    for (let dx = 2; dx < 5; dx += 1) put(x + dx, y - 1, SKY.wisp);
  }
};

const drawRainbow = (put, tx, ty, frame) => {
  forEachPixel((x, y) => {
    const band = Math.min(SKY.rainbow.length - 1, Math.floor((y * SKY.rainbow.length) / TILE_SIZE));
    put(x, y, SKY.rainbow[band]);
  });

  // Twinkling sparkles alternate between frames.
  for (let i = 0; i < 3; i += 1) {
    if ((frame + i) % 2 === 1) continue;
    const x = 3 + Math.floor(hash(tx, ty, 38 + i) * 26);
    const y = 3 + Math.floor(hash(tx, ty, 40 + i) * 26);
    put(x, y, SKY.wisp);
    put(x - 1, y, SKY.cloudShade);
    put(x + 1, y, SKY.cloudShade);
    put(x, y - 1, SKY.cloudShade);
    put(x, y + 1, SKY.cloudShade);
  }
};

const LIGHTNING = [
  [17, 6], [16, 7], [16, 8], [15, 9], [15, 10], [14, 11], [15, 11], [16, 11], [17, 11],
  [16, 12], [16, 13], [15, 14], [15, 15], [14, 16], [14, 17], [13, 18],
];

const drawStormCloud = (put, tx, ty, frame) => {
  drawBush(put, tx, ty, STORM_CLOUD);
  if (frame === 1 && hash(tx, ty, 42) < 0.2) {
    LIGHTNING.forEach(([x, y]) => put(x, y, SKY.lightning));
  }
};

// --- City -----------------------------------------------------------------

// Scales a "#rrggbb" colour; used for pixel-level light and shadow.
const shade = (hex, factor) => {
  const value = parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 255, value & 255]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel * factor))));
  return `rgb(${channels.join(",")})`;
};

const COBBLE_CELL = 8;

// Each stone sits at a jittered point of an 8px grid; the nearest point owns the pixel.
const nearestCobbles = (gx, gy) => {
  const cellX = Math.floor(gx / COBBLE_CELL);
  const cellY = Math.floor(gy / COBBLE_CELL);
  let first = { distance: Infinity };
  let second = Infinity;

  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const cx = cellX + i;
      const cy = cellY + j;
      const dx = gx - (cx * COBBLE_CELL + 1.5 + hash(cx, cy, 60) * 5);
      const dy = gy - (cy * COBBLE_CELL + 1.5 + hash(cx, cy, 61) * 5);
      // Slightly stretched distances make the stones irregular ovals.
      const distance = Math.hypot(dx * (0.85 + hash(cx, cy, 62) * 0.3), dy * (0.85 + hash(cx, cy, 63) * 0.3));

      if (distance < first.distance) {
        second = first.distance;
        first = { distance, dx, dy, cx, cy };
      } else if (distance < second) {
        second = distance;
      }
    }
  }

  return { ...first, gap: second - first.distance };
};

// Round cobblestones lit from the top-left, in the shade of any building above or to the left.
const drawSidewalk = (put, tx, ty) => {
  const roofAbove = tileAt(tx, ty - 1) === "#";
  const roofLeft = tileAt(tx - 1, ty) === "#";

  forEachPixel((x, y) => {
    const stone = nearestCobbles(tx * 32 + x, ty * 32 + y);
    const radius = 3.6 + hash(stone.cx, stone.cy, 64) * 1.3;
    let base = CITY.joint;
    let light = 1;

    if (stone.gap >= 1.3 && stone.distance <= radius) {
      base = CITY.cobbles[Math.floor(hash(stone.cx, stone.cy, 65) * CITY.cobbles.length)];
      const slope = (stone.dx + stone.dy) / radius;
      if (slope < -0.6) light = 1.22;
      else if (slope < -0.15) light = 1.08;
      else if (slope > 0.75) light = 0.72;
      else if (slope > 0.35) light = 0.86;
      if (hash(tx * 32 + x, ty * 32 + y, 66) < 0.06) light *= 0.9;
    }

    if ((roofAbove && y < 6) || (roofLeft && x < 4)) light *= 0.68;
    put(x, y, shade(base, light));
  });
};

const drawRoad = (put, tx, ty) => {
  const roadAbove = tileAt(tx, ty - 1) === ":";
  const roadBelow = tileAt(tx, ty + 1) === ":";

  forEachPixel((x, y) => {
    const gx = tx * 32 + x;
    const noise = hash(gx, ty * 32 + y, 48);
    let color = noise < 0.08 ? CITY.asphaltDark : noise > 0.95 ? CITY.asphaltLight : CITY.asphalt;
    if (!roadAbove && !roadBelow && (y === 15 || y === 16) && gx % 16 < 8) color = CITY.line;
    if ((!roadAbove && y < 3) || (!roadBelow && y > 28)) color = CITY.curb;
    if ((!roadAbove && y === 0) || (!roadBelow && y === 29)) color = CITY.curbLight;
    if ((!roadAbove && y === 3) || (!roadBelow && y === 28)) color = CITY.asphaltDark;
    put(x, y, color);
  });
};

// Pixel row of the ridge of the building column containing (tx, ty): halfway between
// the first and last roof tile of the vertical run, so each building has two slopes.
const roofRidgeY = (tx, ty) => {
  let top = ty;
  let bottom = ty;
  while (top > 0 && tileAt(tx, top - 1) === "#") top -= 1;
  while (bottom < currentMap.length - 1 && tileAt(tx, bottom + 1) === "#") bottom += 1;
  return Math.floor(((top + bottom + 1) * TILE_SIZE) / 2);
};

// Red Gothic roofs seen from above: bevelled tiles in several firings, a lit north slope,
// a shaded south slope, dark eaves and the odd smoking chimney.
const drawRoof = (put, tx, ty, frame) => {
  const roofAbove = tileAt(tx, ty - 1) === "#";
  const roofBelow = tileAt(tx, ty + 1) === "#";
  const roofLeft = tileAt(tx - 1, ty) === "#";
  const roofRight = tileAt(tx + 1, ty) === "#";
  const ridgeY = roofRidgeY(tx, ty);

  forEachPixel((x, y) => {
    const gx = tx * 32 + x;
    const gy = ty * 32 + y;
    const row = Math.floor(gy / 4);
    const bx = gx + (row % 2) * 4;
    const brick = Math.floor(bx / 8);
    const lx = bx % 8;
    const ly = gy % 4;
    let base = CITY.roofTiles[Math.floor(hash(brick, row, 49) * CITY.roofTiles.length)];
    let light = 1;

    // Each tile is bevelled: lit top and left rims, shaded bottom and right rims.
    if (ly === 3 || lx === 0) base = CITY.roofMortar;
    else if (ly === 0) light = 1.22;
    else if (lx === 1) light = 1.1;
    else if (lx === 7 || ly === 2) light = 0.86;
    if (hash(gx, gy, 53) < 0.05) light *= 0.88;

    // Light comes from the north: the upper slope is brighter than the lower one.
    light *= gy < ridgeY ? 1.08 : 0.82;
    if (Math.abs(gy - ridgeY) <= 1) {
      base = CITY.roofRidge;
      light = gy < ridgeY ? 1.1 : 0.85;
    }

    // Eaves darken towards the outer walls of the building.
    if (!roofBelow && y > 26) light *= 0.7 - (y - 27) * 0.08;
    if (!roofRight && x > 28) light *= 0.78;
    if (!roofLeft && x < 2) light *= 1.12;

    let color = shade(base, light);
    if ((!roofAbove && y < 1) || (!roofLeft && x < 1) || (!roofRight && x > 30) || (!roofBelow && y > 30)) {
      color = CITY.roofEdge;
    }
    put(x, y, color);
  });

  if (hash(tx, ty, 50) > 0.22) return;

  const cx = 6 + Math.floor(hash(tx, ty, 51) * 16);
  const cy = 8 + Math.floor(hash(tx, ty, 52) * 12);
  // Chimney: lit brick sides, a soot-black flue and a shadow cast to the bottom-right.
  for (let dy = 1; dy < 8; dy += 1) put(cx + 6, cy + dy, CITY.roofMortar);
  for (let dx = 1; dx < 7; dx += 1) put(cx + dx, cy + 7, CITY.roofMortar);
  for (let dy = 0; dy < 7; dy += 1) {
    for (let dx = 0; dx < 6; dx += 1) {
      let color = dy % 3 === 2 ? shade(CITY.chimney, 0.8) : CITY.chimney;
      if (dx === 0 || dy === 0) color = shade(CITY.chimney, 1.3);
      if (dx === 5) color = shade(CITY.chimney, 0.7);
      if (dy >= 1 && dy <= 3 && dx >= 1 && dx <= 4) color = CITY.chimneyTop;
      put(cx + dx, cy + dy, color);
    }
  }
  const smoke = frame === 0 ? [[2, -2], [3, -2], [2, -3], [3, -4], [4, -4]] : [[3, -2], [2, -3], [3, -3], [4, -5], [5, -5], [4, -6]];
  smoke.forEach(([dx, dy]) => put(cx + dx, cy + dy, CITY.smoke));
};

// Each theme paints the four tile kinds: floor ".", path ":", hazard "~" and wall "#".
const THEMES = {
  garden: {
    floor: drawGrass,
    path: drawPath,
    hazard: (put, tx, ty, frame) => drawWater(put, tx, ty, frame, GARDEN_WATER),
    wall: (put, tx, ty) => drawBush(put, tx, ty, GARDEN_BUSH),
  },
  dungeon: {
    floor: drawFlagstones,
    path: drawCarpet,
    hazard: drawLava,
    wall: drawDungeonWall,
  },
  sky: {
    floor: drawCloudFloor,
    path: drawRainbow,
    hazard: drawSkyHole,
    wall: drawStormCloud,
  },
  city: {
    floor: drawSidewalk,
    path: drawRoad,
    hazard: (put, tx, ty, frame) => drawWater(put, tx, ty, frame, CITY_WATER),
    wall: drawRoof,
  },
};

const drawMap = (level, frame) => {
  const canvas = createCanvas(MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
  const context = canvas.getContext("2d");
  const theme = THEMES[level.theme];
  currentMap = level.map;

  currentMap.forEach((row, ty) => {
    [...row].forEach((tile, tx) => {
      const put = (x, y, color) => {
        if (x < 0 || y < 0 || x >= TILE_SIZE || y >= TILE_SIZE) return;
        context.fillStyle = color;
        context.fillRect(tx * TILE_SIZE + x, ty * TILE_SIZE + y, 1, 1);
      };

      if (tile === ":") theme.path(put, tx, ty, frame);
      else if (tile === "~") theme.hazard(put, tx, ty, frame);
      else if (tile === "#") theme.wall(put, tx, ty, frame);
      else theme.floor(put, tx, ty, frame);
    });
  });

  return canvas;
};

window.TjugGameSprites = Object.freeze({
  createGingerbread: () => drawPixelArt(GINGERBREAD2, GINGERBREAD_PALETTE),
  createGingerbreadShadow: () => drawPixelArt(
    GINGERBREAD2,
    Object.fromEntries(Object.keys(GINGERBREAD_PALETTE).map((key) => [key, "rgba(0, 0, 0, 0.45)"]))
  ),
  createBug: () => drawPixelArt(BUG, BUG_PALETTE),
  createMapFrames: (level) => [drawMap(level, 0), drawMap(level, 1)],
  GINGERBREAD2,
  BUG,
});
})();
