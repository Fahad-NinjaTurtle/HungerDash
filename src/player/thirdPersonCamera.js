import * as THREE from "three";;

/**
 * Professional Third-Person Camera Controller
 * Features:
 * - Smooth orbital rotation around target
 * - Collision detection with environment
 * - Configurable distance, height, and sensitivity
 * - Smooth interpolation for camera movement
 */
export class ThirdPersonCamera {
  /**
   * @param {THREE.Camera} camera
   * @param {THREE.Object3D} target object to orbit around (usually the player model)
   * @param {Object} [options]
   * @param {number} [options.distance=6]
   * @param {number} [options.minDistance=1.5]
   * @param {number} [options.maxDistance=8]
   * @param {number} [options.height=3]
   * @param {number} [options.sensitivity=0.002]
   * @param {number} [options.rotationSpeed=0.15]
   * @param {number} [options.collisionRadius=0.5]
   * @param {number} [options.initialYaw=0] radians around Y axis
   * @param {number} [options.initialPitch=Math.PI/6] vertical starting angle
   * @param {number} [options.pitchMin=Math.PI/6]
   * @param {number} [options.pitchMax=Math.PI/3]
   */
  constructor(camera, target, options = {}) {
    this.camera = camera;
    this.target = target;
    
    // Configuration
    this.distance = options.distance || 6;
    this.minDistance = options.minDistance || 1.5;
    this.maxDistance = options.maxDistance || 8;
    this.height = options.height || 3;
    this.sensitivity = options.sensitivity || 0.002;
    this.rotationSpeed = options.rotationSpeed || 0.15;
    this.collisionRadius = options.collisionRadius || 0.5;
    
    // Camera state
    this.yaw = options.initialYaw || 0; // Horizontal rotation around target
    this.pitch = options.initialPitch !== undefined ? options.initialPitch : Math.PI / 6; // Vertical angle (0 = horizontal, PI/2 = above)
    this.pitchMin = options.pitchMin !== undefined ? options.pitchMin : Math.PI / 6; // Limit to 30 degrees up
    this.pitchMax = options.pitchMax !== undefined ? options.pitchMax : Math.PI / 3; // Limit to 60 degrees down
    
    // Smoothing
    this.currentDistance = this.distance;
    this.targetDistance = this.distance;
    
    // Collision objects
    this.collisionObjects = [];
    
    // Pointer lock
    this.isPointerLocked = false;
    this.initPointerLock();
    this.initMouseMove();
    this.initTouchMove();
  }
  
  initPointerLock() {
    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
    });
  }
  
  initMouseMove() {
    document.addEventListener("mousemove", (e) => {
      if (!this.isPointerLocked) return;
      
      this.yaw -= e.movementX * this.sensitivity;
      this.yaw = Math.max(-Math.PI, Math.min(Math.PI, this.yaw));
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
    });
  }

  initTouchMove() {
    let lastTouchX = 0;
    let lastTouchY = 0;
    let active = false;

    const isInJoystick = (target) => {
      try {
        return !!target?.closest?.("#mobile-controls");
      } catch {
        return false;
      }
    };

    document.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) {
          active = false;
          return;
        }

        // Ignore touch starts inside the virtual joystick area.
        if (isInJoystick(e.touches[0].target)) {
          active = false;
          return;
        }

        active = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      },
      { passive: true }
    );

    document.addEventListener(
      "touchmove",
      (e) => {
        if (!active || e.touches.length !== 1) return;
        e.preventDefault();

        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;

        this.yaw -= deltaX * this.sensitivity * 0.5; // Reduce sensitivity for touch
        this.yaw = Math.max(-Math.PI, Math.min(Math.PI, this.yaw));
        this.pitch -= deltaY * this.sensitivity * 0.5;
        this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      },
      { passive: false }
    );

    document.addEventListener(
      "touchend",
      (e) => {
        if (e.touches.length === 0) {
          active = false;
        }
      },
      { passive: true }
    );
  }
  
  setCollisionObjects(objects) {
    this.collisionObjects = objects;
  }
  
  update(dt) {
    if (!this.target) return;
    
    // Get target position
    const targetPos = new THREE.Vector3(
      this.target.position.x,
      this.target.position.y + this.height,
      this.target.position.z
    );
    
    // Calculate ideal camera position using spherical coordinates
    const horizontalDistance = this.distance * Math.cos(this.pitch);
    const verticalOffset = this.distance * Math.sin(this.pitch);
    
    const offsetX = Math.sin(this.yaw) * horizontalDistance;
    const offsetZ = Math.cos(this.yaw) * horizontalDistance;
    
    const idealCameraPos = new THREE.Vector3(
      this.target.position.x + offsetX,
      targetPos.y + verticalOffset,
      this.target.position.z + offsetZ
    );
    
    // Check for collisions
    let safeDistance = this.distance;
    const testPoints = 20;
    const cameraStartPos = new THREE.Vector3(
      this.target.position.x,
      targetPos.y + verticalOffset,
      this.target.position.z
    );
    
    for (let i = 0; i <= testPoints; i++) {
      const t = i / testPoints;
      const testPos = new THREE.Vector3().lerpVectors(cameraStartPos, idealCameraPos, t);
      const testBox = new THREE.Box3().setFromCenterAndSize(
        testPos,
        new THREE.Vector3(this.collisionRadius * 2, this.collisionRadius * 2, this.collisionRadius * 2)
      );
      
      for (const obj of this.collisionObjects) {
        const objBox = new THREE.Box3().setFromObject(obj);
        if (testBox.intersectsBox(objBox)) {
          const dist = cameraStartPos.distanceTo(testPos);
          safeDistance = Math.min(safeDistance, Math.max(this.minDistance, dist - this.collisionRadius - 0.3));
          break;
        }
      }
    }
    
    // Smooth distance interpolation
    this.targetDistance = safeDistance;
    this.currentDistance += (this.targetDistance - this.currentDistance) * 0.2;
    
    // Recalculate camera position with safe distance
    const safeHorizontalDistance = this.currentDistance * Math.cos(this.pitch);
    const safeVerticalOffset = this.currentDistance * Math.sin(this.pitch);
    
    const safeOffsetX = Math.sin(this.yaw) * safeHorizontalDistance;
    const safeOffsetZ = Math.cos(this.yaw) * safeHorizontalDistance;
    
    const safeCameraPos = new THREE.Vector3(
      this.target.position.x + safeOffsetX,
      targetPos.y + safeVerticalOffset,
      this.target.position.z + safeOffsetZ
    );
    
    // Smooth camera movement
    this.camera.position.lerp(safeCameraPos, this.rotationSpeed);
    
    // Look at target
    const lookAtPos = new THREE.Vector3(
      this.target.position.x,
      this.target.position.y + this.height * 0.5,
      this.target.position.z
    );
    this.camera.lookAt(lookAtPos);
  }
  
  getYaw() {
    return this.yaw + Math.PI; // Return camera's forward direction for movement
  }
  
  setDistance(distance) {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
  }
  
  setSensitivity(sensitivity) {
    this.sensitivity = sensitivity;
  }
}

