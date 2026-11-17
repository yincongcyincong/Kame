import {
  BoxGeometry, CapsuleGeometry, CatmullRomCurve3, Color, CylinderGeometry, DirectionalLight, Float32BufferAttribute, Group, HemisphereLight, LatheGeometry,
  Mesh, MeshPhysicalMaterial, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, Quaternion, Scene,
  SphereGeometry, TubeGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';

export const handoffDuration = 1950;

const skin = 0xfac29d;
const yolk = 0xfab331;
const trim = 0xf7d970;
const turquoise = 0x54b7a9;
const hair = 0x9f461f;
const smooth = t => t * t * (3 - 2 * t);
const fraction = (value, start, end) => Math.max(0, Math.min(1, (value - start) / (end - start)));

function shape(parent, geometry, color, x, y, z, surface = {}) {
  const mesh = new Mesh(geometry, new MeshPhysicalMaterial({ color, roughness: .67, ...surface }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function oval(parent, color, x, y, z, sx, sy, sz, surface) {
  const mesh = shape(parent, new SphereGeometry(1, 32, 20), color, x, y, z, surface);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

function box(parent, color, x, y, z, width, height, depth, surface) {
  return shape(parent, new BoxGeometry(width, height, depth), color, x, y, z, surface);
}

function decorateRoom(scene) {
  const back = box(scene, 0xffdbbd, 0, 2, -2.9, 16, 6, .1);
  back.castShadow = false;
  const floor = box(scene, 0xe8bd94, 0, -.095, -1, 16, .18, 15);
  floor.castShadow = false;

  box(scene, 0xffedda, 0, .26, -2.81, 16, .18, .07);
  box(scene, 0xffedda, -1.95, 2.32, -2.76, 1.76, 1.64, .14);
  box(scene, 0x8cd4ea, -1.95, 2.33, -2.68, 1.61, 1.49, .03, { emissive: 0x78bfde, emissiveIntensity: .25 });
  oval(scene, 0xfff4df, -2.26, 2.63, -2.66, .36, .105, .008).castShadow = false;
  oval(scene, 0xe8f4fb, -1.75, 2.04, -2.66, .32, .09, .008).castShadow = false;
  box(scene, 0xffefdb, -1.95, 2.33, -2.64, .055, 1.49, .03);
  box(scene, 0xffefdb, -1.95, 2.33, -2.64, 1.61, .055, .03);
  box(scene, 0xf8dcc1, 1.76, 1.07, -2.57, 1.43, .095, .49);
  box(scene, 0xe19179, 1.99, 1.30, -2.65, .14, .37, .16);
  box(scene, 0x77b6ae, 1.78, 1.40, -2.63, .16, .58, .18);
  box(scene, 0xffcf69, 1.53, 1.26, -2.60, .19, .30, .18);

  shape(scene, new CylinderGeometry(.53, .58, .47, 32), 0x75bfb9, 0, .52, -.27);
  oval(scene, 0x8bd1c2, 0, 1.18, -.34, .66, .65, .15);
  const tabletop = new LatheGeometry([[0, 0], [.962, 0], [.986, .016], [1, .039],
    [1, .112], [.993, .136], [.971, .152], [0, .157]].map(([radius, y]) => new Vector2(radius, y)), 64);
  const table = shape(scene, tabletop, 0xefd29d, 0, .643, .82);
  table.scale.set(1.76, 1, .91);
  for (const x of [-1.02, 1.02]) {
    shape(scene, new CylinderGeometry(.085, .105, .72, 18), 0xd49d6e, x, .35, .78);
  }
  const mat = shape(scene, new CylinderGeometry(1, 1, .013, 48), 0xf1aa8e, 0, .804, 1.04);
  mat.scale.set(.95, 1, .40);
}

function buildHead(actor) {
  const head = new Group();
  head.position.y = 2.04;
  actor.add(head);
  const face = oval(head, 0xffffff, 0, 0, 0, .69, .64, .57,
    { vertexColors: true, roughness: .56, clearcoat: .06 });
  const faceVertices = face.geometry.attributes.position;
  const complexion = new Color(skin);
  const blush = new Color(0xf18f85);
  const tone = new Color();
  const swatches = [];
  for (let index = 0; index < faceVertices.count; index++) {
    const x = faceVertices.getX(index), y = faceVertices.getY(index);
    const falloff = ((Math.abs(x) - .57) / .22) ** 2 + ((y + .24) / .20) ** 2;
    const red = faceVertices.getZ(index) > 0 ? Math.exp(-falloff) * .63 : 0;
    tone.copy(complexion).lerp(blush, red);
    swatches.push(tone.r, tone.g, tone.b);
  }
  face.geometry.setAttribute('color', new Float32BufferAttribute(swatches, 3));
  const curlPath = new CatmullRomCurve3([
    new Vector3(-.20, .584, .12), new Vector3(-.13, .714, .14),
    new Vector3(.024, .808, .14), new Vector3(.169, .771, .11),
    new Vector3(.193, .675, .128), new Vector3(.115, .656, .18),
  ]);
  const curlGeometry = new TubeGeometry(curlPath, 24, .091, 12, false);
  const vertices = curlGeometry.attributes.position;
  for (let ring = 0; ring <= 24; ring++) {
    const t = ring / 24;
    const centre = curlPath.getPointAt(t);
    for (let segment = 0; segment <= 12; segment++) {
      const index = ring * 13 + segment;
      const vertex = new Vector3().fromBufferAttribute(vertices, index).lerp(centre, t * .75);
      vertices.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  curlGeometry.computeVertexNormals();
  shape(head, curlGeometry, hair, 0, 0, 0, { roughness: .38, clearcoat: .3 });
  oval(head, 0xae5529, -.077, .582, .127, .21, .116, .111, { roughness: .42, clearcoat: .2 });
  oval(head, skin, 0, -.079, .553, .097, .075, .054);
  const mouth = new Group();
  mouth.position.set(0, -.251, .519);
  head.add(mouth);
  oval(mouth, 0x812f3d, 0, 0, 0, .143, .074, .058).castShadow = false;
  oval(mouth, 0xf38984, 0, -.027, .04, .081, .023, .017).castShadow = false;
  oval(mouth, 0xfff8eb, -.027, .028, .042, .026, .022, .015).castShadow = false;
  oval(mouth, 0xfff8eb, .027, .028, .042, .026, .022, .015).castShadow = false;
  const eyes = [];
  for (const side of [-1, 1]) {
    oval(head, skin, side * .648, -.068, .007, .13, .159, .104).rotation.z = side * -.16;
    oval(head, 0xe99b93, side * .682, -.055, .084, .06, .084, .027).rotation.z = side * -.21;
    const eye = new Group();
    eye.position.set(side * .226, .077, .514);
    eye.rotation.y = side * .13;
    head.add(eye);
    oval(eye, 0xfffbf7, 0, 0, 0, .144, .163, .065, { roughness: .27 }).castShadow = false;
    const gaze = new Group();
    eye.add(gaze);
    oval(gaze, 0x286b95, 0, 0, .050, .095, .114, .036, { roughness: .23 }).castShadow = false;
    oval(gaze, 0x3da5d4, -.004, -.008, .066, .074, .094, .028, { roughness: .23 }).castShadow = false;
    oval(gaze, 0x1f273f, 0, 0, .079, .053, .075, .022, { roughness: .2 }).castShadow = false;
    oval(gaze, 0xfffcf9, -.032, .041, .103, .027, .029, .009).castShadow = false;
    oval(gaze, 0xe6f7ff, .028, -.038, .104, .012, .012, .006).castShadow = false;
    eyes.push({ eye, gaze });
    const brow = oval(head, 0x9d4a27, side * .224, .297, .456, .118, .023, .021);
    brow.rotation.z = side * -.135;
  }
  return { head, mouth, eyes };
}

function buildBody(actor) {
  oval(actor, turquoise, 0, 1.20, -.015, .53, .44, .34);
  oval(actor, yolk, 0, 1.04, .104, .449, .404, .306);
  oval(actor, trim, 0, 1.03, .399, .19, .117, .037);
  oval(actor, skin, 0, 1.53, .028, .182, .18, .166);
  for (const side of [-1, 1]) {
    const strap = oval(actor, yolk, side * .232, 1.367, .274, .081, .201, .056);
    strap.rotation.z = side * .205;
    oval(actor, 0xfff0a0, side * .207, 1.281, .341, .048, .049, .031);
  }
  const sleeve = oval(actor, turquoise, -.483, 1.264, .05, .202, .231, .182);
  sleeve.rotation.z = -.41;
  oval(actor, 0xffe8ad, -.539, 1.144, .12, .152, .082, .147).rotation.z = -.43;
  oval(actor, skin, -.598, .995, .264, .126, .161, .113).rotation.z = -.37;
  oval(actor, skin, -.641, .872, .423, .127, .089, .135);
}

function buildArm(actor) {
  const upper = new Group();
  actor.add(upper);
  shape(upper, new CapsuleGeometry(.14, .18, 8, 20), turquoise, 0, 0, 0);
  shape(upper, new CylinderGeometry(.142, .142, .05, 24), 0xffedbd, 0, .023, 0);
  shape(upper, new CylinderGeometry(.136, .136, .045, 24), 0x83c5b1, 0, .136, 0);
  const forearm = shape(actor, new CapsuleGeometry(.090, .32, 8, 18), skin, 0, 0, 0);
  const hand = new Group();
  actor.add(hand);
  oval(hand, skin, 0, 0, 0, .115, .083, .105);
  oval(hand, skin, -.073, .057, .062, .055, .041, .054);
  for (let i = 0; i < 3; i++) {
    oval(hand, skin, -.056 + i * .053, -.008, .082, .042, .047, .037);
  }

  // Place the elbow on the intersection of two fixed-length arm segments, biased down and outward.
  const shoulder = new Vector3(.474, 1.308, .112);
  const elbow = new Vector3();
  const direction = new Vector3();
  const pole = new Vector3();
  const up = new Vector3(0, 1, 0);
  const upperLength = .37;
  const lowerLength = .45;
  const wrist = new Vector3();
  function align(mesh, from, to) {
    const span = direction.subVectors(to, from);
    mesh.position.copy(from).addScaledVector(span, .5);
    mesh.quaternion.setFromUnitVectors(up, span.normalize());
  }
  return {
    hand,
    pose(target) {
      direction.subVectors(target, shoulder);
      const measured = direction.length();
      const reach = Math.min(upperLength + lowerLength - .005, Math.max(.09, measured));
      direction.divideScalar(measured || 1);
      wrist.copy(shoulder).addScaledVector(direction, reach);
      const midpoint = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
      pole.set(.75, -1, -.08).addScaledVector(direction, -pole.dot(direction)).normalize();
      elbow.copy(shoulder).addScaledVector(direction, midpoint)
        .addScaledVector(pole, Math.sqrt(Math.max(0, upperLength ** 2 - midpoint ** 2)));
      align(upper, shoulder, elbow);
      align(forearm, elbow, wrist);
      hand.position.copy(wrist);
    },
  };
}

const toolColors = { bowl: 0xe98373, cup: 0x55b8c8, spoon: 0xf0ba54, toothbrush: 0x43aaa6, toothpaste: 0xb375c5, toast: 0xd9964e };

function makeTool(actor, key) {
  const tool = new Group();
  const color = toolColors[key];
  const ceramic = { roughness: .28, clearcoat: .37 };
  if (key === 'bowl' || key === 'cup') {
    const bowl = key === 'bowl';
    const radius = bowl ? .205 : .123;
    shape(tool, new CylinderGeometry(radius, bowl ? .109 : .10, bowl ? .115 : .22, 28), color, 0, .044, 0, ceramic);
    const rim = bowl ? .104 : .153;
    shape(tool, new CylinderGeometry(radius * .9, radius * .9, .013, 28), bowl ? 0xffecd2 : 0xc5edff, 0, rim, 0, ceramic);
    if (bowl) {
      for (const [x, z] of [[-.065, .018], [.046, .047], [.073, -.049], [-.012, -.07]]) {
        oval(tool, 0xc68a53, x, rim + .01, z, .023, .013, .018);
      }
    }
  } else if (key === 'toast') {
    const crust = oval(tool, 0xb16c32, 0, .15, 0, .113, .122, .033);
    crust.rotation.z = -.08;
    oval(tool, color, 0, .153, .025, .091, .10, .019);
  } else {
    shape(tool, new CapsuleGeometry(key === 'toothpaste' ? .051 : .032, .192, 9, 18), color, 0, .105, 0, ceramic);
    if (key === 'spoon') {
      oval(tool, color, 0, .255, .017, .069, .092, .034, ceramic);
      oval(tool, 0xffebbc, 0, .264, .039, .049, .061, .013);
    } else if (key === 'toothbrush') {
      oval(tool, color, 0, .235, .018, .048, .084, .029, ceramic);
      for (const y of [.189, .234, .279]) {
        box(tool, 0xfff8e9, 0, y, .049, .070, .031, .046);
      }
    } else {
      shape(tool, new CylinderGeometry(.043, .047, .06, 14), 0xfff8e8, 0, .249, 0, ceramic);
    }
  }
  actor.add(tool);
  return tool;
}

function disposeMeshes(node) {
  node.traverse(item => {
    item.geometry?.dispose();
    item.material?.dispose();
  });
}

export function createJojoActor(canvas, onDone) {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const scene = new Scene();
  scene.background = new Color(0xffe7ce);
  scene.add(new HemisphereLight(0xfff0db, 0xb8c3d4, 1.82));
  const keyLight = new DirectionalLight(0xffebd2, 2.24);
  keyLight.position.set(-3.2, 5.1, 4.2);
  keyLight.target.position.set(0, 1.4, .1);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -3.15, right: 3.15, bottom: -3, top: 3, near: .1, far: 13 });
  keyLight.shadow.radius = 3.1;
  keyLight.shadow.normalBias = .024;
  keyLight.shadow.bias = -.0003;
  scene.add(keyLight, keyLight.target);
  const rim = new DirectionalLight(0xc9ecff, 1.12);
  rim.position.set(3.2, 3.2, -2.1);
  scene.add(rim);
  decorateRoom(scene);

  const camera = new PerspectiveCamera(35, 1, .1, 30);
  const actor = new Group();
  scene.add(actor);
  buildBody(actor);
  const { head, mouth, eyes } = buildHead(actor);
  const { hand, pose } = buildArm(actor);
  const rest = new Vector3(.59, .923, .358);
  const reach = new Vector3(.788, .943, .671);
  const lips = new Vector3(.145, 1.725, .600);
  const tablePoint = new Vector3(.382, 1.059, .539);
  const point = new Vector3();
  const heldOffset = new Vector3(-.029, .043, .02);
  const toolRotation = new Quaternion();
  const startTime = performance.now();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animation;
  let tool = null;
  let handoff = null;
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.position.set(.27, 2.17, 5.32 + Math.max(0, 1.05 - camera.aspect) * 2.30);
    camera.lookAt(0, 1.55, .14);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function clearTool() {
    if (!tool) return;
    actor.remove(tool);
    disposeMeshes(tool);
    tool = null;
  }

  function render(now) {
    const seconds = (now - startTime) / 1000;
    const blink = (seconds + .72) % 3.95;
    const closed = reducedMotion ? 0 : Math.max(0, 1 - Math.abs(blink - 3.74) / .095);
    const idle = reducedMotion ? 0 : Math.sin(seconds * 2.45);
    head.position.y = 2.04 + idle * .014;
    head.rotation.set(idle * .009, idle * .027, idle * .017);
    mouth.scale.y = 1;
    point.copy(rest);
    point.y += idle * .011;
    hand.rotation.set(.08, -.17, -.13);
    let gaze = 0;
    if (handoff) {
      const t = Math.min(1, (now - handoff.start) / handoffDuration);
      const using = handoff.gesture !== 'tap';
      const target = using ? lips : tablePoint;
      const reachPhase = smooth(fraction(t, 0, .26));
      const lift = smooth(fraction(t, .26, .52));
      const returnPhase = smooth(fraction(t, .8, 1));
      const hold = fraction(t, .52, .8);
      const expression = smooth(fraction(t, .27, .58)) * (1 - returnPhase);
      const movement = 1 - returnPhase;
      point.copy(rest).lerp(reach, reachPhase).lerp(target, lift).lerp(rest, returnPhase);
      if (t > .52 && t < .8) {
        const swing = Math.sin(Math.PI * hold);
        if (handoff.gesture === 'brush') point.x += Math.sin(hold * 5 * Math.PI) * .138 * swing;
        if (handoff.gesture === 'drink') point.y += .046 * swing;
        if (handoff.gesture === 'feed') mouth.scale.y += .57 * swing;
      }
      head.rotation.x += (using ? -.07 : .104) * expression;
      head.rotation.z -= .062 * expression;
      gaze = movement;
      hand.rotation.z += lift * movement * (handoff.gesture === 'brush' ? .94 : .65);
      hand.rotation.x += lift * movement * (handoff.gesture === 'drink' ? -.83 : -.2);
      pose(point);
      if (t < .26) {
        tool.position.copy(reach).add(heldOffset);
        tool.position.z += (1 - reachPhase) * .29;
        tool.rotation.set(0, 0, .09);
      } else {
        toolRotation.copy(hand.quaternion);
        tool.position.copy(hand.position).addScaledVector(heldOffset, 1);
        tool.quaternion.copy(toolRotation);
        tool.rotateZ(handoff.gesture === 'feed' || handoff.gesture === 'brush' ? .66 * lift * movement : 0);
      }
      if (t === 1) {
        handoff = null;
        clearTool();
        onDone();
      }
    } else {
      pose(point);
    }
    for (const { eye, gaze: iris } of eyes) {
      eye.scale.y = 1 - closed * .9;
      iris.position.set(gaze * .026, -gaze * .013, 0);
    }
    renderer.render(scene, camera);
    animation = requestAnimationFrame(render);
  }
  animation = requestAnimationFrame(render);

  return {
    give(key, gesture) {
      if (handoff) return;
      tool = makeTool(actor, key);
      handoff = { start: performance.now(), gesture };
    },
    dispose() {
      cancelAnimationFrame(animation);
      observer.disconnect();
      keyLight.shadow.dispose();
      disposeMeshes(scene);
      renderer.dispose();
    },
  };
}
