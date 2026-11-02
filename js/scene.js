// Cảnh chính điện 3D dựng hoàn toàn bằng hình khối và texture vẽ bằng canvas (không dùng asset bên ngoài).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLOR = {
  lacquer: 0x7a1712,
  lacquerDark: 0x4a0d0a,
  gold: 0xc9a14a,
  bronze: 0x6b4a26,
  wood: 0x3b2416,
};

const BURN_SECONDS = 240;   // một nén hương cháy hết trong 4 phút
const MAX_STICKS = 12;
const HOME = { pos: new THREE.Vector3(0, 2.7, 5.2), target: new THREE.Vector3(0, 2.3, -6) };
// Màn dọc hẹp: lùi xa hơn để thấy cả mõ (trái) và chuông (phải)
const HOME_PORTRAIT = { pos: new THREE.Vector3(0, 3.3, 6.6), target: new THREE.Vector3(0, 2.4, -6) };
const home = () => (window.innerWidth / window.innerHeight < 0.8 ? HOME_PORTRAIT : HOME);

// ---------- texture vẽ bằng canvas ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 4;
  return t;
}

function speckle(g, w, h, n, alpha) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,220,180'},${Math.random() * alpha})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

const tileTex = () => canvasTex(512, 512, (g, w, h) => {
  const s = w / 2;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const l = 26 + Math.random() * 6;
    g.fillStyle = `hsl(12, 45%, ${l}%)`;
    g.fillRect(x * s, y * s, s, s);
  }
  speckle(g, w, h, 5000, 0.12);
  g.strokeStyle = 'rgba(20,8,4,0.85)';
  g.lineWidth = 6;
  for (let i = 0; i <= 2; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
  }
}, [8, 11]);

