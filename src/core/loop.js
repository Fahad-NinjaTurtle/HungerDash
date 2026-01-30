export const startLoop = ({ renderer, scene, camera, tick }) =>{
    let last = performance.now();
    const frame = (now)=>{
        const dt = (now - last) / 1000;
        last = now;

        tick?.(dt);

        // Render is handled in tick function for dynamic scene switching
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}