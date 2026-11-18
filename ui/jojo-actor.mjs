import {
  BoxGeometry, CapsuleGeometry, CatmullRomCurve3, Color, CylinderGeometry, DirectionalLight, Float32BufferAttribute, Group, HemisphereLight, LatheGeometry,
  Mesh, MeshPhysicalMaterial, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, Quaternion, Scene,
  SphereGeometry, TubeGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';

export const handoffDuration = 1950;

const skin = 0xffe7de;
const yolk = 0xffcf24;
const turquoise = 0x54b7a9;
const hair = 0xcf461b;
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

function decorateRoom(scene, bathroom) {
  if (bathroom) {
    const wall = box(scene, 0xc8eaf3, 0, 2, -2.9, 14, 6, .1);
    wall.castShadow = false;
    // Grout lines sit in front of the wall and keep a regular spacing in perspective.
    for (let tile = -7; tile <= 7; tile++) {
      box(scene, 0xe6f4f7, tile * .63, 2, -2.842, .012, 6, .012).castShadow = false;
    }
    for (let tile = 0; tile <= 8; tile++) {
      box(scene, 0xe6f4f7, 0, tile * .63, -2.84, 10, .012, .012).castShadow = false;
    }
    box(scene, 0xf7db89, 0, 1.29, -2.82, 10, .18, .025);
    oval(scene, 0xf1fbfa, -1.86, 2.51, -2.76, .79, .87, .065);
    oval(scene, 0x9dc8dc, -1.86, 2.51, -2.70, .72, .8, .025,
      { roughness: .36, clearcoat: .4 });
    oval(scene, 0xf5fbfc, 0, .68, .77, 1.76, .18, .85, { roughness: .29, clearcoat: .4 });
    oval(scene, 0xd8ecf1, -.07, .842, 1.04, .89, .017, .38);
    return;
  }
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

  shape(scene, new CylinderGeometry(.53, .58, .47, 32), 0x4d94cc, 0, .52, -.27);
  oval(scene, 0x65a5df, 0, 1.18, -.34, .66, .65, .15);
  const tabletop = new LatheGeometry([[0, 0], [.962, 0], [.986, .016], [1, .039],
    [1, .112], [.993, .136], [.971, .152], [0, .157]].map(([radius, y]) => new Vector2(radius, y)), 64);
  const table = shape(scene, tabletop, 0xed9f9f, 0, .643, .82);
  table.scale.set(1.76, 1, .91);
  for (const x of [-1.02, 1.02]) {
    shape(scene, new CylinderGeometry(.085, .105, .72, 18), 0xd49d6e, x, .35, .78);
  }
  const mat = shape(scene, new CylinderGeometry(1, 1, .013, 48), 0xffc2bd, 0, .804, 1.04);
  mat.scale.set(.95, 1, .40);
}

function buildHead(actor) {
  const head = new Group();
  head.position.y = 2.04;
  actor.add(head);
  const faceGeometry = new SphereGeometry(1, 64, 44);
  const vertices = faceGeometry.attributes.position;
  const complexion = new Color(skin);
  const blush = new Color(0xf4adac);
  const tone = new Color();
  const swatches = [];
  for (let index = 0; index < vertices.count; index++) {
    const x = vertices.getX(index), y = vertices.getY(index), z = vertices.getZ(index);
    const cheek = Math.exp(-(((Math.abs(x) - .55) / .29) ** 2 + ((y + .29) / .23) ** 2));
    tone.copy(complexion).lerp(blush, z > 0 ? cheek * .34 : 0);
    swatches.push(tone.r, tone.g, tone.b);
    const width = .704 + .061 * Math.exp(-((y + .25) ** 2) / .14);
    vertices.setXYZ(index, x * width, y * .75 + .05, z * (.59 + .028 * cheek));
  }
  faceGeometry.computeVertexNormals();
  faceGeometry.setAttribute('color', new Float32BufferAttribute(swatches, 3));
  shape(head, faceGeometry, 0xffffff, 0, 0, 0, { vertexColors: true, roughness: .65 });

  // Lay several tapered locks side by side to form the swept, sculpted crest.
  for (let lock = 0; lock < 7; lock++) {
    const shift = (lock - 3) * .055;
    const lift = 1 - Math.abs(lock - 2) * .095;
    const path = new CatmullRomCurve3([
      new Vector3(-.13 + shift, .745, .17),
      new Vector3(-.20 + shift, .815 + .06 * lift, .22),
      new Vector3(-.15 + shift, .84 + .21 * lift, .23),
      new Vector3(-.03 + shift, .85 + .208 * lift, .21),
      new Vector3(.033 + shift, .86 + .13 * lift, .22),
      new Vector3(.054 + shift, .855 + .10 * lift, .247),
    ]);
    const geometry = new TubeGeometry(path, 24, .072, 12, false);
    const position = geometry.attributes.position;
    const vertex = new Vector3();
    for (let ring = 0; ring <= 24; ring++) {
      const t = ring / 24;
      const center = path.getPointAt(t);
      for (let segment = 0; segment <= 12; segment++) {
        const index = ring * 13 + segment;
        vertex.fromBufferAttribute(position, index).lerp(center, t ** 3);
        position.setXYZ(index, vertex.x, vertex.y, vertex.z);
      }
    }
    geometry.computeVertexNormals();
    shape(head, geometry, lock % 2 ? 0xe75520 : hair, 0, 0, 0, { roughness: .39, clearcoat: .17 });
  }
  oval(head, hair, -.074, .759, .166, .268, .08, .111, { roughness: .47 });
  oval(head, skin, 0, -.154, .582, .084, .065, .054);
  const mouth = new Group();
  mouth.position.set(0, -.314, .523);
  head.add(mouth);
  oval(mouth, 0x812f3d, 0, 0, 0, .177, .075, .06).castShadow = false;
  oval(mouth, 0xf38984, 0, -.027, .04, .081, .023, .017).castShadow = false;
  oval(mouth, 0xfff8eb, 0, .035, .046, .028, .019, .012).castShadow = false;
  const eyes = [];
  for (const side of [-1, 1]) {
    oval(head, skin, side * .702, -.174, .007, .13, .159, .104).rotation.z = side * -.16;
    oval(head, 0xf1beb8, side * .735, -.165, .084, .06, .084, .027).rotation.z = side * -.21;
    const eye = new Group();
    eye.position.set(side * .275, -.015, .525);
    eye.rotation.y = side * .13;
    head.add(eye);
    oval(eye, 0xfffbf7, 0, 0, 0, .185, .167, .072, { roughness: .27 }).castShadow = false;
    for (let lash = 0; lash < 6; lash++) {
      const angle = Math.PI * (.17 + lash * .125);
      const x = Math.cos(angle), y = Math.sin(angle);
      oval(eye, 0x713b29, x * .172, y * .155, .027, .007, .037 - lash % 2 * .007, .009)
        .rotation.z = -x * .63;
    }
    const gaze = new Group();
    eye.add(gaze);
    oval(gaze, 0x286b95, 0, 0, .050, .123, .132, .036, { roughness: .23 }).castShadow = false;
    oval(gaze, 0x3da5d4, -.004, -.008, .066, .101, .113, .028, { roughness: .23 }).castShadow = false;
    oval(gaze, 0x1f273f, 0, 0, .079, .074, .095, .022, { roughness: .2 }).castShadow = false;
    oval(gaze, 0xfffcf9, -.032, .041, .103, .027, .029, .009).castShadow = false;
    oval(gaze, 0xe6f7ff, .028, -.038, .104, .012, .012, .006).castShadow = false;
    eyes.push({ eye, gaze });
    const browPath = new CatmullRomCurve3([
      new Vector3(-.13, -.015 * side, 0),
      new Vector3(-.055, .020, .019),
      new Vector3(.034, .024, .018),
      new Vector3(.13, .015 * side, -.012),
    ]);
    shape(head, new TubeGeometry(browPath, 16, .016, 8), 0xb84623,
      side * .278, .315, .50).rotation.y = side * .22;
  }
  return { head, mouth, eyes };
}

function sleeve(parent) {
  const colors = [yolk, turquoise, 0xfff4d8, 0x91dbcb, yolk];
  const profile = [[0, -.19], [.113, -.17], [.151, -.12], [.160, -.07],
    [.158, -.012], [.151, .046], [.143, .104], [.136, .146], [0, .15]];
  const geometry = new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), 24);
  geometry.clearGroups();
  const stripe = [0, 0, 1, 2, 3, 1, 4, 4];
  for (let segment = 0; segment < 24; segment++) {
    for (let band = 0; band < stripe.length; band++) {
      geometry.addGroup((segment * stripe.length + band) * 6, 6, stripe[band]);
    }
  }
  // Merge each band’s indices so there is one draw call per fabric color.
  const index = geometry.index.array;
  const groups = geometry.groups.slice();
  geometry.clearGroups();
  const arranged = [];
  colors.forEach((color, materialIndex) => {
    const start = arranged.length;
    for (const group of groups) {
      if (group.materialIndex === materialIndex) arranged.push(...index.slice(group.start, group.start + group.count));
    }
    geometry.addGroup(start, arranged.length - start, materialIndex);
  });
  geometry.setIndex(arranged);
  const mesh = new Mesh(geometry, colors.map(color => new MeshPhysicalMaterial({ color, roughness: .84 })));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildBody(actor) {
  oval(actor, yolk, 0, 1.102, .025, .533, .446, .349, { roughness: .82 });
  oval(actor, skin, 0, 1.49, .044, .187, .15, .164);
  oval(actor, 0xe0a617, 0, 1.153, .364, .011, .277, .014);
  for (const y of [1.30, 1.16, 1.02]) {
    oval(actor, 0xffee9d, 0, y, .377, .024, .024, .014);
  }
  oval(actor, turquoise, .237, 1.065, .333, .092, .075, .024).rotation.y = .31;
  const left = sleeve(actor);
  left.position.set(-.499, 1.235, .063);
  left.rotation.z = -2.52;
  oval(actor, skin, -.568, 1.00, .224, .103, .172, .109).rotation.z = -.4;
  oval(actor, skin, -.632, .872, .399, .122, .082, .131);
}

