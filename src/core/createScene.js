import * as THREE from "three";;

export const createScene = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f1a);
    return scene;
};
