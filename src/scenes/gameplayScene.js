import * as THREE from "three";;
import { createScene } from "../core/createScene.js";
import { addLights } from "../world/addLights.js";
import { createGround } from "../world/createGround.js";
import { buildMaze } from "../world/buildMaze.js";
import { createGoal } from "../world/createGoal.js";
import { loadPlayerModel } from "../player/createPlayer.js";
import { FreeLook } from "../player/fpsControls.js";
import { ThirdPersonCamera } from "../player/thirdPersonCamera.js";
import { generateMaze } from "../world/mazeGenerator.js";
import { createSkyDome } from "../world/createSkyDome.js";

/**
 * Gameplay Scene
 * Handles all game logic and rendering
 */
export class GameplayScene {
  constructor(renderer, camera, onLevelComplete) {
    this.renderer = renderer;
    this.camera = camera;
    this.onLevelComplete = onLevelComplete;
    this.scene = null;
    this.playerData = null;
    this.walls = [];
    this.goal = null;
    this.sky = null;
    this.freeLook = null;
    this.thirdPersonCamera = null;
    this.currentLevel = 1;
    this.isFPS = true;
    this.currentAnimation = null;
    this.targetPlayerRotation = 0;
    this.gameCompletePanel = null;
    this.gameOverPanel = null;
    this.levelDisplay = null;
    this.hungerContainer = null;
    this.hungerBar = null;
    this.hungerOverlay = null;
    this.maxHunger = 100;
    this.hungerRate = 2; // units per second
    this.hunger = 0;
    this.hungerAlertPlayed = false;

    // Maze info (used by overview camera)
    this.mazeCenter = new THREE.Vector3(0, 0, 0);
    this.mazeSize = 21;
    this.cellSize = 2;

    // Overview marker (shows player position during top-view)
    this.overviewMarker = null;
    this.winSoundPlayed = false;
    this.gameEnded = false; // flag to prevent multiple end-game triggers
  }

  init(level = 1) {
    // make level-specific adjustments including hunger settings
    this.updateLevel(level);

    this.winSoundPlayed = false;
    this.createScene();
    this.createUI();
  }

  createScene() {
    // Clear previous scene if exists
    if (this.scene) {
      this.cleanup();
    }

    this.scene = createScene();
    addLights(this.scene);

    // audio listener + sounds (footstep / hunger reminder)
    this._setupAudio();


    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.55);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(5, 12, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    // Generate maze based on level
    const mazeData = generateMaze(this.currentLevel);
    const mazeSize = mazeData.length;
    const cellSize = 2;
    const wallHeight = 2;

    // Save for overview camera
    this.mazeSize = mazeSize;
    this.cellSize = cellSize;
    this.mazeCenter.set((mazeSize - 1) * cellSize * 0.5, 0, (mazeSize - 1) * cellSize * 0.5);

    // Create ground sized to fully cover the maze (+ margin)
    const padding = cellSize * 2;
    const groundWidth = mazeSize * cellSize + padding * 2;
    const groundDepth = mazeSize * cellSize + padding * 2;
    const ground = createGround({ width: groundWidth, depth: groundDepth });
    ground.position.x = this.mazeCenter.x;
    ground.position.z = this.mazeCenter.z;
    this.scene.add(ground);

    // Build maze
    this.walls = buildMaze(this.scene, {
      cellSize,
      wallHeight,
      mazeData,
    });

    // Calculate goal position (furthest point from start)
    let goalX = 1;
    let goalZ = 1;
    let maxDistance = 0;

    for (let z = 1; z < mazeSize - 1; z++) {
      for (let x = 1; x < mazeSize - 1; x++) {
        if (mazeData[z][x] === 0) {
          const dist = Math.sqrt((x - 1) ** 2 + (z - 1) ** 2);
          if (dist > maxDistance) {
            maxDistance = dist;
            goalX = x;
            goalZ = z;
          }
        }
      }
    }

    this.goal = createGoal({ x: goalX * cellSize, z: goalZ * cellSize });
    this.scene.add(this.goal);

    // Add skybox
    this.sky = createSkyDome();
    this.scene.add(this.sky);

    // Load player model
    loadPlayerModel(this.scene, (model, mixer, actions) => {
      this.playerData = { model, mixer, actions };
      // start player facing +X direction (90°) instead of the default -Z
      const initialYaw = -Math.PI / 2; // rotate rightwards
      model.rotation.y = initialYaw;
      // keep the same rotation when we animate in third person
      this.targetPlayerRotation = initialYaw;

      this.playerData.model.visible = false; // hide mesh in FPS

      // create freelook with tighter vertical limits and default heading
      this.freeLook = new FreeLook(this.camera, {
        initialYaw: initialYaw,
        initialPitch: 0,               // straight ahead
        pitchMin: -Math.PI / 3,        // ~60° up
        pitchMax: Math.PI / 3,         // ~60° down
      });

      // Overview marker (visible only in top-view)
      this.overviewMarker = this._createOverviewMarker();
      this.overviewMarker.visible = false;
      this.scene.add(this.overviewMarker);

      // Initialize third-person camera with same starting heading
      this.thirdPersonCamera = new ThirdPersonCamera(this.camera, model, {
        distance: 6,
        minDistance: 1.5,
        maxDistance: 8,
        height: 3,
        sensitivity: 0.002,
        rotationSpeed: 0.25,
        initialYaw: initialYaw,
        // keep the original pitch range (30°–60°)
      });
      this.thirdPersonCamera.setCollisionObjects(this.walls);
    });
  }

