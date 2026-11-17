import {
  BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial,
  PerspectiveCamera, Scene, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, WebGLRenderer,
} from 'three';
import { addDaylight, contactShadow, terrainTile } from './scene-lighting.mjs';
import { sceneSign } from './scene-landmarks.mjs';
import { closestSuspect, suspectLocations, walkTown } from './detective-route.mjs';

const looks = {
  squirrel: { fur: 0xcf8357, shirt: 0xb84b80, ears: 'round', tail: true },
  rabbit: { fur: 0xffe8e4, shirt: 0x7f68c9, ears: 'long' },
  deer: { fur: 0xc89162, shirt: 0x6babe4, ears: 'antlers' },
  bear: { fur: 0xae785d, shirt: 0x4bae83, ears: 'round' },
  dog: { fur: 0xd5af75, shirt: 0x6e92df, ears: 'floppy' },
  duck: { fur: 0xffdf76, shirt: 0xd37fa2, ears: 'none', beak: true },
  cat: { fur: 0xedb482, shirt: 0x7e61bf, ears: 'triangle' },
  hedgehog: { fur: 0xdeb18e, shirt: 0xf19b48, ears: 'round', spines: true },
  sheep: { fur: 0xfff3df, shirt: 0x66a49b, ears: 'floppy', wool: true },
};

function shape(geometry, color, x, y, z, scale) {
  const object = new Mesh(geometry, new MeshStandardMaterial({ color, roughness: .78 }));
  object.position.set(x, y, z);
  if (scale) object.scale.set(...scale);
  return object;
}

const ball = (color, x, y, z, scale) => shape(new SphereGeometry(1, 24, 16), color, x, y, z, scale);
const box = (color, x, y, z, size) => shape(new BoxGeometry(...size), color, x, y, z);

function nameTag(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 94;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7ffeb';
  ctx.fillRect(0, 0, 420, 94);
  ctx.strokeStyle = '#50876d';
  ctx.lineWidth = 7;
  ctx.strokeRect(3.5, 3.5, 413, 87);
  ctx.font = 'bold 47px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#25384b';
  ctx.fillText(name, 210, 49, 384);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, toneMapped: false }));
  sprite.scale.set(1.75, .39, 1);
  sprite.position.y = 2.52;
  return sprite;
}

