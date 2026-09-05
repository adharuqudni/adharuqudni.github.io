import * as THREE from '../static/vendor/three.module.min.js';

// A small, self-contained scene. Every transform is driven by document scroll.
export function createStoryScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x0b0d11, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 40);
  camera.position.set(0, .1, 9.5);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const resources = [];
  const own = resource => { resources.push(resource); return resource; };
  const studio = document.createElement('canvas');
  studio.width = 1024; studio.height = 512;
  const ctx = studio.getContext('2d');
  ctx.fillStyle = '#283040'; ctx.fillRect(0, 0, 1024, 512);
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#bfcce2'); gradient.addColorStop(.48, '#454e60'); gradient.addColorStop(1, '#11151e');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(80, 45, 175, 270); ctx.fillRect(620, 70, 65, 320);
  ctx.fillStyle = '#9cbbf3'; ctx.fillRect(860, 190, 100, 200);
  const envTexture = own(new THREE.CanvasTexture(studio));
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(envTexture);
  scene.environment = environment.texture;
  pmrem.dispose();
  const ambient = new THREE.HemisphereLight(0xd8e6ff, 0x172034, 2.1);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 3.5); key.position.set(-3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x82acff, 2.3); rim.position.set(4, -1, -2); scene.add(rim);

  const shape = new THREE.Shape();
  const w = 3.65, h = 2.7, r = .28;
  shape.moveTo(-w/2+r, -h/2); shape.lineTo(w/2-r, -h/2);
  shape.quadraticCurveTo(w/2, -h/2, w/2, -h/2+r); shape.lineTo(w/2, h/2-r);
  shape.quadraticCurveTo(w/2, h/2, w/2-r, h/2); shape.lineTo(-w/2+r, h/2);
  shape.quadraticCurveTo(-w/2, h/2, -w/2, h/2-r); shape.lineTo(-w/2, -h/2+r);
  shape.quadraticCurveTo(-w/2, -h/2, -w/2+r, -h/2);
  const plateGeometry = own(new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 4, steps: 1, curveSegments: 16 }));
  plateGeometry.center();
  const silver = own(new THREE.MeshStandardMaterial({ color: 0xc7cfdb, metalness: .88, roughness: .24 }));
  const graphite = own(new THREE.MeshStandardMaterial({ color: 0x293140, metalness: .75, roughness: .25 }));
  const pale = own(new THREE.MeshStandardMaterial({ color: 0xdce3ec, metalness: .75, roughness: .21 }));
  const planes = [];
  function faceTexture(label, type) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 560;
    const c = canvas.getContext('2d');
    c.strokeStyle = type === 1 ? '#b6caff' : '#445164'; c.fillStyle = c.strokeStyle;
    c.lineWidth = 3; c.lineCap = 'round';
    if (type === 2) {
      c.save(); c.translate(249, 115); c.scale(4.3, 4.3); c.lineWidth = 2.5;
      c.stroke(new Path2D('M8 46 23 17Q24 15 25 17L40 46M20 46 35 17Q36 15 37 17L52 46M14 35H46')); c.restore();
    } else if (type === 1) {
      for (let row=0; row<3; row++) {
        c.strokeRect(237, 154+row*61, 295, 43);
        c.beginPath(); c.arc(262, 176+row*61, 4, 0, Math.PI*2); c.fill();
        c.beginPath(); c.moveTo(291, 176+row*61); c.lineTo(499, 176+row*61); c.stroke();
      }
    } else {
      c.strokeRect(201, 143, 366, 211); c.beginPath(); c.moveTo(201, 187); c.lineTo(567,187); c.stroke();
      c.strokeRect(225, 212, 95, 115);
      [236,273,311].forEach((y,i) => { c.beginPath(); c.moveTo(345,y); c.lineTo(i===2?458:533,y); c.stroke(); });
    }
    c.font = '500 19px Arial'; c.textAlign = 'center'; c.fillText(label, 384, 440);
    const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  [silver, graphite, pale].forEach((material, index) => {
    const group = new THREE.Group();
    const plate = new THREE.Mesh(plateGeometry, material);
    group.add(plate);
    const texture = faceTexture(['THE INTERFACE', 'THE SERVICES', 'ANNAS ADHARUQUDNI'][index], index);
    const face = new THREE.Mesh(own(new THREE.PlaneGeometry(3.55, 2.58)), own(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })));
    face.position.z = .133; group.add(face);
    assembly.add(group); planes.push(group);
  });

  const packetMaterial = own(new THREE.MeshStandardMaterial({ color: 0x9fc3ff, emissive: 0x285da9, emissiveIntensity: .5, metalness: .4, roughness: .25, transparent: true, opacity: 0 }));
  const packets = new THREE.InstancedMesh(own(new THREE.BoxGeometry(.055, .055, .18)), packetMaterial, 64);
  scene.add(packets);
  const dummy = new THREE.Object3D();
  const orbit = new THREE.Group(); scene.add(orbit);
  const orbitMaterial = own(new THREE.MeshBasicMaterial({ color: 0x6f8fbc, transparent: true, opacity: 0 }));
  for (let i=0; i<2; i++) {
    const ring = new THREE.Mesh(own(new THREE.TorusGeometry(2.65+i*.35, .006, 6, 110)), orbitMaterial);
    ring.rotation.set(.6+i*.9, .4+i*.5, .3); orbit.add(ring);
  }
  const nodeMaterial = own(new THREE.MeshStandardMaterial({ color: 0xc2d4ef, metalness: .6, roughness: .25, transparent: true, opacity: 0 }));
  const sphereGeometry = own(new THREE.SphereGeometry(.065, 12, 8));
  for (let i=0; i<10; i++) {
    const node = new THREE.Mesh(sphereGeometry, nodeMaterial);
    const a = i*Math.PI*.2; node.position.set(Math.cos(a)*2.9, Math.sin(a)*2.1, Math.sin(a*2)*.7);
    orbit.add(node);
  }
  let disposed = false;
  function resize() {
    if (disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width/height;
    camera.position.z = camera.aspect < .9 ? 11 : 9.5;
    camera.updateProjectionMatrix();
  }
  function draw(progress) {
    if (disposed) return;
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const spread = Math.sin(Math.min(p/.8, 1)*Math.PI);
    assembly.rotation.set(-.28 + Math.sin(p*Math.PI)*.35, -.52 + Math.sin(p*Math.PI*1.3)*.9, -.1 + p*.22);
    assembly.position.set(.03, .06, 0);
    planes.forEach((plate, i) => {
      plate.position.set((i-1)*spread*.6, (i-1)*spread*.25, (i-1)*(.38 + spread*1.1));
      plate.rotation.y = (i-1)*spread*.08;
    });
    packetMaterial.opacity = Math.max(0, Math.sin((p-.16)/.74*Math.PI))*.8;
    packets.visible = packetMaterial.opacity > .01;
    for (let i=0; i<64; i++) {
      const travel = ((i/64 + p*1.7)%1)*2-1;
      const lane = (i%7 - 3)*.36;
      dummy.position.set(travel*4.1, lane + Math.sin(travel*Math.PI)*.28, Math.sin(i*2.3)*.65);
      dummy.rotation.set(0, Math.PI/2, 0); dummy.updateMatrix(); packets.setMatrixAt(i, dummy.matrix);
    }
    packets.instanceMatrix.needsUpdate = true;
    const connection = THREE.MathUtils.smoothstep(p, .64, .96);
    orbitMaterial.opacity = connection*.42; nodeMaterial.opacity = connection*.9;
    orbit.visible = connection > .01; orbit.rotation.set(.1, p*.35, p*.2);
    renderer.render(scene, camera);
  }
  resize(); draw(0);
  return {
    draw,
    resize,
    canvas: renderer.domElement,
    dispose() {
      if (disposed) return; disposed = true;
      resources.forEach(resource => resource.dispose()); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
    }
  };
}
