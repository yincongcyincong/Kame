import {
  BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide,
  Group, Line, LineBasicMaterial, BufferGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PerspectiveCamera, PlaneGeometry, Raycaster, Scene, SRGBColorSpace, SphereGeometry,
  Vector2, Vector3, WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addDaylight, contactShadow, terrainTile } from './scene-lighting.mjs';
import { addAirfield, addRescueBase } from './scene-landmarks.mjs';
import { approachDistance, checkpoints, rangeFieldOfView, walkRoute } from './range-route.mjs';

const palettes = {
  wings: { road: 0x7b90ad, land: 0x6cb984, accent: 0xffc13c, tower: 0xf6fbff, robot: 0xe55449 },
  cosmic: { road: 0x60738a, land: 0x6ab84b, accent: 0x7feee7, tower: 0x2377ba, robot: 0x9d80e9 },
};

function mesh(geometry, color, x, y, z) {
  const item = new Mesh(geometry, new MeshStandardMaterial({ color, roughness: .73 }));
  item.position.set(x, y, z);
  return item;
}

function robot(color, accent) {
  const group = new Group();
  group.add(mesh(new RoundedBoxGeometry(.82, .58, .57, 3, .12), color, 0, .72, 0));
  group.add(mesh(new SphereGeometry(.47, 20, 12), color, 0, 1.32, 0));
  const visor = mesh(new RoundedBoxGeometry(.56, .23, .11, 3, .045), 0x23344f, 0, 1.34, .39);
  visor.material.roughness = .27;
  group.add(visor);
  for (const side of [-1, 1]) {
    group.add(mesh(new CylinderGeometry(.14, .19, .35, 10), accent, side * .49, .68, 0));
    group.add(mesh(new RoundedBoxGeometry(.28, .24, .48, 3, .045), 0x343057, side * .24, .22, .08));
    const eye = mesh(new SphereGeometry(.061, 14, 9), accent, side * .145, 1.35, .46);
    eye.material.emissive.setHex(accent);
    eye.material.emissiveIntensity = .40;
    group.add(eye);
    group.add(mesh(new CylinderGeometry(.08, .08, .06, 12), 0x516286, side * .49, .69, .148));
  }
  group.add(mesh(new RoundedBoxGeometry(.37, .18, .055, 2, .023), 0xfff3d3, 0, .75, .295));
  group.add(mesh(new CylinderGeometry(.035, .035, .2, 8), 0x43396d, 0, 1.79, 0));
  const light = new Mesh(new SphereGeometry(.095, 12, 8), new MeshBasicMaterial({ color: accent }));
  light.position.y = 1.93;
  group.add(light);
  return group;
}

function addScenery(scene, theme, colors, task) {
  const terrain = mesh(new BoxGeometry(58, .4, 125), colors.land, 0, -.27, -44);
  const road = mesh(new BoxGeometry(6.2, .12, 62), colors.road, 0, -.04, -27);
  terrain.material.map = terrainTile(13, 25, .3);
  road.material.map = terrainTile(3, 21, .24);
  terrain.receiveShadow = road.receiveShadow = true;
  scene.add(terrain, road);
  for (let step = 0; step < 29; step++) {
    const z = -step * 2;
    scene.add(mesh(new BoxGeometry(.10, .02, 1), colors.accent, 0, .035, z));
    for (const side of [-1, 1]) {
      scene.add(mesh(new BoxGeometry(.13, .09, 1.91), 0xe4eaf8, side * 3, .055, z));
      if (step % 3 !== 1) continue;
      const height = 1.5 + (step % 5) * .55;
      if (theme === 'wings') {
        scene.add(mesh(new CylinderGeometry(.13, .21, height, 8), 0x8e6857, side * 8.15, height / 2, z));
        scene.add(mesh(new SphereGeometry(.8, 13, 10), step % 2 ? 0x8cdba1 : 0x57a88a, side * 8.15, height, z));
        scene.add(mesh(new SphereGeometry(height * 1.7, 14, 8), colors.tower, side * 13.5, .1, z - 7));
      } else {
        scene.add(mesh(new SphereGeometry(height, 14, 10), step % 2 ? 0x69bb94 : 0x91cf9a, side * 12, .1, z - 4));
      }
    }
  }
  if (theme === 'wings') addAirfield(scene, mesh, task);
  else addRescueBase(scene, mesh, task);
}

