import * as THREE from "three";
import { createRenderer } from "./core/createRenderer.js";
import { createCamera } from "./core/createCamera.js";
import { setupResize } from "./core/resize.js";
import { startLoop } from "./core/loop.js";
import { setupPlayerControls, setMovementLocked, movePlayerAnimated, checkWin, keys } from "./player/playerController.js";
import { MainMenuScene } from "./scenes/mainMenu.js";
import { GameplayScene } from "./scenes/gameplayScene.js";

// Game state
let currentScene = null; // 'menu' or 'gameplay'
let mainMenuScene = null;
let gameplayScene = null;
let renderer = null;
let camera = null;

// Temporary top-down camera view (Q)
const overviewMode = {
  active: false,
  restoreTimeout: null,
  savedPos: null,
  savedQuat: null,
};

function init() {
  renderer = createRenderer();
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  camera = createCamera();

  setupPlayerControls();
  setupResize({ camera, renderer });

  // enable mobile/joystick UI if appropriate
  maybeEnableMobile();
  document.addEventListener("pointerlockchange", () => {
    const locked = !!document.pointerLockElement;
    if (!locked) {
      document.body.style.cursor = "default";
    } else if (currentScene === "gameplay") {
      document.body.style.cursor = "none";
    }
  });

  mainMenuScene = new MainMenuScene();
  mainMenuScene.init(() => startGameplay(1));

  showMainMenu();
  startRenderLoop();
}

function showMainMenu() {
  currentScene = "menu";

  // Ensure cursor visible in menus
  if (document.pointerLockElement) document.exitPointerLock();
  document.body.style.cursor = "default";

  // Hide mobile controls in menu
  const mobileControls = document.getElementById("mobile-controls");
  if (mobileControls) mobileControls.style.display = "none";

  // Reset overview + movement lock
  if (overviewMode.restoreTimeout) clearTimeout(overviewMode.restoreTimeout);
  overviewMode.active = false;
  setMovementLocked(false);

  // Cleanup gameplay
  if (gameplayScene) {
    if (gameplayScene._removePointerLockListener) gameplayScene._removePointerLockListener();
    gameplayScene.destroy();
    gameplayScene = null;
  }

  mainMenuScene?.show();
}

function startGameplay(level) {
  // Cleanup previous gameplay scene (important when advancing levels)
  if (gameplayScene) {
    if (gameplayScene._removePointerLockListener) gameplayScene._removePointerLockListener();
    gameplayScene.destroy();
    gameplayScene = null;
  }

  // Keep cursor visible until the player clicks inside the game view
  if (document.pointerLockElement) document.exitPointerLock();
  document.body.style.cursor = "default";

  // Show mobile controls if on touch device
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const mobileControls = document.getElementById("mobile-controls");
  if (hasTouch && mobileControls) {
    mobileControls.style.display = "block";
  }

  // Reset overview + movement lock
  if (overviewMode.restoreTimeout) clearTimeout(overviewMode.restoreTimeout);
  overviewMode.active = false;
  setMovementLocked(false);

  const saved = parseInt(localStorage.getItem("savedLevel"));
  if (!isNaN(saved) && saved > level) level = saved;

  currentScene = "gameplay";
  mainMenuScene?.hide();

  gameplayScene = new GameplayScene(renderer, camera, (nextLevel) => {
    if (nextLevel === null) showMainMenu();
    else startGameplay(nextLevel);
  });

  gameplayScene.init(level);

  // Pointer lock ONLY when clicking inside canvas (not on menu/UI)
  const canvas = renderer?.domElement;
  if (canvas) {
    const onCanvasClick = () => {
      const panel = document.getElementById("game-complete-panel");
      if (panel && panel.classList.contains("show")) return;
      if (currentScene !== "gameplay") return;

      // Some FPS controls expect pointerLockElement === document.body
      if (!document.pointerLockElement) (document.body || canvas).requestPointerLock();
      document.body.style.cursor = "none";
    };

    canvas.addEventListener("click", onCanvasClick);
    gameplayScene._removePointerLockListener = () => canvas.removeEventListener("click", onCanvasClick);
  }
}

function startRenderLoop() {
  startLoop({
    renderer,
    scene: null,
    camera,
    tick: (dt) => {
      if (currentScene === "gameplay" && gameplayScene) updateGameplay(dt);
    },
  });
}

