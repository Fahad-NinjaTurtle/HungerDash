import * as THREE from "three";
import { createScene } from "../core/createScene.js";
import { createCamera } from "../core/createCamera.js";
import { addLights } from "../world/addLights.js";
import { createGround } from "../world/createGround.js";
import { buildMaze } from "../world/buildMaze.js";
import { createGoal } from "../world/createGoal.js";
import { loadPlayerModel } from "../player/createPlayer.js";
import { FreeLook } from "../player/fpsControls.js";
import { ThirdPersonCamera } from "../player/thirdPersonCamera.js";
import { generateMaze } from "../world/mazeGenerator.js";

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
    this.freeLook = null;
    this.thirdPersonCamera = null;
    this.currentLevel = 1;
    this.isFPS = true;
    this.currentAnimation = null;
    this.targetPlayerRotation = 0;
    this.gameCompletePanel = null;
    this.levelDisplay = null;
  }

  init(level = 1) {
    this.currentLevel = level;
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

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    // Create ground
    const ground = createGround();
    this.scene.add(ground);

    // Generate maze based on level
    const mazeData = generateMaze(this.currentLevel);
    const mazeSize = mazeData.length;
    const cellSize = 2;
    const wallHeight = 4;

    this.walls = buildMaze(this.scene, {
      cellSize,
      wallHeight,
      mazeData,
    });

    // Calculate goal position (furthest point from start)
    // Find the furthest valid position from start (1, 1)
    let goalX = 1;
    let goalZ = 1;
    let maxDistance = 0;
    
    // Find furthest path cell from start
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

    // Load player model
    loadPlayerModel(this.scene, (model, mixer, actions) => {
      this.playerData = { model, mixer, actions };
      this.playerData.model.visible = false; // hide mesh in FPS
      this.freeLook = new FreeLook(this.camera);
      
      // Initialize third-person camera
      this.thirdPersonCamera = new ThirdPersonCamera(this.camera, model, {
        distance: 6,
        minDistance: 1.5,
        maxDistance: 8,
        height: 3,
        sensitivity: 0.002,
        rotationSpeed: 0.25,
      });
      this.thirdPersonCamera.setCollisionObjects(this.walls);
    });
  }

  createUI() {
    // Level display
    this.levelDisplay = document.createElement("div");
    this.levelDisplay.id = "level-display";
    this.levelDisplay.textContent = `Level ${this.currentLevel}`;
    
    const levelStyle = document.createElement("style");
    levelStyle.textContent = `
      #level-display {
        position: fixed;
        top: 20px;
        left: 20px;
        font-family: 'Arial', sans-serif;
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        color: #ffffff;
        background: rgba(0, 0, 0, 0.6);
        padding: 0.8rem 1.5rem;
        border-radius: 10px;
        z-index: 100;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }

      @media (max-width: 768px) {
        #level-display {
          top: 10px;
          left: 10px;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
        }
      }
    `;
    document.head.appendChild(levelStyle);
    document.body.appendChild(this.levelDisplay);

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
        font-family: 'Arial', sans-serif;
        font-size: clamp(2rem, 5vw, 3.5rem);
        color: #ffffff;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }

      .complete-message {
        font-family: 'Arial', sans-serif;
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
        font-family: 'Arial', sans-serif;
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
  }

  updateLevel(level) {
    this.currentLevel = level;
    if (this.levelDisplay) {
      this.levelDisplay.textContent = `Level ${this.currentLevel}`;
    }
    this.createScene();
  }

  showCompletePanel() {
    if (this.gameCompletePanel) {
      this.gameCompletePanel.classList.add("show");
    }
  }

  hideCompletePanel() {
    if (this.gameCompletePanel) {
      this.gameCompletePanel.classList.remove("show");
    }
  }

  nextLevel() {
    const nextLevelNum = this.currentLevel + 1;
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
  }

  destroy() {
    this.cleanup();
    if (this.levelDisplay) {
      this.levelDisplay.remove();
    }
    if (this.gameCompletePanel) {
      this.gameCompletePanel.remove();
    }
  }

  getScene() {
    return this.scene;
  }
}

