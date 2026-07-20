/* ══════════════════════════════════════════════
   HERO BACKGROUND — animated cel-banded "toon noise"
   gradient that replaces the flat cream behind the
   hero. Its own opaque canvas so a WebGL failure just
   falls back to the CSS cream. Full-screen shader quad,
   orthographic, no lights — cheap.
   ══════════════════════════════════════════════ */
import * as THREE from 'three';

const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

const frag = `
  uniform float uTime;
  uniform vec2 uRes;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    vec2 p = uv * 3.0;
    float t = uTime * 0.05;
    float n = noise(p + vec2(t, -t*0.7));
    n += 0.5 * noise(p*2.0 - vec2(t*0.5, t));
    n /= 1.5;
    n = floor(n * 5.0) / 5.0;                 // cel banding = toon look
    vec3 cream = vec3(1.0, 0.957, 0.863);
    vec3 warm  = vec3(1.0, 0.886, 0.72);
    vec3 col = mix(cream, warm, smoothstep(0.25, 0.85, n));
    float b = noise(p*0.7 + vec2(-t, t*0.6));
    b = floor(b * 5.0) / 5.0;
    col = mix(col, vec3(1.0, 0.85, 0.93), smoothstep(0.7, 1.0, b) * 0.22);  // faint pink pools
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createHeroBg(canvas) {
  const host = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(DPR);
  renderer.setSize(host.clientWidth, host.clientHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(host.clientWidth * DPR, host.clientHeight * DPR) },
  };
  scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ uniforms, fragmentShader: frag })
  ));

  function render(s) {
    uniforms.uTime.value = s;
    renderer.render(scene, camera);
  }

  return {
    visible: true,
    update: render,
    renderStatic: () => render(2.0),
    resize() {
      renderer.setSize(host.clientWidth, host.clientHeight);
      uniforms.uRes.value.set(host.clientWidth * DPR, host.clientHeight * DPR);
    },
    renderer,
  };
}