function updateGameplay(dt) {
  const scene = gameplayScene.getScene();
  if (!scene) return;

  const playerData = gameplayScene.playerData;
  if (!playerData) return;

  // Keep marker synced with player position
  gameplayScene.updateOverviewMarker?.();
  gameplayScene.update?.(dt);
  
  const isFPS = gameplayScene.isFPS;
  const walls = gameplayScene.walls;
  const freeLook = gameplayScene.freeLook;
  const thirdPersonCamera = gameplayScene.thirdPersonCamera;

  // Q: show top-down maze view for 3 seconds (no movement)
  if (keys.q && !overviewMode.active) {
    overviewMode.active = true;
    keys.q = false; // consume key press

    setMovementLocked(true);

    overviewMode.savedPos = camera.position.clone();
    overviewMode.savedQuat = camera.quaternion.clone();

    // compute a bounding area containing both player and goal
    const playerPos = gameplayScene.playerData?.model.position || new THREE.Vector3();
    const goalPos = gameplayScene.goal ? gameplayScene.goal.position : new THREE.Vector3();
    const mid = new THREE.Vector3().addVectors(playerPos, goalPos).multiplyScalar(0.5);

    // determine required height based on distance between them
    const dist = playerPos.distanceTo(goalPos);
    // field of view of camera determines height; assume perspective fov in radians
    const fov = (camera.fov || 75) * (Math.PI / 180);
    const height = Math.max(12, dist / Math.tan(fov / 2) + 5);

    camera.position.set(mid.x, height, mid.z);
    camera.lookAt(mid.x, 0, mid.z);

    // still show overview marker as before
    gameplayScene.setOverviewMarkerVisible?.(true);

    if (overviewMode.restoreTimeout) clearTimeout(overviewMode.restoreTimeout);
    overviewMode.restoreTimeout = setTimeout(() => {
      overviewMode.active = false;
      setMovementLocked(false);

      gameplayScene?.setOverviewMarkerVisible?.(false);

      if (overviewMode.savedPos && overviewMode.savedQuat) {
        camera.position.copy(overviewMode.savedPos);
        camera.quaternion.copy(overviewMode.savedQuat);
      }

      overviewMode.restoreTimeout = null;
    }, 3000);
  }

  if (overviewMode.active) {
    // No movement or camera rig updates; still tick mixer
    movePlayerAnimated(playerData, dt, walls, 0, freeLook, isFPS);
  } else if (isFPS) {
    movePlayerAnimated(playerData, dt, walls, 5, freeLook, isFPS);
    freeLook?.update(playerData.model);
  } else {
    if (!thirdPersonCamera) return;

    thirdPersonCamera.setCollisionObjects(walls);
    const cameraYaw = thirdPersonCamera.getYaw();

    const newTargetRotation = movePlayerAnimated(
      playerData,
      dt,
      walls,
      5,
      freeLook,
      isFPS,
      camera,
      cameraYaw
    );

    if (newTargetRotation !== null) gameplayScene.targetPlayerRotation = newTargetRotation;

    // Smooth rotation interpolation
    const rotationSpeed = 4;
    let currentRotation = playerData.model.rotation.y;

    let diff = gameplayScene.targetPlayerRotation - currentRotation;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    currentRotation += diff * Math.min(1, rotationSpeed * dt);
    playerData.model.rotation.y = currentRotation;

    thirdPersonCamera.update(dt);
  }

  // play footstep/audio based on current input
  handleMovementAudio(dt);

  // Check win
  if (checkWin(playerData.model, gameplayScene.goal)) {
    gameplayScene.showCompletePanel();
    setMovementLocked(true);

    // Ensure cursor visible for UI
    if (document.pointerLockElement) document.exitPointerLock();
    document.body.style.cursor = "default";

    // Hide marker if it was showing
    gameplayScene.setOverviewMarkerVisible?.(false);

    // Reset player position
    const bottomOffset = playerData.model.userData.bottomOffset || 0;
    playerData.model.position.set(2, -bottomOffset, 2);
  }

  renderer.render(scene, camera);
}

// joystick & touch helpers -------------------------------------------------
function enableMobileControls() {
  console.log("enableMobileControls called");
  const container = document.getElementById("mobile-controls");
  if (!container) {
    console.warn("mobile-controls element not found");
    return;
  }
  container.style.display = "block";

  const thumb = document.getElementById("joystick-thumb");
  const rect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = Math.min(rect.width, rect.height) / 2 * 0.75;

  let activeId = null;

  const resetKeys = () => {
    keys.w = keys.a = keys.s = keys.d = false;
  };

  container.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (activeId !== null) return;
    const t = e.changedTouches[0];
    activeId = t.identifier;
    moveThumb(t.clientX, t.clientY);
  }, { passive: false });

  container.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (activeId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== activeId) continue;
      moveThumb(t.clientX, t.clientY);
      break;
    }
  }, { passive: false });

  container.addEventListener("touchend", (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeId) {
        activeId = null;
        thumb.style.top = "30%";
        thumb.style.left = "30%";
        resetKeys();
        break;
      }
    }
  });

  function moveThumb(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clamped = Math.min(dist, radius);
    const tx = Math.cos(angle) * clamped;
    const ty = Math.sin(angle) * clamped;
    thumb.style.left = `${50 + (tx / rect.width) * 100}%`;
    thumb.style.top = `${50 + (ty / rect.height) * 100}%`;

    // set directional keys based on angle thresholds
    resetKeys();
    if (dist > 10) {
      if (dy < -10) keys.w = true;
      if (dy > 10) keys.s = true;
      if (dx < -10) keys.a = true;
      if (dx > 10) keys.d = true;
    }
  }
}

// mobile controls should be enabled once DOM is ready


function maybeEnableMobile() {
  // Note: Mobile controls are now shown/hidden in startGameplay/showMainMenu
  // This function just ensures the event listeners are set up
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (hasTouch) {
    enableMobileControls();
  }
}

// audio/footstep helper inside updateGameplay
function handleMovementAudio(dt) {
  if (!gameplayScene) return;
  // Don't play footstep sounds in overview mode
  if (overviewMode.active) return;
  
  const moving = keys.w || keys.a || keys.s || keys.d;
  const f = gameplayScene.footstepSound;
  if (moving && f && !f.isPlaying) {
    f.play();
  } else if (!moving && f && f.isPlaying) {
    f.stop();
  }
}

// Init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
