import * as THREE from '../static/vendor/three.module.min.js';

// Generic spacecraft, not replicas of a specific mission. Geometry is merged by
// material so detailed construction costs only a handful of draw calls per craft.
export function createSatelliteFactory(own) {
  function texture(draw) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    draw(canvas.getContext('2d'));
    const map = own(new THREE.CanvasTexture(canvas));
    map.anisotropy = 4;
    return map;
  }
  const cells = texture(ctx => {
    ctx.fillStyle = '#1d2633'; ctx.fillRect(0,0,256,256);
    for(let row=0;row<12;row++) for(let col=0;col<6;col++) {
      const x=col*42+3,y=row*21+2;
      ctx.fillStyle=['#172c4a','#203956','#243d5a'][(row+col)%3];
      ctx.fillRect(x,y,38,18);
      ctx.strokeStyle='#8c98a5';ctx.lineWidth=.6;
      ctx.strokeRect(x,y,38,18);
      ctx.fillStyle='#657a91';ctx.fillRect(x+12,y,.7,18);ctx.fillRect(x+25,y,.7,18);
    }
  });
  cells.colorSpace=THREE.SRGBColorSpace;
  const foil = texture(ctx => {
    ctx.fillStyle='#888';ctx.fillRect(0,0,256,256);
    let seed=39;
    const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    for(let i=0;i<450;i++) {
      const x=random()*256,y=random()*256;
      ctx.strokeStyle=`rgba(${i%2?'240,240,240':'30,30,30'},.3)`;
      ctx.lineWidth=.5+random()*1.5;ctx.beginPath();ctx.moveTo(x,y);
      ctx.lineTo(x+random()*24-12,y+random()*32-16);ctx.stroke();
    }
  });
  const materials = {
    gold: own(new THREE.MeshStandardMaterial({color:0xb89445,metalness:.65,roughness:.42,bumpMap:foil,bumpScale:.018})),
    frame: own(new THREE.MeshStandardMaterial({color:0xa6aab0,metalness:.65,roughness:.38})),
    white: own(new THREE.MeshStandardMaterial({color:0xe1dfd5,metalness:.12,roughness:.65})),
    cells: own(new THREE.MeshStandardMaterial({map:cells,metalness:.4,roughness:.32})),
    dark: own(new THREE.MeshStandardMaterial({color:0x151922,metalness:.25,roughness:.55})),
    dish: own(new THREE.MeshStandardMaterial({color:0xd1ccba,metalness:.45,roughness:.47,side:THREE.DoubleSide}))
  };
  function build(kind) {
    const parts=[];
    function add(geometry,key,position=[0,0,0],rotation=[0,0,0]) {
      const mesh=new THREE.Mesh(geometry,materials[key]);
      mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.updateMatrix();parts.push({mesh,key});return mesh;
    }
    const box=(size,key,p,rot)=>add(new THREE.BoxGeometry(...size),key,p,rot);
    function rod(a,b,r=.008,key='frame') {
      const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
      const mesh=add(new THREE.CylinderGeometry(r,r,start.distanceTo(end),6),key);
      mesh.position.copy(start).add(end).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());mesh.updateMatrix();
    }
    function dish(x,y,z,radius) {
      const profile=Array.from({length:13},(_,i)=>{
        const r=radius*i/12;return new THREE.Vector2(r,r*r/(radius*2.5));
      });
      add(new THREE.LatheGeometry(profile,24),'dish',[x,y,z],[Math.PI/2,0,0]);
      const rim=radius/2.5;
      add(new THREE.TorusGeometry(radius,.007,5,24),'frame',[x,y,z+rim]);
      for(let i=0;i<3;i++) {
        const a=i*Math.PI*2/3;
        rod([x+Math.cos(a)*radius*.9,y+Math.sin(a)*radius*.9,z+rim],[x,y,z+radius*.85],.005);
      }
      add(new THREE.CylinderGeometry(.018,.026,.06,10),'gold',[x,y,z+radius*.85],[Math.PI/2,0,0]);
    }
    const geo=kind==='geo';
    const width=geo?.52:.38,height=geo?.66:.42,depth=geo?.48:.38;
    box([width,height,depth],'gold');
    // Top/bottom decks, corner rails, and white thermal radiator strips.
    for(const s of [-1,1]) {
      box([width+.025,.025,depth+.025],'frame',[0,s*height/2,0]);
      box([.025,height*.78,depth*.78],'white',[s*(width/2+.015),0,0]);
      for(const t of [-1,1]) rod([s*width/2,-height/2,t*depth/2],[s*width/2,height/2,t*depth/2],.012);
    }
    const count=geo?3:2,panelWidth=geo?.52:.44,panelHeight=geo?.58:.4;
    for(const side of [-1,1]) {
      const start=width/2+.22;
      rod([side*width/2,0,0],[side*(start+.05),0,0],.018);
      add(new THREE.CylinderGeometry(.042,.042,.05,12),'dark',[side*(width/2+.06),0,0],[0,0,Math.PI/2]);
      for(let i=0;i<count;i++) {
        const x=side*(start+panelWidth/2+i*(panelWidth+.025));
        box([panelWidth,panelHeight,.022],'frame',[x,0,0]);
        // Backing and cell faces are distinct; no blue block sidewalls.
        box([panelWidth-.018,panelHeight-.018,.002],'cells',[x,0,.012]);
        box([panelWidth-.018,panelHeight-.018,.002],'dark',[x,0,-.012]);
        if(i<count-1) for(const y of [-panelHeight*.33,panelHeight*.33])
          rod([x+side*panelWidth/2,y,0],[x+side*(panelWidth/2+.025),y,0],.009);
      }
    }
    if(geo) {
      // Dual communications reflectors, with struts and feed horns on the Earth-facing deck.
      dish(-.33,.21,depth/2+.025,.24);
      dish(.32,-.16,depth/2+.025,.2);
      rod([-.2,.15,depth/2],[-.33,.21,depth/2+.06],.014);
      rod([.2,-.1,depth/2],[.32,-.16,depth/2+.06],.014);
      // Apogee engine bell on the anti-Earth side.
      add(new THREE.CylinderGeometry(.07,.13,.16,12,1,true),'dark',[0,0,-depth/2-.08],[Math.PI/2,0,0]);
    } else {
      // Nadir-facing optical instrument and a smaller communications dish.
      add(new THREE.CylinderGeometry(.105,.12,.15,16),'white',[0,-.07,depth/2+.075],[Math.PI/2,0,0]);
      add(new THREE.CylinderGeometry(.081,.081,.006,16),'dark',[0,-.07,depth/2+.152],[Math.PI/2,0,0]);
      dish(.15,.14,depth/2,.1);
    }
    rod([0,height/2,0],[0,height/2+.26,.025],.006);
    add(new THREE.SphereGeometry(.018,8,6),'white',[0,height/2+.26,.025]);
    for(const x of [-width*.35,width*.35]) {
      add(new THREE.CylinderGeometry(.013,.03,.04,8,1,true),'dark',[x,-height/2-.02,-depth*.3]);
    }
    const model=new THREE.Group();
    for(const [key,material] of Object.entries(materials)) {
      const selected=parts.filter(part=>part.key===key);
      if(!selected.length)continue;
      const attributes={position:[],normal:[],uv:[]};
      for(const {mesh} of selected) {
        const geometry=mesh.geometry.toNonIndexed();geometry.applyMatrix4(mesh.matrix);
        for(const name of Object.keys(attributes)) attributes[name].push(...geometry.getAttribute(name).array);
        geometry.dispose();mesh.geometry.dispose();
      }
      const geometry=own(new THREE.BufferGeometry());
      for(const [name,values] of Object.entries(attributes))geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,name==='uv'?2:3));
      geometry.computeBoundingSphere();model.add(new THREE.Mesh(geometry,material));
    }
    return model;
  }
  const templates={leo:build('leo'),geo:build('geo')};
  return kind=>templates[kind].clone(true);
}
