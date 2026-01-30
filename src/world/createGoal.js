import * as THREE from "three";

export function createGoal(position = { x: 10, z: 10 }) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffd700,
    emissiveIntensity: 0.8,
  });

  const goal = new THREE.Mesh(geometry, material);
  goal.position.set(position.x, 0.5, position.z);

  return goal;
}
