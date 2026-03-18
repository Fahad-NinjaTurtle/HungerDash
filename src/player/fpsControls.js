import * as THREE from "three";;

export class FreeLook {
  /**
   * @param {THREE.Camera} camera
   * @param {Object} [options]
   * @param {HTMLElement} [options.domElement=document.body]
   * @param {number} [options.initialYaw=0] radians around Y axis (horizontal orientation)
   * @param {number} [options.initialPitch=0] radians (vertical orientation)
   * @param {number} [options.pitchMin=-PI/2] minimum pitch (look up limit)
   * @param {number} [options.pitchMax=PI/2] maximum pitch (look down limit)
   * @param {number} [options.sensitivity=0.002]
   */
  constructor(camera, options = {}) {
    this.camera = camera;
    this.domElement = options.domElement || document.body;

    // orientation state
    this.yaw = options.initialYaw || 0;   // left/right
    this.pitch = options.initialPitch || 0; // up/down

    // vertical look limits
    this.pitchMin = options.pitchMin !== undefined ? options.pitchMin : -Math.PI / 2;
    this.pitchMax = options.pitchMax !== undefined ? options.pitchMax : Math.PI / 2;

    this.sensitivity = options.sensitivity !== undefined ? options.sensitivity : 0.002;
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
      // clamp using configured limits
      this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
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
