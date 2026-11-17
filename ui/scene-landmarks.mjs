import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BoxGeometry, CanvasTexture, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, SphereGeometry, TorusGeometry } from 'three';

export function sceneSign(label, width = 2.7, color = '#274a7b') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, 640, 128);
  context.strokeStyle = '#edf6ff';
  context.lineWidth = 8;
  context.strokeRect(6, 6, 628, 116);
  context.fillStyle = '#fff';
  context.font = 'bold 65px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 320, 66, 550);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return new Mesh(new PlaneGeometry(width, width / 5), new MeshBasicMaterial({ map: texture, toneMapped: false }));
}

function signAt(scene, text, x, y, z, width, color) {
  const sign = sceneSign(text, width, color);
  sign.position.set(x, y, z);
  scene.add(sign);
}

function rounded(mesh, width, height, depth, radius, color, x, y, z) {
  return mesh(new RoundedBoxGeometry(width, height, depth, 2, radius), color, x, y, z);
}

function windowPane(mesh, width, height, x, y, z) {
  const pane = rounded(mesh, width, height, .085, .035, 0x23638f, x, y, z);
  pane.material.roughness = .29;
  pane.material.metalness = .15;
  return pane;
}

function cargoAircraft(mesh, x, z, yaw) {
  const airframe = new Group();
  airframe.position.set(x, 0, z);
  airframe.rotation.y = yaw;
  const ivory = 0xfcf9ed;
  const coral = 0xe56d61;
  const dark = 0x384c64;
  const hull = mesh(new SphereGeometry(.57, 20, 12), ivory, 0, .76, 0);
  hull.scale.set(1, .88, 2.75);
  airframe.add(hull, rounded(mesh, 2.8, .17, .65, .085, coral, 0, .62, -.28));
  const cockpit = mesh(new SphereGeometry(.37, 16, 10), 0x267cac, 0, .96, .80);
  cockpit.scale.set(1, .55, 1.05);
  cockpit.material.roughness = .27;
  airframe.add(cockpit, rounded(mesh, .15, .72, .63, .065, coral, 0, 1.11, -1.15),
    rounded(mesh, 1.34, .13, .51, .055, coral, 0, .89, -1.07));
  for (const side of [-1, 1]) {
    const engine = mesh(new SphereGeometry(.22, 14, 10), 0x679bbf, side * .98, .52, -.04);
    engine.scale.set(.9, .84, 1.85);
    const wheel = mesh(new CylinderGeometry(.19, .19, .13, 12), dark, side * .37, .20, -.25);
    wheel.rotation.z = Math.PI / 2;
    airframe.add(engine, wheel, mesh(new BoxGeometry(.062, .28, .067), 0x8399ac, side * .37, .33, -.25));
  }
  return airframe;
}

