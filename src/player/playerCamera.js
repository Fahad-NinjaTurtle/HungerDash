// playerCamera.js
import * as THREE from "three"; // ✅ REQUIRED

export function updatePlayerCamera(camera, player) {
  if (!player) return;

  // First-Person Camera
  camera.position.set(
    player.position.x+ 2,
    player.position.y + 3.6, // eye height
    player.position.z
  );

  // Forward vector for FPS look
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(player.quaternion);
  const lookAtPos = new THREE.Vector3().addVectors(camera.position, forward);

  camera.lookAt(lookAtPos);
}