function animal(species, name, index) {
  const look = looks[species];
  const { fur, shirt, ears } = look;
  const group = new Group();
  group.userData.suspect = index;
  const eyes = [];
  group.add(ball(shirt, 0, .78, 0, [.42, .54, .28]));
  group.add(ball(0xfff6de, .13, .92, .257, [.087, .088, .028]));
  group.add(ball(fur, 0, 1.58, 0, [.54, .48, .44]));
  group.add(ball(look.beak ? 0xf79d44 : 0xffedcf, 0, 1.43, .40, [.24, .12, .12]));
  if (!look.beak) group.add(ball(0x614740, 0, 1.46, .51, [.07, .047, .034]));
  for (const side of [-1, 1]) {
    const eye = new Group();
    eye.position.set(side * .17, 1.64, .402);
    const iris = ball(0x272343, 0, 0, 0, [.064, .086, .052]);
    iris.material.roughness = .24;
    eye.add(iris, ball(0xffffff, -.012, .034, .045, [.018, .023, .014]));
    group.add(eye);
    const brow = ball(0x6d4c46, side * .19, 1.77, .358, [.091, .019, .032]);
    brow.rotation.z = side * -.14;
    group.add(brow);
    group.add(ball(fur, side * .40, .74, .04, [.15, .28, .14]));
    group.add(ball(shirt, side * .37, .91, .032, [.135, .113, .151]));
    group.add(ball(0x654c6b, side * .19, .17, .105, [.18, .17, .26]));
    eyes.push(eye);
    if (ears === 'triangle' || ears === 'antlers') {
      group.add(shape(new ConeGeometry(.23, ears === 'antlers' ? .47 : .38, 4), fur, side * .29, 1.98, .01));
      if (ears === 'antlers') {
        const branch = box(0x765447, side * .3, 2.07, -.12, [.08, .53, .09]);
        branch.rotation.z = side * -.28;
        group.add(branch);
      }
    } else if (ears !== 'none') {
      const scale = ears === 'long' ? [.16, .37, .11] : ears === 'floppy' ? [.22, .23, .18] : [.19, .19, .12];
      const ear = ball(fur, side * (ears === 'floppy' ? .47 : .31), ears === 'long' ? 2.09 : 1.95, .02, scale);
      ear.rotation.z = side * -.30;
      group.add(ear);
      if (ears === 'long') group.add(ball(0xf4abc5, side * .36, 2.11, .11, [.078, .25, .04]));
    }
  }
  if (look.tail) group.add(ball(0xb56b49, -.51, .89, -.25, [.29, .58, .24]));
  if (look.spines || look.wool) {
    for (let step = 0; step < 7; step++) {
      const angle = (step / 6) * Math.PI;
      group.add(ball(look.wool ? 0xffffff : 0x875c50, Math.cos(angle) * .43, 1.61 + Math.sin(angle) * .37, -.17, [.22, .22, .23]));
    }
  }
  const mouth = ball(look.beak ? 0xc76c35 : 0x785049, 0, 1.396, .507, [.079, .020, .021]);
  group.add(mouth, nameTag(name));
  return { group, pose(now, nearby) {
    const blink = (now + index * 1231) % 4210;
    for (const eye of eyes) eye.scale.y = blink > 4090 ? .14 : 1;
    mouth.scale.y = .020 + (nearby ? Math.max(0, Math.sin(now * .011)) * .021 : 0);
  } };
}

function decorate(scene, dossier) {
  const sign = (label, x, y, z, width, color) => {
    const board = sceneSign(label, width, color);
    board.position.set(x, y, z);
    scene.add(board);
  };
  const lawn = box(0x88bd8a, 0, -.19, -8, [38, .35, 44]);
  const path = box(0xf7dbaf, 0, -.015, -8.8, [3.5, .08, 23]);
  lawn.material.map = terrainTile(9, 11, .34);
  path.material.map = terrainTile(2, 10, .24);
  scene.add(lawn, path);
  suspectLocations.forEach(({ x, z }, index) => {
    scene.add(box(0xe9d6ee, x, .021, z, [2.1, .055, 2.2]));
    const side = Math.sign(x);
    scene.add(box([0xf0a6ad, 0xb0a3e1, 0xf6c789][index], side * 6.9, 1.2, z - .8, [2.35, 2.4, 2.4]));
    const roof = shape(new ConeGeometry(1.86, .96, 4), 0x8865a5, side * 6.9, 2.82, z - .8);
    roof.rotation.y = Math.PI / 4;
    scene.add(roof, box(0xdff7fc, side * 6.9, 1.32, z + .41, [.87, .83, .03]));
  });
  scene.add(box(0xe6f0ff, 0, 1.6, -20.9, [6.15, 3.2, 2.4]));
  scene.add(box(0x3974bc, 0, 3.18, -20.9, [6.6, .38, 2.75]));
  scene.add(box(0x465f9b, 0, .87, -19.64, [1.40, 1.74, .08]));
  for (const x of [-2.05, 2.05]) scene.add(box(0x8ed6ee, x, 1.62, -19.64, [1.1, .84, .08]));
  sign('森林小镇警察局', 0, 2.62, -19.62, 3.75, '#285d9e');
  for (const [index, { x, z }] of suspectLocations.entries()) {
    const side = Math.sign(x);
    const column = side * 4.3;
    scene.add(box(0x95735d, column, .64, z + .5, [.08, 1.28, .08]));
    sign(dossier.clues[index].spot, column, 1.33, z + .57, 1.73, '#447864');
    scene.add(box(0xcb905e, side * 5.1, .43, z - .85, [1.2, .13, .4]));
    scene.add(box(0xde9e67, side * 5.1, .71, z - 1.04, [1.2, .34, .11]));
  }
  if (dossier.clues[0].spot === '空出来的等候区') {
    for (let i = 0; i < 5; i++) scene.add(box(0xfcfbef, 0, .04, -6 + i * .27, [2.4, .02, .13]));
    sign('校门等候区', 3.62, 1.24, -6.13, 1.9, '#3975a5');
  } else {
    scene.add(shape(new CylinderGeometry(.91, 1.04, .36, 20), 0xf7e7ce, 4.8, .19, -4.6));
    scene.add(shape(new CylinderGeometry(.82, .85, .045, 20), 0x69cdeb, 4.8, .397, -4.6));
    scene.add(shape(new CylinderGeometry(.12, .24, .61, 14), 0xd8e6f1, 4.8, .69, -4.6));
    scene.add(ball(0xa8e7ff, 4.8, 1.06, -4.6, [.11, .28, .11]));
  }
  for (const z of [-2, -7, -12, -17]) {
    for (const side of [-1, 1]) {
      const x = side * 6.2;
      scene.add(box(0x9f7859, x, .68, z, [.24, 1.35, .24]),
        ball(0x58a979, x, 1.78, z, [.68, .85, .7]));
    }
  }
}