export function addAirfield(scene, mesh, task) {
  const blue = 0x2e79c9;
  const white = 0xf3fbff;
  const yellow = 0xffc753;
  scene.add(rounded(mesh, 3.3, 3.55, 2.3, .17, white, -5.5, 1.77, -7.4));
  scene.add(rounded(mesh, 3.65, .24, 2.62, .11, 0xafc6df, -5.5, .12, -7.4));
  scene.add(windowPane(mesh, .85, 1.29, -5.5, .91, -6.22));
  for (const x of [-6.44, -4.56]) scene.add(windowPane(mesh, .53, .69, x, 1.36, -6.22));
  scene.add(mesh(new CylinderGeometry(1.66, 1.35, .8, 8), blue, -5.5, 3.75, -7.4));
  scene.add(mesh(new CylinderGeometry(1.78, 1.78, .19, 8), yellow, -5.5, 4.23, -7.4));
  scene.add(mesh(new CylinderGeometry(.052, .052, .55, 8), blue, -5.5, 4.53, -7.4));
  scene.add(mesh(new SphereGeometry(.13, 12, 8), 0xee6356, -5.5, 4.84, -7.4));
  signAt(scene, '世界机场 · 塔台', -5.5, 2.54, -6.22, 2.88);
  scene.add(mesh(new BoxGeometry(4.15, 2.15, 3.1), white, 6, 1.07, -13.1));
  scene.add(mesh(new BoxGeometry(4.25, .29, 3.25), yellow, 6, 2.22, -13.1));
  scene.add(mesh(new BoxGeometry(2.7, 1.45, .1), blue, 6, .75, -11.51));
  for (const offset of [-.9, 0, .9]) scene.add(mesh(new BoxGeometry(.035, 1.4, .04), white, 6 + offset, .75, -11.44));
  signAt(scene, '机库', 6, 1.88, -11.47, 1.95);
  scene.add(cargoAircraft(mesh, 5.9, -8.8, -.68));
  scene.add(rounded(mesh, 4.7, .07, 6.7, .03, 0xa2b3c7, 5.62, .01, -9.3));
  for (const offset of [-1, 1]) scene.add(rounded(mesh, .30, .045, 5.10, .02, 0xffdb84, 5.63 + offset * 2.10, .06, -9.02));
  scene.add(rounded(mesh, .11, .045, 3.2, .02, 0xffdb84, 4.6, .06, -8.82));
  for (const side of [-1, 1]) {
    for (let step = 0; step < 12; step++) {
      scene.add(mesh(new SphereGeometry(.075, 8, 6), 0x78c6ff, side * 2.93, .12, -step * 2.2));
    }
  }
  if (task === 'kites') {
    for (const [index, [x, y, z]] of [[-4.7, 3.3, -26], [4.3, 4.6, -32], [-4.4, 4.3, -40]].entries()) {
      const kite = mesh(new BoxGeometry(.85, .85, .08), [0xfe7285, 0xffba4a, 0x5ed5ba][index], x, y, z);
      kite.rotation.z = Math.PI / 4;
      scene.add(kite);
      scene.add(mesh(new BoxGeometry(.026, 1.45, .028), white, x, y - 1.13, z));
      scene.add(mesh(new BoxGeometry(.21, .12, .035), blue, x, y - 1.52, z));
    }
    signAt(scene, '山脚村庄 · 风筝节', 4.45, 1.27, -34, 2.5);
  } else if (task === 'treehouse') {
    scene.add(mesh(new CylinderGeometry(.33, .44, 4.6, 10), 0x866246, -4.4, 2.3, -29));
    scene.add(mesh(new SphereGeometry(1.45, 16, 12), 0x6dbb7e, -4.4, 4.6, -29));
    scene.add(mesh(new BoxGeometry(1.95, 1.46, 1.6), 0xe3ae6b, -4.3, 2.63, -27.9));
    scene.add(mesh(new BoxGeometry(2.24, .26, 1.95), 0x995851, -4.3, 3.46, -27.9));
    scene.add(mesh(new BoxGeometry(.46, .65, .04), blue, -4.3, 2.63, -27.08));
    signAt(scene, '丹尼尔的树屋', -4.3, 1.55, -27, 2.3);
  } else if (task === 'foal') {
    for (const x of [-5.1, 5.1]) {
      for (let offset = 0; offset < 5; offset++) {
        scene.add(mesh(new BoxGeometry(.13, .83, .13), 0xe2b680, x, .41, -27 - offset * 1.55));
      }
      for (const y of [.32, .63]) scene.add(mesh(new BoxGeometry(.1, .12, 6.3), 0xe2b680, x, y, -30.1));
    }
    signAt(scene, '巴塔哥尼亚牧场', 4.2, 1.33, -26, 2.55);
  }
}

