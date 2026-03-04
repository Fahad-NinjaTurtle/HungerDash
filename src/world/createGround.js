import * as THREE from "three";
import { TextureLoader } from "three";

/**
 * Creates a textured ground plane.
 * - Backwards compatible: createGround() still works.
 * - Recommended: createGround({ width, depth, textureRepeat })
 */
export const createGround = (opts = {}) => {
  const {
    width = 50,
    depth = 50,
    textureRepeat = null, // if null, auto based on size
    y = 0,
  } = opts || {};

  const geometry = new THREE.PlaneGeometry(width, depth);

  // Load floor texture
  const textureLoader = new TextureLoader();
  const floorTexture = textureLoader.load("/Textures/floor.jpg");

  // Configure texture
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;

  const repeat = textureRepeat ?? {
    x: Math.max(4, Math.round(width / 8)),
    y: Math.max(4, Math.round(depth / 8)),
  };
  floorTexture.repeat.set(repeat.x, repeat.y);

  const material = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.85,
    metalness: 0.05,
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = y;
  ground.receiveShadow = true;

  return ground;
};