export function createDetectiveTown(canvas, dossier, onNearby) {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  const scene = new Scene();
  const releaseDaylight = addDaylight(renderer, scene, {
    horizon: '#c3e8f4', zenith: '#72b5e9', range: [15, 39],
    center: -9.5, shadowWidth: 14, shadowDepth: 16,
  });
  const camera = new PerspectiveCamera(64, 1, .07, 45);
  decorate(scene, dossier);
  scene.traverse(item => {
    if (!item.isMesh || item.material.isMeshBasicMaterial) return;
    item.receiveShadow = true;
    if (item.position.y > .32) item.castShadow = true;
  });
  const suspects = dossier.suspects.map((name, index) => {
    const person = animal(dossier.species[index], name, index);
    const { x, z } = suspectLocations[index];
    person.group.position.set(x, 0, z);
    scene.add(person.group, contactShadow(x, .055, z, 1.44, 1.15));
    return person;
  });
  const keys = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let position = { x: 0, z: 0 };
  let yaw = 0;
  let pitch = 0;
  let close = null;
  let speakingUntil = 0;
  let lastFrame = 0;
  let frame;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setSize(rect.width, rect.height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function move(x, forward, elapsed) {
    position = walkTown(position, { x, forward }, yaw, elapsed);
    const next = closestSuspect(position);
    if (next !== close) {
      close = next;
      speakingUntil = performance.now() + (close === null ? 0 : 1100);
      onNearby(close);
    }
  }

  function draw(now) {
    const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    const x = Number(keys.has('right')) - Number(keys.has('left'));
    const forward = Number(keys.has('forward')) - Number(keys.has('back'));
    if (x || forward) move(x, forward, dt);
    camera.position.set(position.x, 1.62, position.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    for (const [index, { group, pose }] of suspects.entries()) {
      group.rotation.y = Math.atan2(position.x - group.position.x, position.z - group.position.z);
      if (!reducedMotion) {
        group.scale.y = 1 + Math.sin(now * .0023 + index) * .012;
        pose(now, close === index && now < speakingUntil);
      }
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);

  return {
    start(direction) { keys.add(direction); },
    stop(direction) { keys.delete(direction); },
    stopAll() { keys.clear(); },
    step(direction) {
      move(Number(direction === 'right') - Number(direction === 'left'),
        Number(direction === 'forward') - Number(direction === 'back'), .1);
    },
    turn(dx, dy) {
      yaw -= dx * .004;
      pitch = Math.max(-.52, Math.min(.52, pitch - dy * .004));
    },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      scene.traverse(item => {
        item.geometry?.dispose();
        item.material?.map?.dispose();
        item.material?.dispose();
      });
      releaseDaylight();
      renderer.dispose();
    },
  };
}
