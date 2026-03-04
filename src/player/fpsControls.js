import * as THREE from "three";

export class FreeLook {
  constructor(camera, domElement = document.body) {
    this.camera = camera;
    this.domElement = domElement;

    this.pitch = 0; // up/down
    this.yaw = 0;   // left/right

    this.sensitivity = 0.002;
    this.isPointerLocked = false;

    this.initPointerLock();
    this.initMouseMove();
  }

  initPointerLock() {
    // this.domElement.addEventListener("click", () => {
    //   this.domElement.requestPointerLock();
    // });

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });
  }

  initMouseMove() {
    document.addEventListener("mousemove", (e) => {
      if (!this.isPointerLocked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    });
  }

  update(player) {
    if (!player) return;

    // Camera sits at player head
    const camPos = new THREE.Vector3(
      player.position.x,
      player.position.y + 1.6,
      player.position.z
    );

    this.camera.position.copy(camPos);

    const quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    const lookAtPos = new THREE.Vector3().addVectors(camPos, forward);
    this.camera.lookAt(lookAtPos);
  }

  getYaw() {
    return this.yaw; // exposed for movement
  }
}
