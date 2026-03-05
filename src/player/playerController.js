import * as THREE from "three";

export let keys = {};
let movementLocked = false;

export function setMovementLocked(locked) {
  movementLocked = !!locked;
}

/**
 * Keyboard input map.
 * Note: keys are *lowercase* (w/a/s/d/q) to match your code style.
 */
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
    q: false, // top-view toggle
  };

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (keys.hasOwnProperty(k)) keys[k] = true;
    // Also support uppercase (Shift)
    const lower = typeof k === "string" ? k.toLowerCase() : k;
    if (keys.hasOwnProperty(lower)) keys[lower] = true;
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key;
    if (keys.hasOwnProperty(k)) keys[k] = false;
    const lower = typeof k === "string" ? k.toLowerCase() : k;
    if (keys.hasOwnProperty(lower)) keys[lower] = false;
  });

  return keys;
}

export function movePlayerAnimated(
  playerData,
  dt,
  walls,
  speed = 5,
  freeLook = null,
  isFPS = true,
  camera = null,
  cameraYaw = null
) {
  const { model, mixer } = playerData;

  // In overview / UI mode: no movement, but keep animations ticking
  if (movementLocked || speed <= 0) {
    mixer.update(dt);
    return null;
  }

  let moveDir = new THREE.Vector3();

  // Build movement vector from keys
  if (keys.w) moveDir.z -= 1;
  if (keys.s) moveDir.z += 1;
  if (keys.a) moveDir.x -= 1;
  if (keys.d) moveDir.x += 1;

  if (moveDir.length() === 0) {
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
    const movementYaw = cameraYaw + Math.PI; // camera looks at player
    const quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(0, movementYaw, 0, "YXZ"));
    moveDir.applyQuaternion(quat);
  }

  // Calculate new position
  const newPosition = model.position.clone();
  newPosition.x += moveDir.x * speed * dt;
  newPosition.z += moveDir.z * speed * dt;

  // Collision - check each axis separately for sliding
  const playerBoxX = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(newPosition.x, newPosition.y, model.position.z),
    new THREE.Vector3(0.8, 1.8, 0.8)
  );
  const playerBoxZ = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(model.position.x, newPosition.y, newPosition.z),
    new THREE.Vector3(0.8, 1.8, 0.8)
  );

  let canMoveX = true;
  let canMoveZ = true;

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (canMoveX && playerBoxX.intersectsBox(wallBox)) {
      canMoveX = false;
    }
    if (canMoveZ && playerBoxZ.intersectsBox(wallBox)) {
      canMoveZ = false;
    }
  }

  if (!canMoveX) newPosition.x = model.position.x;
  if (!canMoveZ) newPosition.z = model.position.z;

  model.position.copy(newPosition);

  // Update mixer for animations
  mixer.update(dt);

  // Rotate player mesh to face movement in third-person only (smoothly)
  if (!isFPS && moveDir.length() > 0) {
    const angle = Math.atan2(moveDir.x, moveDir.z);
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
  return playerBox.intersectsBox(goalBox);
}
