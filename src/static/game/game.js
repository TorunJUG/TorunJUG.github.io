(() => {
const LittleJS = window.LittleJS;
const { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, pickRandomLevel } = window.TjugGameMap;
const { chooseChaseStep, computeDistanceField, pickSpawnTile, placeCollectibles } = window.TjugGameCore;
const TjugGameSprites = window.TjugGameSprites;

const COLLECTIBLE_COUNT = 10;
const MOVE_DURATION_FRAMES = 8;
const TIME_LIMIT_FRAMES = 30 * 60;
const BUG_SPEED_FACTOR = 0.7;
const BUG_MOVE_DURATION_FRAMES = Math.round(MOVE_DURATION_FRAMES / BUG_SPEED_FACTOR);
const MAX_BUGS = 6;
const INITIAL_BUGS = 2;
const BUG_SPAWN_INTERVAL_FRAMES = 9 * 60;
const BUG_SPAWN_FRAMES = 45;
const BUG_SPAWN_MIN_DISTANCE = 10;
const BUG_WANDER_CHANCE = 0.2;
const CATCH_DISTANCE = 0.6;
const TITLE_DURATION_MS = 3000;
const TITLE_FADE_MS = 500;
const TITLE_START_FALLBACK_MS = 5000;
const TRAY_SPRITE_BOUNDS = Object.freeze({ x: 7, y: 3, width: 18, height: 26 });
const MESSAGE_SOURCE = "tjug-piernikowy-quest";
const parentOrigin = window.location.protocol === "file:" ? "*" : window.location.origin;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stage = document.querySelector("[data-game-stage]");
const gameRoot = document.querySelector("[data-game-root]");
const titleScreen = document.querySelector("[data-title-screen]");
const titleWords = document.querySelectorAll("[data-title-word]");
const startPanel = document.querySelector("[data-start-panel]");
const winPanel = document.querySelector("[data-win-panel]");
const losePanel = document.querySelector("[data-lose-panel]");
const startButton = document.querySelector("[data-start-game]");
const restartButtons = document.querySelectorAll("[data-restart-game]");
const trayElement = document.querySelector("[data-tray]");
const timeElement = document.querySelector("[data-time]");
const bugCountElement = document.querySelector("[data-bug-count]");
const finalTimeElement = document.querySelector("[data-final-time]");
const loseTitleElement = document.querySelector("[data-lose-title]");
const loseReasonElement = document.querySelector("[data-lose-reason]");
const finalScoreElement = document.querySelector("[data-final-score]");
const announcer = document.querySelector("[data-announcer]");
const heroSource = document.querySelector("[data-hero-source]");
const levelNameElements = document.querySelectorAll("[data-level-name]");

let hero;
let heroTexture;
let gingerbreadTile;
let bugTile;
let level;
const mapTilesByLevel = new Map();
let mapTiles = [];
let collisionLayer;
let collectibles = [];
let bugs = [];
let currentTile;
let movement;
let collectedCount = 0;
let elapsedFrames = 0;
let gameState = "ready";
let pausedByVisibility = false;

const prepareTitleLetters = () => {
  let letterIndex = 0;

  titleWords.forEach((word) => {
    const letters = [...word.textContent];
    word.textContent = "";

    letters.forEach((letter) => {
      const span = document.createElement("span");
      span.className = "game-title-letter";
      span.style.setProperty("--letter-index", String(letterIndex));
      span.textContent = letter;
      word.append(span);
      letterIndex += 1;
    });
  });
};

const waitForTitleFont = () => {
  if (!document.fonts?.load) {
    return Promise.resolve();
  }

  const fontLoad = document.fonts
    .load('16px "Press Start 2P"', "Piernikowy Quest")
    .catch(() => []);
  const fontTimeout = new Promise((resolve) => window.setTimeout(resolve, 1500));
  return Promise.race([fontLoad, fontTimeout]);
};

let titleStarted = false;

const playTitleScreen = () => {
  if (titleStarted) return;
  titleStarted = true;

  window.requestAnimationFrame(() => {
    titleScreen.classList.add("is-animating");

    window.setTimeout(() => {
      titleScreen.classList.add("is-leaving");

      window.setTimeout(() => {
        titleScreen.hidden = true;
        gameRoot.removeAttribute("inert");
        startButton.focus();
      }, prefersReducedMotion ? 0 : TITLE_FADE_MS);
    }, TITLE_DURATION_MS);
  });
};

// Embedded in the site, the title waits until the parent has faded out its loader.
const waitForTitleStart = () => {
  if (window.parent === window) {
    playTitleScreen();
    return;
  }

  window.addEventListener("message", (event) => {
    if (
      event.source === window.parent
      && (parentOrigin === "*" || event.origin === parentOrigin)
      && event.data?.source === "tjug-site"
      && event.data.type === "start-title"
    ) {
      playTitleScreen();
    }
  });
  window.setTimeout(playTitleScreen, TITLE_START_FALLBACK_MS);
};

// The tray is a column-reverse flex box, so the first slot sits at the bottom and fills first.
const prepareTray = () => {
  for (let index = 0; index < COLLECTIBLE_COUNT; index += 1) {
    const slot = document.createElement("span");
    slot.className = "game-tray-slot";
    slot.dataset.traySlot = "";
    trayElement.append(slot);
  }
};

// Tray slots show the gingerbread sprite cropped to its visible pixels.
const setTrayImage = (property, canvas) => {
  const crop = document.createElement("canvas");
  crop.width = TRAY_SPRITE_BOUNDS.width;
  crop.height = TRAY_SPRITE_BOUNDS.height;
  crop.getContext("2d").drawImage(
    canvas,
    TRAY_SPRITE_BOUNDS.x,
    TRAY_SPRITE_BOUNDS.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  document.documentElement.style.setProperty(property, `url(${crop.toDataURL()})`);
};

prepareTitleLetters();
prepareTray();

const postToParent = (type, details = {}) => {
  window.parent.postMessage({ source: MESSAGE_SOURCE, type, ...details }, parentOrigin);
};

const tileToWorld = ({ x, y }) => LittleJS.vec2(x + 0.5, MAP_HEIGHT - y - 0.5);
// Snap to the 32px grid so sprites always land on whole screen pixels.
const snapToPixel = (position) => LittleJS.vec2(
  Math.round(position.x * TILE_SIZE) / TILE_SIZE,
  Math.round(position.y * TILE_SIZE) / TILE_SIZE
);
const createFullTile = (canvas) => new LittleJS.TileInfo().setFullImage(new LittleJS.TextureInfo(canvas, false));
const tileToLayer = ({ x, y }) => LittleJS.vec2(x, MAP_HEIGHT - y - 1);

const formatGameTime = (frames, round = Math.floor) => {
  const totalSeconds = round(frames / 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const updateHud = () => {
  trayElement.setAttribute("aria-label", `Zebrane pierniki: ${collectedCount} z ${COLLECTIBLE_COUNT}`);
  trayElement.querySelectorAll("[data-tray-slot]").forEach((slot, index) => {
    slot.classList.toggle("is-filled", index < collectedCount);
  });
  timeElement.textContent = formatGameTime(TIME_LIMIT_FRAMES - elapsedFrames, Math.ceil);
  timeElement.classList.toggle("is-urgent", TIME_LIMIT_FRAMES - elapsedFrames <= 10 * 60);
  bugCountElement.textContent = `${bugs.length}/${MAX_BUGS}`;
};

class Hero extends LittleJS.EngineObject {
  constructor(position, tileInfo) {
    super(position, LittleJS.vec2(1), tileInfo, 0, LittleJS.WHITE, 20);
    this.mass = 0;
  }

  render() {
    LittleJS.drawTile(snapToPixel(this.pos), this.size, this.tileInfo);
  }
}

class Gingerbread extends LittleJS.EngineObject {
  constructor(tilePosition) {
    super(tileToWorld(tilePosition), LittleJS.vec2(1), gingerbreadTile, 0, LittleJS.WHITE, 10);
    this.tilePosition = { ...tilePosition };
    this.mass = 0;
  }

  render() {
    const bob = prefersReducedMotion ? 0 : Math.round(Math.sin(LittleJS.time * 4 + this.pos.x) * 1.5) / TILE_SIZE;
    LittleJS.drawTile(snapToPixel(this.pos.add(LittleJS.vec2(0, bob))), this.size, this.tileInfo);
  }
}

const directionToAngle = ({ x, y }) => {
  if (x > 0) return Math.PI / 2;
  if (x < 0) return -Math.PI / 2;
  return y > 0 ? Math.PI : 0;
};

class Bug extends LittleJS.EngineObject {
  constructor(tilePosition) {
    super(tileToWorld(tilePosition), LittleJS.vec2(1), bugTile, 0, LittleJS.WHITE, 15);
    this.tilePosition = { ...tilePosition };
    this.movement = undefined;
    this.angle = 0;
    this.spawnFrames = BUG_SPAWN_FRAMES;
    this.mass = 0;
  }

  get isActive() {
    return this.spawnFrames <= 0;
  }

  render() {
    if (!this.isActive && !prefersReducedMotion && Math.floor(this.spawnFrames / 5) % 2 === 0) return;

    // Scuttle by one pixel sideways while walking instead of animating the legs.
    const scuttle = prefersReducedMotion || !this.movement ? 0 : (Math.floor(LittleJS.time * 16) % 2) / TILE_SIZE;
    const offset = LittleJS.vec2(scuttle, 0).rotate(this.angle);
    const color = this.isActive ? LittleJS.WHITE : LittleJS.rgb(1, 1, 1, 0.6);
    LittleJS.drawTile(snapToPixel(this.pos.add(offset)), this.size, this.tileInfo, color, this.angle);
  }
}

const isWalkable = (x, y) => level.isWalkable(x, y);

// Map frames are drawn pixel by pixel, so each level is rendered once, when first drawn.
const getMapTiles = () => {
  if (!mapTilesByLevel.has(level)) {
    mapTilesByLevel.set(level, TjugGameSprites.createMapFrames(level).map(createFullTile));
  }
  return mapTilesByLevel.get(level);
};

const createCollisionLayer = () => {
  collisionLayer = new LittleJS.TileCollisionLayer(
    LittleJS.vec2(),
    LittleJS.vec2(MAP_WIDTH, MAP_HEIGHT),
    undefined,
    -20,
    false
  );

  level.map.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (!isWalkable(x, y)) {
        collisionLayer.setCollisionData(tileToLayer({ x, y }), 1);
      }
    });
  });
};

const resetLevel = () => {
  LittleJS.engineObjectsDestroy();
  level = pickRandomLevel(level);
  mapTiles = getMapTiles();
  levelNameElements.forEach((element) => {
    element.textContent = level.name;
  });
  createCollisionLayer();

  const heroTile = new LittleJS.TileInfo().setFullImage(heroTexture);
  currentTile = { ...level.startTile };
  movement = undefined;
  collectedCount = 0;
  elapsedFrames = 0;
  bugs = [];
  hero = new Hero(tileToWorld(currentTile), heroTile);
  collectibles = placeCollectibles({
    start: level.startTile,
    count: COLLECTIBLE_COUNT,
    isWalkable,
  }).map((tilePosition) => new Gingerbread(tilePosition));

  updateHud();
};

const readDirection = () => {
  if (LittleJS.keyIsDown("ArrowUp") || LittleJS.keyIsDown("KeyW")) return { x: 0, y: -1 };
  if (LittleJS.keyIsDown("ArrowDown") || LittleJS.keyIsDown("KeyS")) return { x: 0, y: 1 };
  if (LittleJS.keyIsDown("ArrowLeft") || LittleJS.keyIsDown("KeyA")) return { x: -1, y: 0 };
  if (LittleJS.keyIsDown("ArrowRight") || LittleJS.keyIsDown("KeyD")) return { x: 1, y: 0 };
  return undefined;
};

const startMove = () => {
  const direction = readDirection();
  if (!direction) return;

  const destination = {
    x: currentTile.x + direction.x,
    y: currentTile.y + direction.y,
  };

  if (collisionLayer.getCollisionData(tileToLayer(destination))) return;

  movement = {
    from: tileToWorld(currentTile),
    to: tileToWorld(destination),
    destination,
    frame: 0,
  };
};

const collectAtCurrentTile = () => {
  const collectible = collectibles.find(
    (item) => item.tilePosition.x === currentTile.x && item.tilePosition.y === currentTile.y
  );

  if (!collectible) return;

  collectible.destroy();
  collectibles = collectibles.filter((item) => item !== collectible);
  collectedCount += 1;
  updateHud();
  announcer.textContent = `Zebrano piernik ${collectedCount} z ${COLLECTIBLE_COUNT}.`;

  if (collectedCount === COLLECTIBLE_COUNT) {
    gameState = "won";
    LittleJS.setPaused(true);
    finalTimeElement.textContent = formatGameTime(elapsedFrames);
    winPanel.hidden = false;
    winPanel.querySelector("[data-restart-game]").focus();
    postToParent("completed", { elapsedSeconds: Math.floor(elapsedFrames / 60) });
  }
};

const loseGame = (title, reason) => {
  gameState = "lost";
  LittleJS.setPaused(true);
  updateHud();
  loseTitleElement.textContent = title;
  loseReasonElement.textContent = reason;
  finalScoreElement.textContent = `${collectedCount}/${COLLECTIBLE_COUNT}`;
  losePanel.hidden = false;
  losePanel.querySelector("[data-restart-game]").focus();
  announcer.textContent = `${title} ${reason}`;
};

const updateMovement = () => {
  if (!movement) {
    startMove();
    return;
  }

  movement.frame += 1;
  const progress = Math.min(movement.frame / MOVE_DURATION_FRAMES, 1);
  hero.pos = LittleJS.vec2(
    LittleJS.lerp(movement.from.x, movement.to.x, progress),
    LittleJS.lerp(movement.from.y, movement.to.y, progress)
  );

  if (progress < 1) return;

  currentTile = movement.destination;
  hero.pos = movement.to;
  movement = undefined;
  collectAtCurrentTile();
};

const heroTargetTile = () => movement?.destination ?? currentTile;

const spawnBugIfDue = () => {
  if (bugs.length >= MAX_BUGS) return;
  const extraBugs = Math.max(0, bugs.length - INITIAL_BUGS + 1);
  if (elapsedFrames < extraBugs * BUG_SPAWN_INTERVAL_FRAMES) return;

  const tilePosition = pickSpawnTile({
    start: level.startTile,
    avoid: heroTargetTile(),
    minDistance: BUG_SPAWN_MIN_DISTANCE,
    isWalkable: (x, y) => isWalkable(x, y) && !isTileTakenByBug({ x, y }),
  });
  bugs.push(new Bug(tilePosition));
  updateHud();
  announcer.textContent = `Pojawił się bug! Na planszy jest ich ${bugs.length}.`;
};

const isTileTakenByBug = (tile, self) => bugs.some((bug) => {
  if (bug === self) return false;
  const occupied = bug.movement?.destination ?? bug.tilePosition;
  return occupied.x === tile.x && occupied.y === tile.y;
});

const updateBugs = () => {
  let distances;

  bugs.forEach((bug) => {
    if (!bug.isActive) {
      bug.spawnFrames -= 1;
      return;
    }

    if (!bug.movement) {
      distances ??= computeDistanceField(heroTargetTile(), isWalkable);
      const destination = chooseChaseStep({
        from: bug.tilePosition,
        distances,
        isWalkable,
        isBlocked: (tile) => isTileTakenByBug(tile, bug),
        wander: BUG_WANDER_CHANCE,
      });
      if (!destination) return;

      bug.angle = directionToAngle({
        x: destination.x - bug.tilePosition.x,
        y: destination.y - bug.tilePosition.y,
      });
      bug.movement = {
        from: tileToWorld(bug.tilePosition),
        to: tileToWorld(destination),
        destination,
        frame: 0,
      };
    }

    bug.movement.frame += 1;
    const progress = Math.min(bug.movement.frame / BUG_MOVE_DURATION_FRAMES, 1);
    bug.pos = LittleJS.vec2(
      LittleJS.lerp(bug.movement.from.x, bug.movement.to.x, progress),
      LittleJS.lerp(bug.movement.from.y, bug.movement.to.y, progress)
    );

    if (progress < 1) return;

    bug.tilePosition = bug.movement.destination;
    bug.pos = bug.movement.to;
    bug.movement = undefined;
  });
};

const isHeroCaught = () => bugs.some(
  (bug) => bug.isActive && bug.pos.distance(hero.pos) < CATCH_DISTANCE
);

const gameInit = () => {
  heroTexture = new LittleJS.TextureInfo(heroSource, false);
  const gingerbreadCanvas = TjugGameSprites.createGingerbread();
  gingerbreadTile = createFullTile(gingerbreadCanvas);
  setTrayImage("--tray-gingerbread", gingerbreadCanvas);
  setTrayImage("--tray-shadow", TjugGameSprites.createGingerbreadShadow());
  bugTile = createFullTile(TjugGameSprites.createBug());
  resetLevel();
};

const gameUpdate = () => {
  if (gameState !== "playing") return;
  elapsedFrames += 1;
  updateMovement();
  if (gameState !== "playing") return;

  spawnBugIfDue();
  updateBugs();

  if (isHeroCaught()) {
    loseGame("Bug cię dopadł!", "Bugi okazały się szybsze.");
    return;
  }

  if (elapsedFrames >= TIME_LIMIT_FRAMES) {
    loseGame("Czas minął!", "30 sekund to za mało, by zebrać wszystkie pierniki.");
    return;
  }

  if (elapsedFrames % 60 === 0) {
    updateHud();
  }
};

const gameRender = () => {
  const frame = prefersReducedMotion ? 0 : Math.floor(LittleJS.time * 2) % mapTiles.length;
  LittleJS.drawTile(
    LittleJS.vec2(MAP_WIDTH / 2, MAP_HEIGHT / 2),
    LittleJS.vec2(MAP_WIDTH, MAP_HEIGHT),
    mapTiles[frame]
  );
};

const startGame = () => {
  startPanel.hidden = true;
  winPanel.hidden = true;
  losePanel.hidden = true;
  gameState = "playing";
  pausedByVisibility = false;
  LittleJS.setPaused(false);
  LittleJS.mainCanvas?.focus();
  announcer.textContent = `Plansza: ${level.name}.`;
};

startButton.addEventListener("click", startGame);
restartButtons.forEach((button) => button.addEventListener("click", () => {
  resetLevel();
  startGame();
}));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    postToParent("close");
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && gameState === "playing") {
    pausedByVisibility = true;
    LittleJS.setPaused(true);
  } else if (!document.hidden && pausedByVisibility && gameState === "playing") {
    pausedByVisibility = false;
    LittleJS.setPaused(false);
  }
});

