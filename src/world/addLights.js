import * as THREE from "three";

export const addLights=(scene)=>{
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(6,10,6);
    sun.target.position.set(0,0,0);

    scene.add(sun);
    scene.add(sun.target);
}