function buildArm(actor) {
  const upper = new Group();
  actor.add(upper);
  sleeve(upper);
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

const toolColors = { bowl: 0xe98373, cup: 0x55b8c8, spoon: 0xf0ba54, toothbrush: 0xf7cc32, toothpaste: 0xb375c5, toast: 0xd9964e };

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
    for (const material of [].concat(item.material ?? [])) material.dispose();
  });
}

export function createJojoActor(canvas, onDone, bathroom) {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const scene = new Scene();
  scene.background = new Color(0xffe7ce);
  scene.add(new HemisphereLight(0xfff8f4, 0xc6cbd8, 1.82));
  const keyLight = new DirectionalLight(0xfff3ea, 2.24);
  keyLight.position.set(-3.2, 5.1, 4.2);
  keyLight.target.position.set(0, 1.4, .1);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -3.15, right: 3.15, bottom: -3, top: 3, near: .1, far: 13 });
  keyLight.shadow.radius = 3.1;
  keyLight.shadow.intensity = .68;
  keyLight.shadow.normalBias = .024;
  keyLight.shadow.bias = -.0003;
  scene.add(keyLight, keyLight.target);
  const rim = new DirectionalLight(0xc9ecff, 1.12);
  rim.position.set(3.2, 3.2, -2.1);
  scene.add(rim);
  decorateRoom(scene, bathroom);

  const camera = new PerspectiveCamera(35, 1, .1, 30);
  const actor = new Group();
  scene.add(actor);
  buildBody(actor);
  const { head, mouth, eyes } = buildHead(actor);
  const bubbles = new Group();
  mouth.add(bubbles);
  for (const [x, y, radius] of [[-.14, -.015, .034], [-.109, -.042, .028], [.109, -.029, .036], [.151, .005, .024]]) {
    oval(bubbles, 0xfffcf3, x, y, .068, radius, radius, radius).castShadow = false;
  }
  bubbles.visible = false;
  const { hand, pose } = buildArm(actor);
  const rest = new Vector3(.59, .923, .358);
  const reach = new Vector3(.788, .943, .671);
  const lips = new Vector3(.246, 1.65, .606);
  const tablePoint = new Vector3(.30, .89, .80);
  const squeezePoint = new Vector3(.22, 1.035, .82);
  const point = new Vector3();
  const heldOffset = new Vector3(-.029, .043, .02);
  const toolRotation = new Quaternion();
  const startTime = performance.now();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animation;
  let tool = null;
  let preparedTool = null;
  let handoff = null;
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.position.set(.12, 2.18, 4.95 + Math.max(0, 1.05 - camera.aspect) * 2.30);
    camera.lookAt(0, 1.75, .14);
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
    bubbles.visible = false;
    point.copy(rest);
    point.y += idle * .011;
    hand.rotation.set(.08, -.17, -.13);
    let gaze = 0;
    if (handoff) {
      const t = Math.min(1, (now - handoff.start) / handoffDuration);
      const gesture = handoff.gesture;
      const settingDown = gesture === 'set-bowl' || gesture === 'set-brush';
      const squeezing = gesture === 'toothpaste';
      const using = gesture === 'feed' || gesture === 'drink' || gesture === 'brush';
      const target = using ? lips : squeezing ? squeezePoint : tablePoint;
      const reachPhase = smooth(fraction(t, 0, .26));
      const lift = smooth(fraction(t, .26, .52));
      const returnPhase = smooth(fraction(t, .8, 1));
      const hold = fraction(t, .52, .8);
      const expression = smooth(fraction(t, .27, .58)) * (1 - returnPhase);
      const movement = 1 - returnPhase;
      point.copy(rest).lerp(reach, reachPhase).lerp(target, lift).lerp(rest, returnPhase);
      if (t > .52 && t < .8) {
        const swing = Math.sin(Math.PI * hold);
        if (handoff.gesture === 'brush') {
          point.x += Math.sin(hold * 5 * Math.PI) * .138 * swing;
          bubbles.visible = true;
          bubbles.scale.setScalar(.72 + swing * .28);
        }
        if (gesture === 'drink') {
          point.y += .046 * swing;
          mouth.scale.y -= .47 * swing;
          head.rotation.x -= .12 * swing;
        }
        if (gesture === 'feed') mouth.scale.y += .57 * swing;
        if (squeezing) {
          tool.scale.x = 1 - .20 * swing;
          hand.rotation.z += .14 * swing;
        }
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
        tool.rotateZ(gesture === 'feed' || gesture === 'brush' ? .66 * lift * movement : 0);
        if (squeezing) tool.rotateZ(1.86 * lift * movement);
        if (settingDown && t >= .47) {
          tool.position.set(.24, gesture === 'set-bowl' ? .81 : .88, .89);
          tool.rotation.set(0, 0, gesture === 'set-brush' ? Math.PI / 2 : 0);
        }
        if (squeezing && t >= .61 && preparedTool && !handoff.paste) {
          handoff.paste = true;
          oval(preparedTool, 0xfdfbf4, 0, .246, .084, .034, .048, .029);
        }
      }
      if (t === 1) {
        handoff = null;
        if (settingDown) tool = null; // The prop stays on the table until the stage unmounts.
        else clearTool();
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
      if (gesture === 'toothpaste' && !preparedTool) {
        preparedTool = makeTool(actor, 'toothbrush');
        preparedTool.position.set(.24, .88, .89);
        preparedTool.rotation.z = Math.PI / 2;
      }
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