function riverSurface(mesh) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#94e5de');
  gradient.addColorStop(.3, '#52bed1');
  gradient.addColorStop(.65, '#2d98bb');
  gradient.addColorStop(1, '#67cbd3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < 38; row++) {
    const x = 12 + (row * 113) % 345;
    const y = 10 + row * 13.1;
    ctx.strokeStyle = row % 3 ? '#d6ffff35' : '#e8ffff72';
    ctx.lineWidth = 1.3 + row % 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 16, y + 6, x + 40 + row % 28, y + 3);
    ctx.stroke();
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const water = mesh(new PlaneGeometry(8.5, 14), 0xffffff, 8.1, .023, -30);
  water.rotation.x = -Math.PI / 2;
  water.material.map = map;
  water.material.roughness = .34;
  water.material.metalness = .06;
  return water;
}

export function addRescueBase(scene, mesh, task) {
  const blue = 0x2594b7;
  const white = 0xe8f5ff;
  const cyan = 0x64edfa;
  const orange = 0xffb459;
  scene.add(mesh(new CylinderGeometry(2.6, 2.8, .4, 24), blue, -5.9, .18, -10.0));
  scene.add(mesh(new SphereGeometry(2.14, 24, 15, 0, Math.PI * 2, 0, Math.PI / 2), white, -5.9, .41, -10.0));
  scene.add(mesh(new SphereGeometry(1.91, 24, 13, 0, Math.PI * 2, 0, Math.PI / 2), blue, -5.9, .79, -9.95));
  const ring = mesh(new TorusGeometry(2.1, .11, 9, 28), orange, -5.9, 1.21, -9.95);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  signAt(scene, '地球救援基地', -5.78, 1.55, -7.85, 2.5);
  scene.add(rounded(mesh, 2.65, .92, 1.27, .16, orange, 5.25, .70, -13.4));
  scene.add(rounded(mesh, 1.55, .68, 1.23, .15, white, 5.01, 1.38, -13.4));
  scene.add(windowPane(mesh, .54, .32, 4.69, 1.49, -12.77),
    windowPane(mesh, .46, .32, 5.34, 1.49, -12.77),
    rounded(mesh, .77, .09, .31, .045, 0x2fa9d5, 5.01, 1.755, -13.36),
    rounded(mesh, .92, .13, .16, .033, 0xffefb1, 5.78, .88, -12.744));
  for (const x of [-6.89, -6.23, -5.56, -4.89]) {
    scene.add(windowPane(mesh, .50, .38, x, 1.03, -8.08));
  }
  for (const dx of [-.83, .83]) {
    const wheel = mesh(new CylinderGeometry(.36, .36, .20, 14), 0x374261, 5.25 + dx, .36, -12.67);
    wheel.rotation.x = Math.PI / 2;
    const hub = mesh(new CylinderGeometry(.17, .17, .025, 12), 0xb5cad8, 5.25 + dx, .36, -12.556);
    hub.rotation.x = Math.PI / 2;
    scene.add(wheel, hub);
  }
  signAt(scene, '护卫队救援车', 5.25, 2.19, -12.58, 2.45);
  if (task === 'lost-signal') {
    scene.add(mesh(new CylinderGeometry(.44, .64, 3.64, 10), white, -4.55, 1.82, -28));
    scene.add(mesh(new CylinderGeometry(.58, .58, .38, 12), blue, -4.55, 3.72, -28));
    scene.add(mesh(new SphereGeometry(.19, 12, 8), cyan, -4.55, 4.03, -28));
    signAt(scene, '河湾通讯塔', -4.55, 1.32, -27.31, 2.36);
  } else {
    scene.add(riverSurface(mesh));
    for (const [i, x] of [4.0, 4.35, 4.18, 4.48].entries()) {
      const stone = mesh(new SphereGeometry(.24 + i * .03, 11, 8), 0xa6bac1, x, .12, -26.2 - i * 2.2);
      stone.scale.set(1.38, .59, .91);
      scene.add(stone);
    }
    scene.add(mesh(new BoxGeometry(1.72, .89, .68), white, -4.35, .82, -27));
    scene.add(mesh(new BoxGeometry(1.29, .48, .05), cyan, -4.35, .88, -26.646));
    signAt(scene, task === 'lake-lab' ? '湖边监测站' : '河湾补给站', -4.35, 1.55, -26.59, 2.2);
  }
}
