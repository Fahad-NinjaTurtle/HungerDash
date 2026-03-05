import * as THREE from "three";
import { TextureLoader } from "three";

// Shared texture loader and material for all walls
let grassTexture = null;
let wallMaterial = null;

function loadGrassTexture() {
  if (!grassTexture) {
    const textureLoader = new TextureLoader();
    grassTexture = textureLoader.load(import.meta.env.BASE_URL + "Textures/grass.jpg");
    
    // Configure texture
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    
    // Create shared material
    wallMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      roughness: 0.9,
      metalness: 0.1
    });
  }
  return wallMaterial;
}

export function createWall(size = 1, height = 0.5) {
  const geometry = new THREE.BoxGeometry(size, height, size);
  const material = loadGrassTexture();
  
  // Set texture repeat based on wall size
  if (material.map) {
    material.map.repeat.set(size, height);
  }

  const wall = new THREE.Mesh(geometry, material);
  wall.position.y = height / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;

  return wall;
}