LittleJS.setCanvasFixedSize(LittleJS.vec2(MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE));
LittleJS.setCanvasPixelated(true);
LittleJS.setTilesPixelated(true);
LittleJS.setCanvasPixelRatio(1);
LittleJS.setGLEnable(false);
LittleJS.setSoundEnable(false);
LittleJS.setTouchInputEnable(false);
LittleJS.setInputPreventDefault(false);
LittleJS.setShowSplashScreen(false);
LittleJS.setGravity(LittleJS.vec2());
LittleJS.setCameraPos(LittleJS.vec2(MAP_WIDTH / 2, MAP_HEIGHT / 2));
LittleJS.setCameraScale(TILE_SIZE);
LittleJS.setPaused(true);

const waitForHero = () => {
  if (heroSource.complete) {
    return heroSource.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error("Nie udało się wczytać favicony bohatera."));
  }

  return new Promise((resolve, reject) => {
    heroSource.addEventListener("load", resolve, { once: true });
    heroSource.addEventListener(
      "error",
      () => reject(new Error("Nie udało się wczytać favicony bohatera.")),
      { once: true }
    );
  });
};

Promise.all([waitForHero(), waitForTitleFont()]).then(() => LittleJS.engineInit(
  gameInit,
  gameUpdate,
  undefined,
  gameRender,
  undefined,
  [],
  stage
)).then(() => {
  LittleJS.mainCanvas.tabIndex = -1;
  LittleJS.mainCanvas.setAttribute("aria-label", "Kafelkowa mapa Piernikowego Questu");
  postToParent("ready");
  waitForTitleStart();
}).catch((error) => {
  console.error("Nie udało się uruchomić Piernikowego Questu.", error);
  postToParent("error");
});
})();
