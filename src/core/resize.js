export const setupResize =({camera, renderer})=>{
    const onResize=()=>{
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener("resize", onResize);
    onResize();

    return ()=> window.removeEventListener("resize", onResize);
}