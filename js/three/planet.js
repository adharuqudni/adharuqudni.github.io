/* ══════════════════════════════════════════════
   CONTACT — toon planet + ring + orbiting moon,
   wrapped in a custom-GLSL FRESNEL rim glow that
   pulses. The rim is a slightly inflated shell with
   additive blending, brightest at the silhouette.
   ══════════════════════════════════════════════ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeToon, addLights, COLORS } from '../lib/toon.js';

const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const SECTION_BG = 0x232850;   // matches .section-contact background

const fresnelVert = `
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const fresnelFrag = `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), uPower);
    float pulse = 0.82 + 0.18 * sin(uTime * 1.6);
    gl_FragColor = vec4(uColor, f * uIntensity * pulse);
  }
`;

export function createPlanet(canvas) {
  const host = canvas.parentElement;

  // opaque renderer (not alpha) so UnrealBloom has a solid dark backdrop to
  // bloom against; the scene bg matches the CSS section colour = seamless.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SECTION_BG);
  const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 24);
  addLights(scene);

  // blooming starfield (replaces the flat CSS dot pattern the opaque canvas covers)
  const starN = isMobile ? 70 : 140;
  const sp = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    sp[i * 3]     = (Math.random() - 0.5) * 64;
    sp[i * 3 + 1] = (Math.random() - 0.5) * 40;
    sp[i * 3 + 2] = -12 - Math.random() * 22;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, sizeAttenuation: true }));
  scene.add(stars);

  const group = new THREE.Group();
  group.add(makeToon(new THREE.SphereGeometry(4.6, 32, 24), COLORS.blue, 0.05));

  // fresnel rim glow shell
  const rimUniforms = {
    uColor: { value: new THREE.Color(0x9ad8ff) },
    uPower: { value: 2.6 },
    uIntensity: { value: 1.7 },
    uTime: { value: 0 },
  };
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(4.6 * 1.14, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: rimUniforms,
      vertexShader: fresnelVert,
      fragmentShader: fresnelFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  group.add(rim);

  const ring = makeToon(new THREE.TorusGeometry(7.2, 0.5, 16, 64), COLORS.yellow, 0.12);
  ring.rotation.x = Math.PI / 2.4;
  ring.rotation.y = 0.15;
  group.add(ring);

  const moonPivot = new THREE.Group();
  const moon = makeToon(new THREE.SphereGeometry(0.9, 20, 16), COLORS.pink, 0.1);
  moon.position.set(9.5, 1.2, 0);
  moonPivot.add(moon);
  group.add(moonPivot);

  group.position.set(isMobile ? 0 : 11.5, isMobile ? -10 : -3.5, -4);
  group.rotation.z = -0.12;
  scene.add(group);

  // ── post-processing: selective-ish bloom (high threshold so only the bright
  //    rim glow, yellow ring and moon bloom, not the whole planet) ──
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(DPR);
  composer.setSize(host.clientWidth, host.clientHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(host.clientWidth, host.clientHeight),
    0.75,   // strength
    0.55,   // radius
    0.6     // threshold
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function render(s) {
    group.rotation.y = s * 0.25;
    moonPivot.rotation.y = s * 0.6;
    rimUniforms.uTime.value = s;
    composer.render();
  }

  return {
    visible: false,
    update: render,
    renderStatic: () => render(0),
    resize() {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
      composer.setSize(host.clientWidth, host.clientHeight);
    },
    renderer,
  };
}
