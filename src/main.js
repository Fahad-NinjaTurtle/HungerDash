import * as THREE from "three";
import { createRenderer } from "./core/createRenderer.js";
import { createCamera } from "./core/createCamera.js";
import { setupResize } from "./core/resize.js";
import { startLoop } from "./core/loop.js";
import { setupPlayerControls } from "./player/playerController.js";
import { movePlayerAnimated, checkWin } from "./player/playerController.js";
import { keys } from "./player/playerController.js";
import { MainMenuScene } from "./scenes/mainMenu.js";
import { GameplayScene } from "./scenes/gameplayScene.js";

// Game state
let currentScene = null; // 'menu' or 'gameplay'
let mainMenuScene = null;
let gameplayScene = null;
let renderer = null;
let camera = null;
let gameLoop = null;

// Initialize game
function init() {
  // Setup renderer
  renderer = createRenderer();
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // Setup camera
  camera = createCamera();

  // Setup player controls
  setupPlayerControls();

  // Setup resize handler
  setupResize({ camera, renderer });

  // Initialize main menu
  mainMenuScene = new MainMenuScene();
  mainMenuScene.init(() => {
    startGameplay(1); // Start at level 1
  });

  // Show main menu
  showMainMenu();

  // Start render loop
  startRenderLoop();
}

function showMainMenu() {
  currentScene = "menu";
  if (gameplayScene) {
    gameplayScene.destroy();
    gameplayScene = null;
  }
  if (mainMenuScene) {
    mainMenuScene.show();
  }
}

function startGameplay(level) {
  currentScene = "gameplay";
  if (mainMenuScene) {
    mainMenuScene.hide();
  }

  // Create gameplay scene
  gameplayScene = new GameplayScene(renderer, camera, (nextLevel) => {
    if (nextLevel === null) {
      // Return to menu
      showMainMenu();
    } else {
      // Continue to next level
      startGameplay(nextLevel);
    }
  });

  gameplayScene.init(level);
}

function startRenderLoop() {
  startLoop({
    renderer,
    scene: null, // Will be set dynamically
    camera,
    tick: (dt) => {
      if (currentScene === "gameplay" && gameplayScene) {
        updateGameplay(dt);
      }
    },
  });
}

function updateGameplay(dt) {
  const scene = gameplayScene.getScene();
  if (!scene) return;

  const playerData = gameplayScene.playerData;
  if (!playerData) return;

  // Update animations based on movement
  const isMoving = keys.w || keys.a || keys.s || keys.d;
  const targetAnimation = isMoving ? "Run" : "Idle";
  if (gameplayScene.currentAnimation !== targetAnimation) {
    playAnimation(playerData, targetAnimation);
    gameplayScene.currentAnimation = targetAnimation;
  }

  const isFPS = gameplayScene.isFPS;
  const walls = gameplayScene.walls;
  const freeLook = gameplayScene.freeLook;
  const thirdPersonCamera = gameplayScene.thirdPersonCamera;

  if (isFPS) {
    movePlayerAnimated(playerData, dt, walls, 5, freeLook, isFPS);
    if (freeLook) {
      freeLook.update(playerData.model);
    }
  } else {
    // Third-person mode
    if (!thirdPersonCamera) return;

    // Update collision objects
    thirdPersonCamera.setCollisionObjects(walls);

    // Get camera yaw for movement direction
    const cameraYaw = thirdPersonCamera.getYaw();

    // Move player relative to camera direction
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

    // Smoothly rotate player to face movement direction
    if (newTargetRotation !== null) {
      gameplayScene.targetPlayerRotation = newTargetRotation;
    }

    // Smooth rotation interpolation
    const rotationSpeed = 4;
    let currentRotation = playerData.model.rotation.y;

    // Normalize angles to [-PI, PI] range for smooth interpolation
    let diff = gameplayScene.targetPlayerRotation - currentRotation;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    currentRotation += diff * Math.min(1, rotationSpeed * dt);
    playerData.model.rotation.y = currentRotation;

    // Update third-person camera
    thirdPersonCamera.update(dt);
  }

  // Check win condition
  if (checkWin(playerData.model, gameplayScene.goal)) {
    gameplayScene.showCompletePanel();
    // Reset player position
    const bottomOffset = playerData.model.userData.bottomOffset || 0;
    playerData.model.position.set(2, -bottomOffset, 2);
  }

  // Update renderer scene
  if (renderer && scene) {
    renderer.render(scene, camera);
  }
}

function playAnimation(playerData, name) {
  if (!playerData || !playerData.actions) return;

  // Stop all animations
  for (let key in playerData.actions) {
    const action = playerData.actions[key];
    if (action.isRunning()) {
      action.fadeOut(0.2);
    }
  }

  // Play the requested animation with fade in
  const action = playerData.actions[name];
  if (action) {
    action.reset().fadeIn(0.2).play();
  }
}

// Mobile controls
document
  .getElementById("up")
  .addEventListener("touchstart", () => (keys.w = true));
document
  .getElementById("up")
  .addEventListener("touchend", () => (keys.w = false));
document
  .getElementById("down")
  .addEventListener("touchstart", () => (keys.s = true));
document
  .getElementById("down")
  .addEventListener("touchend", () => (keys.s = false));
document
  .getElementById("left")
  .addEventListener("touchstart", () => (keys.a = true));
document
  .getElementById("left")
  .addEventListener("touchend", () => (keys.a = false));
document
  .getElementById("right")
  .addEventListener("touchstart", () => (keys.d = true));
document
  .getElementById("right")
  .addEventListener("touchend", () => (keys.d = false));

document.body.addEventListener("click", () => {
  if (currentScene === "gameplay") {
    document.body.requestPointerLock();
  }
});

// Initialize game when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
