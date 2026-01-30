import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function loadPlayerModel(scene, onLoad) {
  const loader = new GLTFLoader();

  loader.load("/models/character.glb", (gltf) => {

    const model = gltf.scene;
    // Scale down the player to make them shorter
    model.scale.set(0.7, 0.7, 0.7);
    
    // Calculate bounding box to position character on ground
    const box = new THREE.Box3().setFromObject(model);
    const bottomOffset = box.min.y;
    
    // Store offset for later use (e.g., reset position)
    model.userData.bottomOffset = bottomOffset;
    
    // Position character so bottom is at y=0
    model.position.set(2, -bottomOffset, 2);
    scene.add(model);

    // Animation
    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    gltf.animations.forEach((clip) => {
      actions[clip.name] = mixer.clipAction(clip);
    });

    // Play idle by default
    actions["Idle"]?.play();

    onLoad(model, mixer, actions);
  });
}
