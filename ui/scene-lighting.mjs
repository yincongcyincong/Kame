import {
  NeutralToneMapping, CanvasTexture, Color, DirectionalLight, EquirectangularReflectionMapping, Fog,
  HemisphereLight, Mesh, MeshBasicMaterial, PCFShadowMap, PlaneGeometry, RepeatWrapping, SRGBColorSpace,
} from 'three';

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function addDaylight(renderer, scene, { horizon, zenith, range, center, shadowWidth, shadowDepth, skyLight, groundLight, sunColor }) {
  const sky = canvasTexture(1024, 512, context => {
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, zenith);
    gradient.addColorStop(.5, horizon);
    gradient.addColorStop(1, '#c8e5ce');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 512);
    for (const [x, y, size] of [[68, 191, 30], [162, 218, 23], [260, 177, 22], [398, 205, 37],
      [568, 187, 27], [701, 218, 25], [795, 171, 32], [929, 207, 27]]) {
      context.save();
      context.translate(x, y);
      context.scale(2.5, .47);
      for (const offset of [-.62, 0, .58]) {
        const cloud = context.createRadialGradient(size * offset, -size * (offset === 0 ? .35 : .12), 1, size * offset, 0, size);
        cloud.addColorStop(0, '#fffcf1cd');
        cloud.addColorStop(.58, '#fffcf1a8');
        cloud.addColorStop(1, '#fffcf100');
        context.fillStyle = cloud;
        context.fillRect(size * (offset - 1), -size, size * 2, size * 2);
      }
      context.restore();
    }
  });
  sky.mapping = EquirectangularReflectionMapping;
  scene.background = sky;
  scene.fog = new Fog(new Color(horizon), ...range);

  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  scene.add(new HemisphereLight(skyLight, groundLight, 1.26));
  const sun = new DirectionalLight(sunColor, 2.1);
  sun.position.set(-12, 20, center + 6);
  sun.target.position.set(0, 0, center);
  sun.castShadow = true;
  sun.shadow.intensity = .63;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -shadowWidth;
  sun.shadow.camera.right = shadowWidth;
  sun.shadow.camera.top = shadowDepth;
  sun.shadow.camera.bottom = -shadowDepth;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 63;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = .025;
  sun.shadow.bias = -.00025;
  // Scenery is static. Moving characters have soft ground contact shadows.
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  scene.add(sun, sun.target);
  return () => {
    sky.dispose();
    sun.shadow.dispose();
  };
}

export function terrainTile(repeatX, repeatY, strength) {
  const texture = canvasTexture(256, 256, context => {
    context.fillStyle = '#f7f7f7';
    context.fillRect(0, 0, 256, 256);
    let seed = 719381;
    function sample() {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    for (let index = 0; index < 1050; index++) {
      const tone = index % 3 === 0 ? '255,255,255' : '85,85,85';
      context.fillStyle = `rgba(${tone},${sample() * strength})`;
      const size = sample() * 2 + 1;
      context.fillRect(sample() * 256, sample() * 256, size, size);
    }
  });
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

export function contactShadow(x, y, z, width, depth) {
  const texture = canvasTexture(64, 64, context => {
    const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 32);
    gradient.addColorStop(0, '#192a4799');
    gradient.addColorStop(.52, '#192a474a');
    gradient.addColorStop(1, '#192a4700');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  });
  const shadow = new Mesh(new PlaneGeometry(width, depth), new MeshBasicMaterial({
    map: texture, opacity: .78, transparent: true, depthWrite: false, toneMapped: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, y, z);
  return shadow;
}
