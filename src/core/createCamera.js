import * as THREE from "three"

export const createCamera = ()=>{
    const camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );

    camera.position.set(10,10,10);
    camera.lookAt(0,0,0);
     
    return camera;
}