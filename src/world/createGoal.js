import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createGoal(
  position = { x: 10, z: 10 },
  modelPath = import.meta.env.BASE_URL + "models/goal.glb" // default location inside public/
) {
  const group = new THREE.Group();
  group.position.set(position.x, 0, position.z);

  // placeholder cube while model loads
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffd700,
    emissiveIntensity: 0.8,
  });
  const placeholder = new THREE.Mesh(geometry, material);
  placeholder.position.y = 0.5;
  placeholder.scale.set(0.5, 0.5, 0.5); // Make goal smaller
  group.add(placeholder);

  // try loading model (supports glb or gltf). if first path fails, try alternate extension.
  const loader = new GLTFLoader();
  const attempts = [];
  attempts.push(modelPath);
  if (modelPath.match(/\.glb$/i)) {
    attempts.push(modelPath.replace(/\.glb$/i, ".gltf"));
  } else if (modelPath.match(/\.gltf$/i)) {
    attempts.push(modelPath.replace(/\.gltf$/i, ".glb"));
  }

  let loaded = false;
  let attemptsDone = 0;
  attempts.forEach((path) => {
    if (loaded) return;
    loader.load(
      path,
      (gltf) => {
        if (loaded) return;
        loaded = true;
        group.remove(placeholder);
        const model = gltf.scene || gltf;
        model.position.set(0, 0.9, 0);
        model.scale.set(0.1, 0.1, 0.1); // Make loaded model smaller too
        group.add(model);
      },
      undefined,
      (err) => {
        console.warn("Goal model load failed (", path, "): ", err);
        attemptsDone++;
        if (attemptsDone === attempts.length && !loaded) {
          console.warn("All goal model attempts failed; using placeholder cube.");
        }
      }
    );
  });

  return group;
}
