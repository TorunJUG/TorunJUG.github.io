// The classic LittleJS build exposes lexical globals rather than an ESM namespace.
// This adapter preserves the namespace used by the game and keeps mutable exports live.
(() => {
window.LittleJS = Object.freeze({
  drawCircle,
  drawEllipse,
  drawLine,
  drawRect,
  drawTile,
  engineInit,
  EngineObject,
  engineObjectsDestroy,
  keyIsDown,
  lerp,
  rgb,
  setCameraPos,
  setCameraScale,
  setCanvasFixedSize,
  setCanvasPixelated,
  setCanvasPixelRatio,
  setGLEnable,
  setGravity,
  setInputPreventDefault,
  setPaused,
  setShowSplashScreen,
  setSoundEnable,
  setTilesPixelated,
  setTouchInputEnable,
  textureInfos,
  TileCollisionLayer,
  TileInfo,
  TextureInfo,
  vec2,
  WHITE,
  get mainCanvas() {
    return mainCanvas;
  },
  get time() {
    return time;
  },
});
})();