  _createOverviewMarker() {
    const group = new THREE.Group();
    group.name = "OverviewMarker";
    group.renderOrder = 999;

    const baseMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });

    const ringMat = baseMat.clone();
    ringMat.color.set(0xffff00);

    const arrowMat = baseMat.clone();
    arrowMat.color.set(0xff3b30);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 40), ringMat);
    ring.rotation.x = -Math.PI / 2;

    const centerDisc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 28), baseMat.clone());
    centerDisc.rotation.x = -Math.PI / 2;
    centerDisc.position.y = 0.01;

    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 16), arrowMat);
    arrow.position.set(0, 0.45, -0.9);
    arrow.rotation.x = Math.PI;

    group.add(ring);
    group.add(centerDisc);
    group.add(arrow);
    return group;
  }

  setOverviewMarkerVisible(visible) {
    if (this.overviewMarker) this.overviewMarker.visible = !!visible;
  }

  setOverviewMarkerScale(scale = 1) {
    if (this.overviewMarker) {
      this.overviewMarker.scale.setScalar(scale);
    }
  }

  updateOverviewMarker() {
    if (!this.overviewMarker || !this.playerData?.model) return;
    const p = this.playerData.model.position;
    this.overviewMarker.position.set(p.x, 2.25, p.z);
    this.overviewMarker.rotation.y = this.playerData.model.rotation.y;
  }

  createUI() {
    // Level display
    this.levelDisplay = document.createElement("div");
    this.levelDisplay.id = "level-display";
    this.levelDisplay.textContent = `Level ${this.currentLevel}`;

    // Hunger bar container + overlay
    this.hungerContainer = document.createElement("div");
    this.hungerContainer.id = "hunger-container";
    this.hungerBar = document.createElement("div");
    this.hungerBar.id = "hunger-bar";
    this.hungerContainer.appendChild(this.hungerBar);

    this.hungerOverlay = document.createElement("div");
    this.hungerOverlay.id = "hunger-overlay";

    // Exit button
    this.exitButton = document.createElement("button");
    this.exitButton.id = "exit-game-btn";
    this.exitButton.textContent = "Exit";

    const levelStyle = document.createElement("style");
    levelStyle.textContent = `
      #level-display {
        position: fixed;
        top: 20px;
        left: 20px;
        font-family: 'Courier New', monospace;
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        color: #ffffff;
        background: rgba(0, 0, 0, 0.6);
        padding: 0.8rem 1.5rem;
        border-radius: 10px;
        z-index: 100;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }
      #hunger-container {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 40%;
        height: 20px;
        background: rgba(255,255,255,0.1);
        border: 2px solid #fff;
        border-radius: 10px;
        z-index: 100;
      }
      #hunger-bar {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #ffeb3b, #f44336);
        border-radius: 8px;
        transition: width 0.1s linear;
      }
      #hunger-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at center, transparent 40%, rgba(255,0,0,0) 70%);
        pointer-events: none;
        z-index: 150;
        transition: background 0.2s ease;
      }
      #exit-game-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        font-family: 'Courier New', monospace;
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        color: #ffffff;
        background: rgba(200, 50, 50, 0.8);
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 10px;
        z-index: 100;
        cursor: pointer;
      }

      @media (max-width: 768px) {
        #level-display {
          top: 10px;
          left: 10px;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
        }
        #hunger-container {
          width: 60%;
          top: 10px;
        }
        #exit-game-btn {
          top: 10px;
          right: 10px;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
        }
      }
    `;
    document.head.appendChild(levelStyle);
    document.body.appendChild(this.levelDisplay);
    document.body.appendChild(this.hungerContainer);
    // force initial width zero to avoid transition artifact
    if (this.hungerBar) this.hungerBar.style.width = "0%";
    document.body.appendChild(this.hungerOverlay);
    document.body.appendChild(this.exitButton);

    // Mobile camera toggle button (hidden on desktop)
    this.mobileCameraButton = document.createElement("button");
    this.mobileCameraButton.id = "mobile-camera-btn";
    this.mobileCameraButton.textContent = "Camera";

    const mobileStyle = document.createElement("style");
    mobileStyle.textContent = `
      #mobile-camera-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        font-family: 'Courier New', monospace;
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        color: #ffffff;
        background: rgba(0, 123, 255, 0.8);
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 10px;
        z-index: 100;
        cursor: pointer;
        display: none;
      }

      @media (max-width: 768px) {
        #mobile-camera-btn {
          display: block;
        }
      }
    `;
    document.head.appendChild(mobileStyle);
    document.body.appendChild(this.mobileCameraButton);

    // Game complete panel (hidden initially)
    this.gameCompletePanel = document.createElement("div");
    this.gameCompletePanel.id = "game-complete-panel";
    this.gameCompletePanel.innerHTML = `
      <div class="complete-content">
        <h2 class="complete-title">Level Complete!</h2>
        <p class="complete-message">You reached the food in time!</p>
        <div class="complete-buttons">
          <button id="next-level-btn" class="complete-button">Next Level</button>
          <button id="main-menu-btn" class="complete-button secondary">Main Menu</button>
        </div>
      </div>
    `;

    // Game over panel (hunger)
    this.gameOverPanel = document.createElement("div");
    this.gameOverPanel.id = "game-over-panel";
    this.gameOverPanel.innerHTML = `
      <div class="over-content">
        <h2 class="over-title">Hunger Claims You</h2>
        <p class="over-message">You starved to death...</p>
        <div class="over-buttons">
          <button id="retry-btn" class="over-button">Retry</button>
          <button id="home-btn" class="over-button secondary">Main Menu</button>
        </div>
      </div>
    `;
    const overStyle = document.createElement("style");
    overStyle.textContent = `
      #game-over-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2200;
      }
      #game-over-panel.show {
        display: flex;
      }
      .over-content {
        background: #2c3e50;
        padding: 3rem;
        border-radius: 20px;
        text-align: center;
        max-width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      .over-title {
        font-family: 'Courier New', monospace;
        font-size: clamp(2rem, 5vw, 3.5rem);
        color: #e74c3c;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }
      .over-message {
        font-family: 'Courier New', monospace;
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        color: #ffffff;
        margin-bottom: 2rem;
      }
      .over-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .over-button {
        font-family: 'Courier New', monospace;
        font-size: clamp(1rem, 2vw, 1.2rem);
        padding: 1rem 2rem;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: bold;
        text-transform: uppercase;
      }
      .over-button.secondary {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }
      .over-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(overStyle);
    document.body.appendChild(this.gameOverPanel);

    const completeStyle = document.createElement("style");
    completeStyle.textContent = `
      #game-complete-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }

      #game-complete-panel.show {
        display: flex;
      }

      .complete-content {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 3rem;
        border-radius: 20px;
        text-align: center;
        max-width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      .complete-title {
        font-family: 'Courier New', monospace;
        font-size: clamp(2rem, 5vw, 3.5rem);
        color: #ffffff;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }

      .complete-message {
        font-family: 'Courier New', monospace;
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        color: #ffffff;
        margin-bottom: 2rem;
      }

      .complete-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .complete-button {
        font-family: 'Courier New', monospace;
        font-size: clamp(1rem, 2vw, 1.2rem);
        padding: 1rem 2rem;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: bold;
        text-transform: uppercase;
      }

      .complete-button.secondary {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      .complete-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }

      @media (max-width: 768px) {
        .complete-content {
          padding: 2rem 1.5rem;
        }

        .complete-buttons {
          flex-direction: column;
        }

        .complete-button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(completeStyle);
    document.body.appendChild(this.gameCompletePanel);

    // Exit confirmation panel (hidden initially)
    this.exitConfirmationPanel = document.createElement("div");
    this.exitConfirmationPanel.id = "exit-confirmation-panel";
    this.exitConfirmationPanel.innerHTML = `
      <div class="exit-content">
        <h2 class="exit-title">Don't you want to end starvation?</h2>
        <div class="exit-buttons">
          <button id="exit-yes-btn" class="exit-button">Yes</button>
          <button id="exit-no-btn" class="exit-button secondary">No</button>
        </div>
      </div>
    `;

    const exitStyle = document.createElement("style");
    exitStyle.textContent = `
      #exit-confirmation-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2100;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      #exit-confirmation-panel.show {
        display: flex;
        opacity: 1;
      }

      .exit-content {
        background: #2c3e50;
        padding: 3rem;
        border-radius: 20px;
        border: 2px solid #ecf0f1;
        text-align: center;
        max-width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        transform: scale(0.8);
        transition: transform 0.3s ease;
      }

      #exit-confirmation-panel.show .exit-content {
        transform: scale(1);
      }

      .exit-title {
        font-family: 'Courier New', monospace;
        font-size: clamp(2rem, 5vw, 3.5rem);
        color: #ffffff;
        margin-bottom: 2rem;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }

      .exit-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }

      .exit-button {
        font-family: 'Courier New', monospace;
        font-size: clamp(1.2rem, 3vw, 2rem);
        padding: 1rem 2rem;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .exit-button.secondary {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      .exit-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
      }

      @media (max-width: 768px) {
        .exit-content {
          padding: 2rem 1.5rem;
        }

        .exit-buttons {
          flex-direction: column;
        }

        .exit-button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(exitStyle);
    document.body.appendChild(this.exitConfirmationPanel);

    // Event listeners
    document.getElementById("next-level-btn").addEventListener("click", () => {
      this.hideCompletePanel();
      this.nextLevel();
    });

    document.getElementById("main-menu-btn").addEventListener("click", () => {
      this.hideCompletePanel();
      if (this.onLevelComplete) {
        this.onLevelComplete(null); // Return to menu
      }
    });

    this.exitButton.addEventListener("click", () => {
      this.showExitConfirmationPanel();
    });

    document.getElementById("exit-yes-btn").addEventListener("click", () => {
      this.hideExitConfirmationPanel();
      // Resume game
    });

    document.getElementById("exit-no-btn").addEventListener("click", () => {
      this.hideExitConfirmationPanel();
      // Exit game
      if (document.pointerLockElement) document.exitPointerLock();
      document.body.style.cursor = "default";
      if (this.onLevelComplete) this.onLevelComplete(null);
    });

    this.mobileCameraButton.addEventListener("click", () => {
      this.isFPS = !this.isFPS;
      // Update button text
      this.mobileCameraButton.textContent = this.isFPS ? "3rd Person" : "FPS";
    });

    // game over panel buttons
    document.getElementById("retry-btn").addEventListener("click", () => {
      this.hideGameOverPanel();
      if (this.onLevelComplete) this.onLevelComplete(this.currentLevel);
    });
    document.getElementById("home-btn").addEventListener("click", () => {
      this.hideGameOverPanel();
      if (this.onLevelComplete) this.onLevelComplete(null);
    });
  }

  updateLevel(level) {
    this.currentLevel = level;
    if (this.levelDisplay) {
      this.levelDisplay.textContent = `Level ${this.currentLevel}`;
    }
    // adjust hunger parameters based on level/difficulty
    this.maxHunger = 80 + this.currentLevel * 15; // make harder as level increases
    this.hungerRate = (1.5 + this.currentLevel * 0.5) * 0.5; // slower by half
    this.hunger = 0;
    this.hungerAlertPlayed = false;
    this.gameEnded = false; // reset when level starts

    this.createScene();
  }

  showCompletePanel() {
    if (this.gameCompletePanel) {
      this.gameCompletePanel.classList.add("show");

      // Stop audio
      if (this.hungerSound && this.hungerSound.isPlaying) {
        this.hungerSound.stop();
      }
      if (this.footstepSound && this.footstepSound.isPlaying) {
        this.footstepSound.stop();
      }

      // RELEASE POINTER WHEN UI POPS
      document.exitPointerLock();
    }
  }

  hideCompletePanel() {
    if (this.gameCompletePanel) {
      this.gameCompletePanel.classList.remove("show");
    }
  }

  showExitConfirmationPanel() {
    if (this.exitConfirmationPanel) {
      this.exitConfirmationPanel.classList.add("show");
    }
  }

  hideExitConfirmationPanel() {
    if (this.exitConfirmationPanel) {
      this.exitConfirmationPanel.classList.remove("show");
    }
  }

  showGameOverPanel() {
    if (this.gameOverPanel) {
      this.gameOverPanel.classList.add("show");
    }
  }

  hideGameOverPanel() {
    if (this.gameOverPanel) {
      this.gameOverPanel.classList.remove("show");
    }
  }

  nextLevel() {
    const nextLevelNum = this.currentLevel + 1;

    // SAVE NEXT LEVEL LOCALLY
    localStorage.setItem("savedLevel", nextLevelNum);

    if (this.onLevelComplete) {
      this.onLevelComplete(nextLevelNum);
    }
  }
  
  cleanup() {
    // Remove all objects from scene
    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }
    this.walls = [];
    this.goal = null;
    this.playerData = null;
    this.freeLook = null;
    this.thirdPersonCamera = null;
    this.overviewMarker = null;
    this.sky = null;
    if (this.exitButton) this.exitButton.remove();
    if (this.exitConfirmationPanel) this.exitConfirmationPanel.remove();
    if (this.mobileCameraButton) this.mobileCameraButton.remove();
    if (this.hungerContainer) this.hungerContainer.remove();
    if (this.hungerOverlay) this.hungerOverlay.remove();
    if (this.gameOverPanel) this.gameOverPanel.remove();

  }

  destroy() {
    this.cleanup();
    if (this.levelDisplay) {
      this.levelDisplay.remove();
    }
    if (this.gameCompletePanel) {
      this.gameCompletePanel.remove();
    }
    if (this.exitConfirmationPanel) {
      this.exitConfirmationPanel.remove();
    }
    if (this.mobileCameraButton) {
      this.mobileCameraButton.remove();
    }
  }

  getScene() {
    return this.scene;
  }

  _setupAudio() {
    // attach listener to camera so sounds are spatial
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);
    const loader = new THREE.AudioLoader();

    this.footstepSound = new THREE.Audio(this.audioListener);
    loader.load(import.meta.env.BASE_URL + "sounds/footstep.mp3", (buffer) => {
      this.footstepSound.setBuffer(buffer);
      this.footstepSound.setLoop(true);
      this.footstepSound.setVolume(0.5);
    });

    this.hungerSound = new THREE.Audio(this.audioListener);
    loader.load(import.meta.env.BASE_URL + "sounds/hunger.mp3", (buffer) => {
      this.hungerSound.setBuffer(buffer);
      this.hungerSound.setLoop(false);
      this.hungerSound.setVolume(0.7);
    });

    this.eatSound = new THREE.Audio(this.audioListener);
    loader.load(import.meta.env.BASE_URL + "sounds/eat.mp3", (buffer) => {
      this.eatSound.setBuffer(buffer);
      this.eatSound.setLoop(false);
      this.eatSound.setVolume(0.8);
    });

    // (hunger state is managed elsewhere; updateLevel resets values)
    // this.hunger and hungerAlertPlayed are initialized when level is set.
  }

  update(dt) {
    // protect against huge dt spikes (e.g. when switching scenes)
    if (dt > 0.1) dt = 0.1;

    // Sky time update + make it behave like a skybox (always around camera)
    if (this.sky) {
      if (this.sky?.userData?.update) this.sky.userData.update(dt);
      if (this.camera) this.sky.position.copy(this.camera.position);
    }
  
    // Existing animation update
    if (this.playerData?.mixer) this.playerData.mixer.update(dt);

    // hunger increases over time; reach max = game over (but skip if game ended)
    if (!this.gameEnded && this.hunger !== undefined) {
      this.hunger += dt * this.hungerRate;
      // update bar width
      if (this.hungerBar) {
        const pct = Math.min(1, this.hunger / this.maxHunger) * 100;
        this.hungerBar.style.width = pct + "%";
      }

      // overlay effect when near empty (vignette on sides, only after 70%)
      if (this.hungerOverlay) {
        const alpha = this.hunger >= this.maxHunger * 0.7 ? Math.min(1, (this.hunger - this.maxHunger * 0.7) / (this.maxHunger * 0.3)) * 0.8 : 0;
        this.hungerOverlay.style.background = `radial-gradient(circle at center, transparent 40%, rgba(255,0,0,${alpha}) 70%)`;
      }

      // play warning sound when >80% (but only if game hasn't ended)
      if (
        !this.gameEnded &&
        this.hunger >= this.maxHunger * 0.8 &&
        this.hungerSound &&
        !this.hungerAlertPlayed
      ) {
        this.hungerSound.play();
        this.hungerAlertPlayed = true;
      }

      // Game over check moved to main.js to prioritize win
    }

    // Rotate goal
    if (this.goal) {
      this.goal.rotation.y += dt * 2; // Rotate at 2 radians per second
    }
  }
  
}
