import * as THREE from "three"
export const createTestCube = ()=>{
    const geometry = new THREE.BoxGeometry(1,1,1);
    const material = new THREE.MeshStandardMaterial({
        color: 0x4cc9f0
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0,0.5,0);
    return cube;
}