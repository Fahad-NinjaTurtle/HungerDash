import * as THREE from "three";

export let keys = {};
export function setupPlayerControls() {
  keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
  };

  window.addEventListener("keydown", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  });

  window.addEventListener("keyup", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
  });

  return keys;
}

export function movePlayerAnimated(playerData, dt, walls, speed = 5, freeLook = null, isFPS = true, camera = null, cameraYaw = null) {
  const { model, mixer } = playerData;
  let moveDir = new THREE.Vector3();

  // Build movement vector from keys
  if (keys.w) moveDir.z -= 1;
  if (keys.s) moveDir.z += 1;
  if (keys.a) moveDir.x -= 1;
  if (keys.d) moveDir.x += 1;

  if (moveDir.length() === 0) {
    // Still update mixer even when not moving
    mixer.update(dt);
    return null;
  }

  moveDir.normalize();

  // Rotate movement by camera yaw (works for both FPS and third-person)
  if (isFPS && freeLook) {
    const yaw = freeLook.getYaw();
    const quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));
    moveDir.applyQuaternion(quat);
  } else if (!isFPS && cameraYaw !== null) {
    // Third-person: rotate movement relative to camera
    // Camera yaw represents where camera is looking (toward player)
    // For movement, we want to move relative to camera's orientation
    // So we rotate by camera yaw + PI (180 degrees) to get camera's "back" direction
    const movementYaw = cameraYaw + Math.PI; // Camera looks at player, so move relative to camera's back
    const quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(0, movementYaw, 0, "YXZ"));
    moveDir.applyQuaternion(quat);
  }

  // Calculate new position
  const newPosition = model.position.clone();
  newPosition.x += moveDir.x * speed * dt;
  newPosition.z += moveDir.z * speed * dt;

  // Collision
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    newPosition,
    new THREE.Vector3(0.8, 1.8, 0.8)
  );

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (playerBox.intersectsBox(wallBox)) {
      if (moveDir.x !== 0) newPosition.x = model.position.x;
      if (moveDir.z !== 0) newPosition.z = model.position.z;
      break;
    }
  }

  model.position.copy(newPosition);

  // Update mixer for animations
  mixer.update(dt);

  // Rotate player mesh to face movement in third-person only (smoothly)
  if (!isFPS && moveDir.length() > 0) {
    const angle = Math.atan2(moveDir.x, moveDir.z);
    // Return target rotation for smooth interpolation in main.js
    return angle;
  }

  return null;
}



export function checkWin(player, goal) {
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    player.position,
    new THREE.Vector3(0.8, 1.8, 0.8)
  );

  const goalBox = new THREE.Box3().setFromObject(goal);

  if (playerBox.intersectsBox(goalBox)) {
    return true;
  }
  return false;
}
