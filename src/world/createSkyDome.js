import * as THREE from "three";

export function createSkyDome() {
  // No geometry.scale(-1,1,1). We render the inside using BackSide only.
  const geometry = new THREE.SphereGeometry(5000, 64, 48);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      skyTop: { value: new THREE.Color(0x77bfff) },
      skyHorizon: { value: new THREE.Color(0xcfefff) },
      cloud: { value: new THREE.Color(0xffffff) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float time;
      uniform vec3 skyTop;
      uniform vec3 skyHorizon;
      uniform vec3 cloud;

      varying vec3 vWorldPos;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }

      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.5;
        for(int i=0;i<6;i++){
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        // Direction from camera to this fragment (cameraPosition is built-in in three.js shaders)
        vec3 dir = normalize(vWorldPos - cameraPosition);

        // Gradient: horizon brighter, zenith deeper
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 sky = mix(skyHorizon, skyTop, smoothstep(0.0, 1.0, h));

        // Clouds
          float y = max(0.18, dir.y + 0.25);
          vec2 p = dir.xz / y;

          // multiple moving layers
          vec2 uv1 = p * 0.45 + vec2(time * 0.018, time * 0.012);
          vec2 uv2 = p * 0.95 + vec2(-time * 0.024, time * 0.014);
          vec2 uv3 = p * 1.80 + vec2(time * 0.030, -time * 0.020);

          // combine layers to increase density
          float n =
              fbm(uv1) * 0.45 +
              fbm(uv2) * 0.35 +
              fbm(uv3) * 0.20;

          // lower threshold = more clouds
          float d = smoothstep(0.40, 0.70, n);

          // allow clouds across more of the sky
          d *= smoothstep(0.20, 0.75, h);

          // slightly brighten clouds
          float light = clamp(0.65 + 0.35 * dir.y, 0.0, 1.0);
          vec3 cloudCol = cloud * light;

          vec3 col = mix(sky, cloudCol, d);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });

  const sky = new THREE.Mesh(geometry, material);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;

  sky.userData.update = (dt) => {
    material.uniforms.time.value += dt;
  };

  return sky;
}