function targetTexture(text, state = 'ready') {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 350;
  const context = canvas.getContext('2d');
  const background = state === 'hit' ? '#cfffe2' : state === 'miss' ? '#ffe2e7' : '#fff3d8';
  const border = state === 'hit' ? '#3a9d72' : state === 'miss' ? '#c55b75' : '#8170bd';
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = border;
  context.lineWidth = 18;
  context.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  context.beginPath();
  context.arc(240, 175, 125, 0, Math.PI * 2);
  context.strokeStyle = border + '30';
  context.stroke();
  context.fillStyle = '#282245';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const glyphs = Array.from(text);
  let lines;
  let font = glyphs.length < 6 ? 94 : 65;
  for (; font >= 18; font -= 4) {
    context.font = `800 ${font}px system-ui, sans-serif`;
    lines = [''];
    for (const glyph of glyphs) {
      const line = lines.at(-1);
      if (line && context.measureText(line + glyph).width > 421) lines.push(glyph.trimStart());
      else lines[lines.length - 1] = line + glyph;
    }
    if (lines.length * font * 1.25 < 286) break;
  }
  lines.forEach((line, index) => context.fillText(line, 240, 175 + (index - (lines.length - 1) / 2) * font * 1.25, 420));
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createRangeScene(canvas, theme, handlers) {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  const colors = palettes[theme] || palettes.wings;
  const scene = new Scene();
  const releaseDaylight = addDaylight(renderer, scene, {
    horizon: theme === 'wings' ? '#cde9ff' : '#a9dcfa', zenith: theme === 'wings' ? '#529ef1' : '#348edb',
    skyLight: 0xeaf5ff, groundLight: theme === 'wings' ? 0xb6bcca : 0x9fba8e,
    sunColor: theme === 'wings' ? 0xfff9ef : 0xfff4dd,
    range: [24, 72], center: -25, shadowWidth: 21, shadowDepth: 33,
  });
  const camera = new PerspectiveCamera(60, 1, .06, 74);
  addScenery(scene, theme, colors, handlers.task);
  scene.traverse(item => {
    if (!item.isMesh || item.material.isMeshBasicMaterial) return;
    item.receiveShadow = true;
    if (item.position.y > .32) item.castShadow = true;
  });
  const robots = checkpoints.map(distance => {
    const group = robot(colors.robot, colors.accent);
    group.position.set(0, 0, -distance - 1);
    const arch = mesh(new BoxGeometry(5.5, .21, .27), colors.accent, 0, 2.8, -distance - 2);
    const shadow = contactShadow(0, .039, -distance - 1, 1.65, 1.38);
    arch.castShadow = true;
    scene.add(group, arch, shadow);
    for (const x of [-2.65, 2.65]) {
      const leg = mesh(new BoxGeometry(.22, 2.8, .27), colors.tower, x, 1.4, arch.position.z);
      leg.castShadow = true;
      scene.add(leg);
    }
    return { group, shadow };
  });

  const launcherColors = { jet: 0xffa787, donnie: 0xfbcf75, dizzy: 0xff9fd1, storm: 0x96ceff,
    lightning: 0xffcd75, rainbow: 0xd4aaff };
  const launcher = mesh(new RoundedBoxGeometry(.20, .13, .34, 3, .048), launcherColors[handlers.role] || colors.accent, .34, -.31, -.68);
  const lens = mesh(new CylinderGeometry(.05, .055, .074, 14), 0x82e8ff, 0, 0, -.181);
  lens.rotation.x = Math.PI / 2;
  launcher.add(lens);
  camera.add(launcher);
  scene.add(camera);

  const pointer = new Vector2();
  const ray = new Raycaster();
  const keys = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let position = { x: 0, distance: 1, near: false };
  let station = 0;
  let targets = [];
  let answer;
  let encountered = false;
  let hit = false;
  let yaw = 0;
  let tilt = 0;
  let lastFrame = 0;
  let animation;
  let trail = null;
  let trailEnds = 0;
  let breakup = null;

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = rangeFieldOfView(camera.aspect);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function disposeTarget(target) {
    scene.remove(target);
    target.geometry.dispose();
    target.material.map.dispose();
    target.material.dispose();
  }

  function removeTrail() {
    if (!trail) return;
    scene.remove(trail);
    trail.geometry.dispose();
    trail.material.dispose();
    trail = null;
  }

  function setStation(index, stage) {
    targets.forEach(disposeTarget);
    removeTrail();
    station = index;
    if (index > 0) position = { ...position, distance: Math.max(position.distance, checkpoints[index - 1] - approachDistance), near: false };
    encountered = false;
    hit = false;
    yaw = 0;
    tilt = 0;
    answer = stage.answer;
    targets = stage.targets.map((text, slot) => {
      const target = new Mesh(new PlaneGeometry(1.47, 1.08), new MeshBasicMaterial({
        map: targetTexture(text), side: DoubleSide, toneMapped: false,
      }));
      target.position.set((slot - 1) * 1.69, 1.47 + (slot === 1 ? .16 : 0), -checkpoints[index] + .2);
      target.userData.label = text;
      target.visible = false;
      scene.add(target);
      return target;
    });
  }

  function move(directions, elapsed) {
    const next = walkRoute(position, directions, elapsed, station, hit);
    position = next;
    if (next.near && !encountered) {
      encountered = true;
      for (const target of targets) target.visible = true;
      yaw = 0;
      tilt = 0;
      handlers.onEncounter();
    }
  }

  function frame(now) {
    const elapsed = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    const forward = Number(keys.has('forward')) - Number(keys.has('back'));
    const x = Number(keys.has('right')) - Number(keys.has('left'));
    if (x || forward) move({ x, forward }, elapsed);
    const bob = !reducedMotion && (x || forward) ? Math.sin(now * .013) * .032 : 0;
    camera.position.set(position.x, 1.61 + bob, -position.distance);
    camera.rotation.set(tilt, yaw, 0, 'YXZ');
    if (!reducedMotion && !hit) robots[station].group.position.y = Math.sin(now * .003) * .07;
    if (breakup) {
      const elapsed = (now - breakup.start) / 1000;
      if (elapsed >= .65) {
        breakup.group.visible = false;
        breakup = null;
      } else {
        for (const [index, part] of breakup.parts.entries()) {
          const angle = index * 2.4;
          part.mesh.position.copy(part.start);
          part.mesh.position.x += Math.cos(angle) * elapsed * 2.8;
          part.mesh.position.z += Math.sin(angle) * elapsed * 2.8;
          part.mesh.position.y += elapsed * (2.6 - elapsed * 6);
          part.mesh.rotation.z = elapsed * (index % 2 ? 5 : -5);
          part.mesh.scale.copy(part.scale).multiplyScalar(1 - elapsed / .8);
        }
      }
    }
    if (trail && now > trailEnds) removeTrail();
    renderer.render(scene, camera);
    animation = requestAnimationFrame(frame);
  }
  animation = requestAnimationFrame(frame);

  function mark(target, state) {
    target.material.map.dispose();
    target.material.map = targetTexture(target.userData.label, state);
  }

  function fire(x, y, slot) {
    if (!encountered || hit) return;
    pointer.set(x, y);
    camera.updateMatrixWorld();
    ray.setFromCamera(pointer, camera);
    const surface = slot === undefined ? ray.intersectObjects(targets, false)[0] : null;
    const target = slot === undefined ? surface?.object : targets[slot];
    const end = surface?.point || target?.position || ray.ray.at(12, new Vector3());
    const origin = camera.position.clone().add(new Vector3(.34, -.31, -.875).applyQuaternion(camera.quaternion));
    removeTrail();
    const correct = target?.userData.label === answer;
    trail = new Line(new BufferGeometry().setFromPoints([origin, end]), new LineBasicMaterial({
      color: correct ? 0xa8ffdb : 0xfff3a4, depthTest: false, toneMapped: false,
    }));
    trail.renderOrder = 20;
    scene.add(trail);
    trailEnds = performance.now() + 240;
    for (const item of targets) {
      const state = item === target ? correct ? 'hit' : 'miss' : 'ready';
      if (state === item.userData.state) continue;
      item.userData.state = state;
      mark(item, state);
    }
    if (correct) {
      hit = true;
      for (const item of targets) item.visible = false;
      const { group, shadow } = robots[station];
      shadow.visible = false;
      if (reducedMotion) group.visible = false;
      else breakup = {
        group, start: performance.now(),
        parts: group.children.map(mesh => ({ mesh, start: mesh.position.clone(), scale: mesh.scale.clone() })),
      };
    }
    handlers.onShot(correct ? 'hit' : target ? 'wrong' : 'miss');
  }

  return {
    setStation,
    start(direction) { keys.add(direction); },
    stop(direction) { keys.delete(direction); },
    stopAll() { keys.clear(); },
    step(direction) {
      move({ x: Number(direction === 'right') - Number(direction === 'left'),
        forward: Number(direction === 'forward') - Number(direction === 'back') }, .1);
    },
    look(dx, dy) {
      yaw = Math.max(-.75, Math.min(.75, yaw + dx * .003));
      tilt = Math.max(-.32, Math.min(.32, tilt + dy * .003));
    },
    fire,
    dispose() {
      cancelAnimationFrame(animation);
      observer.disconnect();
      removeTrail();
      scene.traverse(item => {
        if (!item.isMesh) return;
        item.geometry.dispose();
        item.material.map?.dispose();
        item.material.dispose();
      });
      releaseDaylight();
      renderer.dispose();
    },
  };
}
