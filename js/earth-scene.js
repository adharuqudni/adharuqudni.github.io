import * as THREE from '../static/vendor/three.module.min.js';
import { createSatelliteFactory } from './satellite-models.js';

export async function createEarth(host, onFailure) {
  const resources = [];
  const own = value => { resources.push(value); return value; };
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x08090d, 0);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D Earth with LEO and GEO satellites. Drag or use arrow keys to rotate the view.');
  canvas.setAttribute('aria-describedby', 'earth-help');
  const loader = new THREE.TextureLoader();
  let textures;
  try {
    // Wait for every request to settle so disposal also catches late completions.
    const loaded = await Promise.allSettled(['daymap', 'nightmap', 'clouds'].map(name => loader.loadAsync(`static/earth/${name}.webp`).then(own)));
    if (loaded.some(result => result.status === 'rejected')) throw new Error('Earth texture unavailable');
    textures = loaded.map(result => result.value);
  } catch (error) {
    resources.forEach(resource => resource.dispose());
    renderer.dispose();
    throw error;
  }
  textures[0].colorSpace = textures[1].colorSpace = THREE.SRGBColorSpace;
  textures.forEach(texture => { texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
  const world = new THREE.Group();
  // The whole Earth-orbit system shares one axis; GEO stays in its equatorial plane.
  world.rotation.z = .22;
  scene.add(world);
  const earthSpin = new THREE.Group();
  world.add(earthSpin);
  const sun = new THREE.Vector3(-.7, .8, 1.4).normalize();
  const material = own(new THREE.ShaderMaterial({
    uniforms: { day: { value: textures[0] }, night: { value: textures[1] }, clouds: { value: textures[2] }, sun: { value: sun } },
    vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
      void main(){vUv=uv; vNormal=normalize(mat3(modelMatrix)*normal); vec4 p=modelMatrix*vec4(position,1.); vPosition=p.xyz; gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform sampler2D day; uniform sampler2D night; uniform sampler2D clouds; uniform vec3 sun;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
      void main(){
        vec3 n=normalize(vNormal); float light=dot(n,sun); float dayAmount=smoothstep(-.14,.26,light);
        vec3 land=texture2D(day,vUv).rgb; float cloud=texture2D(clouds,vUv).r;
        vec3 surface=mix(land,vec3(.88),cloud*.78);
        vec3 color=surface*(.025+max(light,0.)*1.2);
        color+=texture2D(night,vUv).rgb*(1.-dayAmount)*.85;
        float rim=pow(1.-max(dot(n,normalize(cameraPosition-vPosition)),0.),3.8);
        color+=vec3(.18,.29,.42)*rim*dayAmount*.4;
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  const earth = new THREE.Mesh(own(new THREE.SphereGeometry(1, 64, 48)), material);
  earthSpin.add(earth);
  scene.add(new THREE.AmbientLight(0xe3e4eb, 1.3));
  const sunlight = new THREE.DirectionalLight(0xfff4de, 3);
  sunlight.position.copy(sun).multiplyScalar(8);
  scene.add(sunlight);

  const makeSatellite = createSatelliteFactory(own);
  function satellite(parent, phase, kind) {
    const group = makeSatellite(kind);
    group.scale.setScalar(kind==='geo'?.12:.105);
    parent.add(group);
    return { mesh: group, phase };
  }
  function orbit(radius, inclination, longitude, color, count, phase, speed, dashed = false) {
    const plane = new THREE.Group();
    plane.rotation.set(inclination, longitude, 0, 'YXZ');
    world.add(plane);
    const points = Array.from({ length: 257 },(_,i) => new THREE.Vector3(Math.cos(i/256*Math.PI*2)*radius,0,Math.sin(i/256*Math.PI*2)*radius));
    const lineMaterial = own(dashed ? new THREE.LineDashedMaterial({color,transparent:true,opacity:.4,dashSize:.035,gapSize:.03}) : new THREE.LineBasicMaterial({color,transparent:true,opacity:.33}));
    const line = new THREE.Line(own(new THREE.BufferGeometry().setFromPoints(points)),lineMaterial);
    line.computeLineDistances();
    plane.add(line);
    const satellites = Array.from({length:count},(_,i)=>satellite(plane,phase+i/count*Math.PI*2,dashed?'geo':'leo'));
    return { radius, satellites, speed };
  }
  const earthSpeed = Math.PI*2/720;
  const orbits = [
    orbit(1.14,.9,0,0xc9d1dc,3,.6,earthSpeed*15),
    orbit(1.2,1.4,1.3,0xc9d1dc,3,2.2,earthSpeed*14),
    orbit(1.95,0,0,0xc7b58c,3,.5,earthSpeed,true)
  ];
  let elapsed = 0, previous = 0, frame = 0, disposed = false, visible = true, paused = false;
  let yaw = .18, pitch = .35, drag = null;
  const pause = document.getElementById('earth-pause');
  const reset = document.getElementById('earth-reset');
  const signalController = new AbortController();
  const signal = signalController.signal;
  pause.setAttribute('aria-pressed','false');
  pause.textContent = 'Pause motion';
  function positionScene() {
    earthSpin.rotation.y = elapsed*earthSpeed;
    for (const orbit of orbits) for (const sat of orbit.satellites) {
      // Positive Y rotation maps +X toward -Z, matching the Earth's rotation.
      const angle = sat.phase+elapsed*orbit.speed;
      sat.mesh.position.set(Math.cos(angle)*orbit.radius,0,-Math.sin(angle)*orbit.radius);
      sat.mesh.lookAt(0,0,0);
    }
    // Fit the outer orbit at narrow aspect ratios, with a closer desktop view.
    const distance = Math.max(6.3, 2.15 / (Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect));
    camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);
    camera.lookAt(0,0,0);
    world.updateMatrixWorld(true);
  }
  function draw() { if(disposed) return; positionScene(); renderer.render(scene,camera); }
  function tick(now) {
    frame=0;
    if(disposed || paused || !visible || document.hidden) return;
    if(previous) elapsed+=Math.min((now-previous)/1000,.05);
    previous=now;
    draw();
    frame=requestAnimationFrame(tick);
  }
  function schedule() {
    cancelAnimationFrame(frame); frame=0; previous=0;
    if(!disposed && !paused && visible && !document.hidden) frame=requestAnimationFrame(tick);
  }
  function resize() {
    if(disposed) return;
    const {width,height}=host.getBoundingClientRect();
    camera.aspect=width/Math.max(height,1);
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    draw();
  }
  pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion':'Pause motion';schedule();},{signal});
  reset.addEventListener('click',()=>{yaw=.18;pitch=.35;draw();},{signal});
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse' && event.button!==0) return;
    drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);
  },{signal});
  canvas.addEventListener('pointermove',event=>{
    if(!drag) return;
    yaw-=(event.clientX-drag.x)*.006;pitch=Math.max(-.9,Math.min(.9,pitch+(event.clientY-drag.y)*.006));
    drag={x:event.clientX,y:event.clientY};draw();
  },{signal});
  for(const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,()=>{drag=null;},{signal});
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
    event.preventDefault();
    if(event.key==='ArrowLeft') yaw-=.12;
    if(event.key==='ArrowRight') yaw+=.12;
    if(event.key==='ArrowUp') pitch=Math.min(.9,pitch+.12);
    if(event.key==='ArrowDown') pitch=Math.max(-.9,pitch-.12);
    if(event.key==='Home'){yaw=.18;pitch=.35;}
    draw();
  },{signal});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onFailure();},{signal});
  document.addEventListener('visibilitychange',schedule,{signal});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();});
  const resizeObserver=new ResizeObserver(resize);
  function dispose() {
    if(disposed) return;
    disposed=true;cancelAnimationFrame(frame);signalController.abort();observer.disconnect();resizeObserver.disconnect();
    resources.forEach(resource=>resource.dispose());renderer.dispose();canvas.remove();
  }
  try {
    host.appendChild(canvas);resize();observer.observe(host);resizeObserver.observe(host);schedule();
  } catch(error) { dispose();throw error; }
  return { dispose, resize };
}