const woodTex = (hue = 20, light = 16) => canvasTex(512, 512, (g, w, h) => {
  const plank = w / 6;
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `hsl(${hue}, 45%, ${light + Math.random() * 4}%)`;
    g.fillRect(i * plank, 0, plank, h);
    for (let k = 0; k < 18; k++) {
      g.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`;
      g.lineWidth = 1 + Math.random();
      const x = i * plank + Math.random() * plank;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 6, h * 0.3, x - 6, h * 0.7, x + 2, h);
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(i * plank, 0, 3, h);
  }
}, [3, 2]);

const radialTex = (stops) => canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  stops.forEach(([o, c]) => r.addColorStop(o, c));
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
});

// Hào quang sau lưng đài sen: các vòng tia vàng
const haloTex = () => canvasTex(512, 512, (g, w) => {
  const c = w / 2;
  const r = g.createRadialGradient(c, c, 0, c, c, c);
  r.addColorStop(0, 'rgba(255,236,190,0.95)');
  r.addColorStop(0.35, 'rgba(240,190,100,0.55)');
  r.addColorStop(0.7, 'rgba(200,130,50,0.18)');
  r.addColorStop(1, 'rgba(200,130,50,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
  g.translate(c, c);
  for (let i = 0; i < 72; i++) {
    g.rotate((Math.PI * 2) / 72);
    g.fillStyle = `rgba(255,220,150,${i % 2 ? 0.10 : 0.22})`;
    g.beginPath();
    g.moveTo(0, -c * 0.18);
    g.lineTo(5, -c * 0.92);
    g.lineTo(-5, -c * 0.92);
    g.fill();
  }
});

// ---------- dựng cảnh ----------
export function createTemple(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0705);
  scene.fog = new THREE.Fog(0x0c0705, 12, 34);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
  camera.position.set(0, 2.4, 17);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 14;
  controls.minPolarAngle = 1.05;
  controls.maxPolarAngle = 1.62;
  controls.minAzimuthAngle = -0.75;
  controls.maxAzimuthAngle = 0.75;
  controls.rotateSpeed = 0.5;
  controls.enabled = false;

  // Ánh sáng
  scene.add(new THREE.HemisphereLight(0xffd9a8, 0x2a0e08, 0.55));
  const altarSpot = new THREE.SpotLight(0xffe2b0, 60, 18, 0.5, 0.6, 1.6);
  altarSpot.position.set(0, 8.5, -4);
  altarSpot.target.position.set(0, 2, -9.5);
  scene.add(altarSpot, altarSpot.target);
  const fill = new THREE.PointLight(0xff9a55, 8, 14, 1.6);
  fill.position.set(0, 3.5, 3);
  scene.add(fill);
  // Đèn phụ chiếu mõ (trái) và chuông (phải)
  for (const x of [-2.4, 2.8]) {
    const side = new THREE.PointLight(0xffb070, 5, 6, 1.6);
    side.position.set(x, 3.2, -3.6);
    scene.add(side);
  }

  const mat = {
    floor: new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.55, metalness: 0.05 }),
    wall: new THREE.MeshStandardMaterial({ map: woodTex(16, 11), roughness: 0.85 }),
    lacquer: new THREE.MeshStandardMaterial({ color: COLOR.lacquer, roughness: 0.35, metalness: 0.1 }),
    lacquerDark: new THREE.MeshStandardMaterial({ color: COLOR.lacquerDark, roughness: 0.5 }),
    gold: new THREE.MeshStandardMaterial({ color: COLOR.gold, roughness: 0.3, metalness: 0.9 }),
    bronze: new THREE.MeshStandardMaterial({ color: COLOR.bronze, roughness: 0.4, metalness: 0.85 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex(24, 18), roughness: 0.7 }),
  };

  const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,220,160,0.6)'], [1, 'rgba(255,160,60,0)']]);
  const smokeTex = radialTex([[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);

  const glow = (color, size, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    s.scale.setScalar(size);
    return s;
  };

  const box = (w, h, d, m, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    scene.add(b);
    return b;
  };

  // Sàn, tường, trần
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 22), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  box(16, 9, 0.3, mat.wall, 0, 4.5, -11);
  box(0.3, 9, 22, mat.wall, -8, 4.5, 0);
  box(0.3, 9, 22, mat.wall, 8, 4.5, 0);
  box(16, 0.3, 22, mat.lacquerDark, 0, 9, 0);
  // Tường trước có cửa lớn
  box(5.5, 9, 0.3, mat.wall, -5.25, 4.5, 11);
  box(5.5, 9, 0.3, mat.wall, 5.25, 4.5, 11);
  box(5, 3.2, 0.3, mat.wall, 0, 7.4, 11);
  box(5.4, 0.35, 0.5, mat.gold, 0, 5.8, 11);

  // Xà ngang
  for (let z = -9; z <= 9; z += 3) box(16, 0.45, 0.4, mat.lacquer, 0, 8.4, z);
  box(0.4, 0.45, 22, mat.lacquer, -4.5, 8.1, 0);
  box(0.4, 0.45, 22, mat.lacquer, 4.5, 8.1, 0);

  // Cột sơn son, chân đá, vòng vàng
  const colGeo = new THREE.CylinderGeometry(0.32, 0.36, 8.4, 24);
  const baseGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.4, 24);
  const ringGeo = new THREE.TorusGeometry(0.34, 0.04, 8, 32);
  for (const x of [-4.5, 4.5]) for (const z of [-7.5, -3.5, 0.5, 4.5, 8.5]) {
    const c = new THREE.Mesh(colGeo, mat.lacquer);
    c.position.set(x, 4.2, z);
    const b = new THREE.Mesh(baseGeo, mat.bronze);
    b.position.set(x, 0.2, z);
    scene.add(c, b);
    for (const y of [0.8, 7.6]) {
      const r = new THREE.Mesh(ringGeo, mat.gold);
      r.rotation.x = Math.PI / 2;
      r.position.set(x, y, z);
      scene.add(r);
    }
  }

  // Bàn thờ ba cấp
  box(7, 1.0, 2.6, mat.lacquer, 0, 0.5, -9.4);
  box(6, 0.9, 2.0, mat.lacquer, 0, 1.45, -9.6);
  box(4.4, 0.6, 1.5, mat.lacquer, 0, 2.2, -9.8);
  for (const [w, y, z] of [[7.1, 1.0, -8.08], [6.1, 1.9, -8.58], [4.5, 2.5, -9.03]]) box(w, 0.08, 0.06, mat.gold, 0, y, z);
  // Mành rèm vàng hai bên
  const drape = new THREE.MeshStandardMaterial({ color: 0xb8862e, roughness: 0.6, side: THREE.DoubleSide });
  for (const x of [-3.6, 3.6]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 7, 8, 1), drape);
    const p = d.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.08);
    d.geometry.computeVertexNormals();
    d.position.set(x, 5.2, -10.7);
    scene.add(d);
  }

  // Hào quang và đài sen
  const halo = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshBasicMaterial({
    map: haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.position.set(0, 5.0, -10.8);
  scene.add(halo);
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.06, 12, 96), mat.gold);
  haloRing.position.copy(halo.position);
  scene.add(haloRing);

  const lotus = new THREE.Group();
  lotus.userData.action = 'lotus';
  const petalGeo = new THREE.SphereGeometry(0.5, 20, 12);
  petalGeo.scale(0.42, 0.12, 1);
  petalGeo.translate(0, 0, 0.42);
  const layers = [
    { n: 10, tilt: 0.25, s: 1.25, color: 0xe7a3a0 },
    { n: 9, tilt: 0.65, s: 1.0, color: 0xf0b9b2 },
    { n: 7, tilt: 1.05, s: 0.75, color: 0xf8d6cc },
  ];
  layers.forEach((L, li) => {
    const m = new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.45, emissive: 0x7a3020, emissiveIntensity: 0.35 });
    for (let i = 0; i < L.n; i++) {
      const p = new THREE.Mesh(petalGeo, m);
      const holder = new THREE.Group();
      holder.rotation.y = (i / L.n) * Math.PI * 2 + li * 0.3;
      p.rotation.x = -L.tilt;
      p.scale.setScalar(L.s);
      holder.add(p);
      lotus.add(holder);
    }
  });
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.18, 24), mat.gold);
  pod.position.y = 0.12;
  lotus.add(pod);
  lotus.position.set(0, 2.62, -9.8);
  lotus.scale.setScalar(1.25);
  scene.add(lotus);

  // Viên ngọc sáng trên đài sen
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff1cf }));
  orb.position.set(0, 3.45, -9.8);
  const orbGlow = glow(0xffd28a, 2.6, 0.9);
  orbGlow.position.copy(orb.position);
  const orbLight = new THREE.PointLight(0xffd59a, 6, 8, 1.8);
  orbLight.position.copy(orb.position);
  scene.add(orb, orbGlow, orbLight);

  // Đèn dầu và lọ hoa trên bàn thờ
  const flames = [];
  const lampGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.14, 0), new THREE.Vector2(0.06, 0.12),
    new THREE.Vector2(0.05, 0.3), new THREE.Vector2(0.16, 0.38), new THREE.Vector2(0.14, 0.44), new THREE.Vector2(0, 0.42),
  ], 20);
  for (const x of [-1.7, 1.7]) {
    const l = new THREE.Mesh(lampGeo, mat.gold);
    l.position.set(x, 2.5, -9.3);
    const f = glow(0xffa040, 0.5);
    f.position.set(x, 3.05, -9.3);
    const light = new THREE.PointLight(0xff9a40, 3, 6, 2);
    light.position.copy(f.position);
    scene.add(l, f, light);
    flames.push({ sprite: f, light, seed: Math.random() * 10 });
  }
  const vaseGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.18, 0), new THREE.Vector2(0.24, 0.25),
    new THREE.Vector2(0.12, 0.6), new THREE.Vector2(0.16, 0.72), new THREE.Vector2(0, 0.7),
  ], 24);
  const vaseMat = new THREE.MeshStandardMaterial({ color: 0x1d3f6a, roughness: 0.2, metalness: 0.2 });
  const budMat = new THREE.MeshStandardMaterial({ color: 0xf2a7b5, roughness: 0.5, emissive: 0x401018 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d6b2e, roughness: 0.8 });
  for (const x of [-2.7, 2.7]) {
    const v = new THREE.Mesh(vaseGeo, vaseMat);
    v.position.set(x, 1.9, -9.0);
    scene.add(v);
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.25;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8), stemMat);
      stem.position.set(x + Math.sin(a) * 0.2, 2.95, -9.0);
      stem.rotation.z = -a;
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), budMat);
      bud.scale.y = 1.5;
      bud.position.set(x + Math.sin(a) * 0.42, 3.35, -9.0);
      scene.add(stem, bud);
    }
  }

  // Lồng đèn treo
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xb3261c, emissive: 0xff4a20, emissiveIntensity: 0.7, roughness: 0.6 });
  const lanternGeo = new THREE.SphereGeometry(0.38, 20, 14);
  lanternGeo.scale(1, 1.2, 1);
  const lanterns = [];
  for (const x of [-2.6, 2.6]) for (const z of [-5.5, -1.5, 2.5]) {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6), mat.gold);
    cord.position.y = 0.95;
    const body = new THREE.Mesh(lanternGeo, lanternMat);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12), mat.gold);
    cap.position.y = 0.48;
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 8), mat.gold);
    tassel.position.y = -0.62;
    tassel.rotation.x = Math.PI;
    const gl = glow(0xff5a30, 2.2, 0.55);
    g.add(cord, body, cap, tassel, gl);
    g.position.set(x, 6.4, z);
    scene.add(g);
    lanterns.push({ g, seed: Math.random() * 10 });
  }

  // Bàn hương và lư hương
  box(2.4, 0.9, 1.3, mat.lacquer, 0, 0.45, -5.6);
  box(2.5, 0.06, 1.4, mat.gold, 0, 0.92, -5.6);
  const burner = new THREE.Group();
  burner.userData.action = 'incense';
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.28, 0), new THREE.Vector2(0.3, 0.05), new THREE.Vector2(0.18, 0.12),
    new THREE.Vector2(0.5, 0.3), new THREE.Vector2(0.58, 0.55), new THREE.Vector2(0.62, 0.62), new THREE.Vector2(0.55, 0.62),
    new THREE.Vector2(0.52, 0.56), new THREE.Vector2(0, 0.56),
  ], 40), mat.bronze);
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.52, 32), new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1 }));
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.55;
  burner.add(bowl, ash);
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), mat.bronze);
    handle.position.set(Math.cos(a) * 0.6, 0.62, Math.sin(a) * 0.6);
    handle.rotation.y = -a;
    burner.add(handle);
  }
  burner.position.set(0, 0.95, -5.6);
  scene.add(burner);
  const ASH_Y = 0.95 + 0.55;

  // Mõ gỗ trên gối đỏ, bên trái
  const moGroup = new THREE.Group();
  moGroup.userData.action = 'mo';
  box(1.1, 0.7, 1.1, mat.lacquer, -3.0, 0.35, -5.2);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0xa31d1d, roughness: 0.9 }));
  cushion.position.y = 0.07;
  const moMat = new THREE.MeshStandardMaterial({ color: 0xb5582a, roughness: 0.4, metalness: 0.05, emissive: 0x2a0c04 });
  const moBody = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), moMat);
  moBody.scale.set(1, 0.78, 0.9);
  moBody.position.y = 0.42;
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.3), new THREE.MeshBasicMaterial({ color: 0x120604 }));
  slit.position.set(0, 0.42, 0.28);
  moGroup.add(cushion, moBody, slit);
  const mallet = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.6), mat.wood);
  stick.rotation.z = Math.PI / 2;
  stick.position.x = 0.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), moMat);
  mallet.add(stick, head);
  mallet.position.set(0.2, 0.95, 0.15);
  mallet.rotation.z = 0.5;
  moGroup.add(mallet);
  moGroup.position.set(-3.0, 0.7, -5.2);
  scene.add(moGroup);

  // Chuông treo trên giá gỗ, bên phải
  const bellGroup = new THREE.Group();
  bellGroup.userData.action = 'bell';
  for (const x of [-0.75, 0.75]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), mat.lacquer);
    post.position.set(x, 1.6, 0);
    bellGroup.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.18), mat.lacquer);
  bar.position.y = 3.2;
  bellGroup.add(bar);
  const bellPivot = new THREE.Group();
  bellPivot.position.y = 3.1;
  const bellBody = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.02), new THREE.Vector2(0.12, -0.04), new THREE.Vector2(0.3, -0.18),
    new THREE.Vector2(0.38, -0.6), new THREE.Vector2(0.44, -1.05), new THREE.Vector2(0.5, -1.15), new THREE.Vector2(0.46, -1.17),
  ], 40), new THREE.MeshStandardMaterial({ color: 0xa07a3e, roughness: 0.3, metalness: 0.75, emissive: 0x2a1606, side: THREE.DoubleSide }));
  bellPivot.add(bellBody);
  for (const y of [-0.45, -0.9]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(y < -0.6 ? 0.43 : 0.37, 0.018, 8, 40), mat.gold);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    bellPivot.add(band);
  }
  bellGroup.add(bellPivot);
  bellGroup.position.set(3.4, 0, -5.4);
  bellGroup.rotation.y = -0.5;
  scene.add(bellGroup);

  // ---------- khói hương (particle) ----------
  const SMOKE_N = 700;
  const smokeGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(SMOKE_N * 3);
  const sAlpha = new Float32Array(SMOKE_N);
  const sSize = new Float32Array(SMOKE_N);
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  smokeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1));
  smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: smokeTex }, uScale: { value: 600 }, uColor: { value: new THREE.Color(0xd8d2c8) } },
    vertexShader: `
      attribute float aAlpha; attribute float aSize; varying float vAlpha; uniform float uScale;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform vec3 uColor; varying float vAlpha;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(uColor, t.a * vAlpha);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  scene.add(smoke);
  const parts = Array.from({ length: SMOKE_N }, () => ({ life: 0, max: 0, x: 0, y: -99, z: 0, seed: 0, size: 0 }));
  let partCursor = 0;
  function emitSmoke(x, y, z) {
    const p = parts[partCursor];
    partCursor = (partCursor + 1) % SMOKE_N;
    Object.assign(p, { life: 0, max: 5 + Math.random() * 3, x, y, z, seed: Math.random() * 100, size: 0.05 });
  }

  // Bụi lấp lánh trong ánh sáng
  const DUST_N = 260;
  const dustGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DUST_N * 3);
  const dBase = [];
  for (let i = 0; i < DUST_N; i++) {
    const b = [(Math.random() - 0.5) * 12, Math.random() * 7.5 + 0.3, (Math.random() - 0.5) * 18 - 2];
    dBase.push(b);
    dPos.set(b, i * 3);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: glowTex, color: 0xffcf8a, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  // ---------- hương ----------
  const sticks = [];
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x7a2a18, roughness: 0.8 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.7 });
  const rodGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  rodGeo.translate(0, 0.5, 0);
  const handleGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.25, 6);
  handleGeo.translate(0, 0.125, 0);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xff6a20 });
  const tipGeo = new THREE.SphereGeometry(0.018, 8, 6);

  function addStick(i, count) {
    const g = new THREE.Group();
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const r = count === 1 ? 0 : 0.09 + Math.random() * 0.05;
    g.position.set(Math.cos(a) * r + (Math.random() - 0.5) * 0.25, ASH_Y, -5.6 + Math.sin(a) * r + (Math.random() - 0.5) * 0.2);
    g.rotation.set((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    const rod = new THREE.Mesh(rodGeo, stickMat);
    rod.position.y = 0.25;
    const len = 0.85;
    rod.scale.y = 0.001;
    const tip = new THREE.Mesh(tipGeo, tipMat);
    const tipGlow = glow(0xff7a30, 0.32);
    g.add(handle, rod, tip, tipGlow);
    scene.add(g);
    const st = { g, rod, tip, tipGlow, len, born: clock.elapsedTime, emitAcc: 0 };
    sticks.push(st);
    while (sticks.length > MAX_STICKS) removeStick(sticks[0]);
  }
  function removeStick(st) {
    scene.remove(st.g);
    sticks.splice(sticks.indexOf(st), 1);
  }

  // ---------- hoạt cảnh ----------
  const clock = new THREE.Clock();
  let bellSwing = { t0: -99, amp: 0 };
  let malletT0 = -99;
  let tween = null;

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function flyTo(pos, target, dur = 2) {
    tween = {
      t0: clock.elapsedTime, dur,
      p0: camera.position.clone(), p1: pos.clone(),
      q0: controls.target.clone(), q1: target.clone(),
    };
    controls.enabled = false;
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Màn dọc (điện thoại): mở rộng góc nhìn để thấy cả bàn thờ
    camera.fov = camera.aspect < 0.8 ? 72 : camera.aspect < 1.2 ? 58 : 50;
    camera.updateProjectionMatrix();
    smokeMat.uniforms.uScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }
  window.addEventListener('resize', resize);
  resize();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (tween) {
      const k = Math.min((t - tween.t0) / tween.dur, 1);
      const e = easeInOut(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.q0, tween.q1, e);
      if (k >= 1) { tween = null; controls.enabled = true; }
    }
    controls.update();

    // Lửa đèn lung linh
    for (const f of flames) {
      const fl = 0.85 + Math.sin(t * 13 + f.seed) * 0.06 + Math.sin(t * 7.3 + f.seed * 2) * 0.08;
      f.sprite.scale.setScalar(0.5 * fl);
      f.light.intensity = 3 * fl;
    }
    for (const l of lanterns) l.g.rotation.z = Math.sin(t * 0.6 + l.seed) * 0.03;
    orbGlow.material.opacity = 0.8 + Math.sin(t * 0.8) * 0.12;
    halo.rotation.z = t * 0.02;

    // Chuông đung đưa
    const bt = t - bellSwing.t0;
    bellPivot.rotation.x = bt < 8 ? bellSwing.amp * Math.sin(bt * 4.2) * Math.exp(-bt * 0.7) : 0;

    // Dùi mõ gõ xuống
    const mt = t - malletT0;
    mallet.rotation.z = 0.5 - (mt < 0.25 ? Math.sin((mt / 0.25) * Math.PI) * 0.55 : 0);

    // Hương cháy dần, toả khói
    for (const st of [...sticks]) {
      const age = t - st.born;
      const grow = Math.min(age / 0.6, 1);
      const remain = Math.max(1 - age / BURN_SECONDS, 0);
      const L = st.len * grow * (0.15 + 0.85 * remain);
      st.rod.scale.y = Math.max(L, 0.001);
      st.tip.position.y = 0.25 + L;
      st.tipGlow.position.y = 0.25 + L;
      st.tipGlow.material.opacity = 0.7 + Math.sin(t * 5 + st.born) * 0.3;
      if (remain <= 0) { removeStick(st); continue; }
      st.emitAcc += dt * 7;
      while (st.emitAcc > 1) {
        st.emitAcc -= 1;
        const wp = new THREE.Vector3();
        st.tip.getWorldPosition(wp);
        emitSmoke(wp.x, wp.y + 0.02, wp.z);
      }
    }
    for (let i = 0; i < SMOKE_N; i++) {
      const p = parts[i];
      if (p.life >= p.max) { sAlpha[i] = 0; continue; }
      p.life += dt;
      const k = p.life / p.max;
      p.y += dt * (0.28 + k * 0.1);
      p.x += Math.sin(p.life * 1.4 + p.seed) * dt * (0.05 + k * 0.25);
      p.z += Math.cos(p.life * 1.1 + p.seed) * dt * (0.03 + k * 0.15);
      sPos[i * 3] = p.x; sPos[i * 3 + 1] = p.y; sPos[i * 3 + 2] = p.z;
      sSize[i] = 0.05 + k * 0.7;
      sAlpha[i] = Math.sin(Math.PI * k) * 0.4 * (1 - k * 0.5);
    }
    smokeGeo.attributes.position.needsUpdate = true;
    smokeGeo.attributes.aAlpha.needsUpdate = true;
    smokeGeo.attributes.aSize.needsUpdate = true;

    for (let i = 0; i < DUST_N; i++) {
      const b = dBase[i];
      dPos[i * 3] = b[0] + Math.sin(t * 0.15 + i) * 0.3;
      dPos[i * 3 + 1] = b[1] + Math.sin(t * 0.1 + i * 1.7) * 0.4;
      dPos[i * 3 + 2] = b[2] + Math.cos(t * 0.12 + i) * 0.3;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- chạm vào vật thể ----------
  const ray = new THREE.Raycaster();
  const pickables = [lotus, burner, moGroup, bellGroup];
  let down = null;
  let pickCb = () => {};
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    const v = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(v, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    if (!hit) return;
    let o = hit.object;
    while (o && !o.userData.action) o = o.parent;
    if (o) pickCb(o.userData.action);
  });

  const anchors = {
    mo: new THREE.Vector3(-3.0, 2.0, -5.2),
    bell: new THREE.Vector3(3.4, 3.6, -5.4),
    incense: new THREE.Vector3(0, 2.4, -5.6),
    lotus: new THREE.Vector3(0, 4.2, -9.8),
  };

  return {
    onPick(cb) { pickCb = cb; },
    intro(dur = 4.5) { flyTo(home().pos, home().target, dur); },
    home() { flyTo(home().pos, home().target, 1.8); },
    focusIncense() { flyTo(new THREE.Vector3(0, 2.3, -2.4), new THREE.Vector3(0, 1.7, -5.6), 1.6); },
    lightIncense(n) { for (let i = 0; i < n; i++) addStick(i, n); },
    strikeMo() { malletT0 = clock.elapsedTime; },
    ringBell() { bellSwing = { t0: clock.elapsedTime, amp: 0.14 }; },
    // Toạ độ màn hình của một vật, để đặt chữ "+1" hay lời nguyện bay lên
    screenOf(name) {
      const p = anchors[name].clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight };
    },
    // Chụp khung hình hiện tại (render lại rồi đọc ngay để không cần preserveDrawingBuffer)
    capture() {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/jpeg', 0.92);
    },
  };
}
