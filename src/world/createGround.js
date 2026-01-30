import * as THREE from "three";
import { TextureLoader } from "three";

export const createGround = () => {
    const geometry = new THREE.PlaneGeometry(50, 50);
    
    // Load floor texture
    const textureLoader = new TextureLoader();
    const floorTexture = textureLoader.load("/Textures/floor.svg");
    
    // Configure texture
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10); // Repeat texture 10x10 times
    
    const material = new THREE.MeshStandardMaterial({
        map: floorTexture,
        roughness: 0.8,
        metalness: 0.1
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;

    ground.receiveShadow = true;

    return ground;
}