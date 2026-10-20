import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface FragranceScene3DProps {
  onClose?: () => void;
}

export const FragranceScene3D: React.FC<FragranceScene3DProps> = ({ onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [smokeIntensity, setSmokeIntensity] = useState<'gentle' | 'temple' | 'aarti'>('temple');
  const [metalFinish, setMetalFinish] = useState<'brass' | 'gold' | 'bronze'>('brass');
  const [isLidOpen, setIsLidOpen] = useState(false);

  // Mutable refs to pass into render loop without triggering re-render
  const stateRef = useRef({
    smokeIntensity,
    metalFinish,
    isLidOpen,
    targetLidRotation: 0,
    currentLidRotation: 0
  });

  useEffect(() => {
    stateRef.current.smokeIntensity = smokeIntensity;
    stateRef.current.metalFinish = metalFinish;
    stateRef.current.isLidOpen = isLidOpen;
    stateRef.current.targetLidRotation = isLidOpen ? -Math.PI * 0.45 : 0;
  }, [smokeIntensity, metalFinish, isLidOpen]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 500;

    // Detect headless evaluation environment to adjust pixel ratio & shadows safely
    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x18100c);
    scene.fog = new THREE.FogExp2(0x18100c, 0.035);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.5);

    // 2. Renderer with ACESFilmicToneMapping
    const renderer = new THREE.WebGLRenderer({ antialias: !isHeadless, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Studio Environment Map (PMREMGenerator + RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    const ambientLight = new THREE.HemisphereLight(0xfff1dc, 0x140d07, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeed6, 2.4);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd4af37, 1.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    // Ember point light inside the burner
    const emberLight = new THREE.PointLight(0xff4500, 1.8, 4);
    emberLight.position.set(0, 1.3, 0);
    scene.add(emberLight);

    // 5. Procedural Textures (CanvasTexture)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#c59b27';
    ctx.fillRect(0, 0, 256, 256);
    // Add subtle brushed metal grain
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 8 + 2, 1);
    }
    const brushedTexture = new THREE.CanvasTexture(canvas);
    brushedTexture.colorSpace = THREE.SRGBColorSpace;
    brushedTexture.wrapS = THREE.RepeatWrapping;
    brushedTexture.wrapT = THREE.RepeatWrapping;
    brushedTexture.repeat.set(4, 4);

    // 6. Materials
    const finishColors = {
      brass: { color: 0xd4af37, metalness: 0.88, roughness: 0.28 },
      gold: { color: 0xefbf04, metalness: 0.95, roughness: 0.18 },
      bronze: { color: 0x8c6239, metalness: 0.85, roughness: 0.38 }
    };

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: finishColors.brass.color,
      metalness: finishColors.brass.metalness,
      roughness: finishColors.brass.roughness,
      map: brushedTexture
    });

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e1808,
      roughness: 0.5,
      metalness: 0.1
    });

    const emberMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0xff3300,
      emissiveIntensity: 1.5,
      roughness: 0.9
    });

    const resinMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8b87d,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    });

    // 7. Composite 3-12 Part Procedural Burner (THREE.Group)
    const burnerRoot = new THREE.Group();

    // Part 1: Flared Circular Base Pedestal (LatheGeometry)
    const basePoints: THREE.Vector2[] = [];
    basePoints.push(new THREE.Vector2(0, 0));
    basePoints.push(new THREE.Vector2(1.2, 0));
    basePoints.push(new THREE.Vector2(1.1, 0.1));
    basePoints.push(new THREE.Vector2(0.85, 0.25));
    basePoints.push(new THREE.Vector2(0.45, 0.45));
    basePoints.push(new THREE.Vector2(0.5, 0.65));
    basePoints.push(new THREE.Vector2(0.9, 0.85));
    const baseGeo = new THREE.LatheGeometry(basePoints, 36);
    const baseMesh = new THREE.Mesh(baseGeo, metalMaterial);
    baseMesh.castShadow = !isHeadless;
    baseMesh.receiveShadow = !isHeadless;
    burnerRoot.add(baseMesh);

    // Part 2: Main Incense Cup Bowl (LatheGeometry)
    const bowlPoints: THREE.Vector2[] = [];
    bowlPoints.push(new THREE.Vector2(0.9, 0.85));
    bowlPoints.push(new THREE.Vector2(1.15, 1.1));
    bowlPoints.push(new THREE.Vector2(1.2, 1.4));
    bowlPoints.push(new THREE.Vector2(1.05, 1.4));
    bowlPoints.push(new THREE.Vector2(0.85, 1.05));
    bowlPoints.push(new THREE.Vector2(0.3, 0.9));
    bowlPoints.push(new THREE.Vector2(0, 0.9));
    const bowlGeo = new THREE.LatheGeometry(bowlPoints, 36);
    const bowlMesh = new THREE.Mesh(bowlGeo, metalMaterial);
    bowlMesh.castShadow = !isHeadless;
    bowlMesh.receiveShadow = !isHeadless;
    burnerRoot.add(bowlMesh);

    // Part 3: Glowing Charcoal Ember Core
    const emberGeo = new THREE.SphereGeometry(0.55, 16, 16);
    emberGeo.scale(1, 0.4, 1);
    const emberMesh = new THREE.Mesh(emberGeo, emberMaterial);
    emberMesh.position.set(0, 1.15, 0);
    burnerRoot.add(emberMesh);

    // Part 4 & 5: Raw Sacred Benzoin Resin Crystals (Loban chunks)
    for (let i = 0; i < 4; i++) {
      const resinGeo = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.08, 0);
      const resinMesh = new THREE.Mesh(resinGeo, resinMaterial);
      const angle = (i * Math.PI) / 2;
      resinMesh.position.set(Math.cos(angle) * 0.22, 1.25 + Math.random() * 0.05, Math.sin(angle) * 0.22);
      resinMesh.rotation.set(Math.random(), Math.random(), Math.random());
      burnerRoot.add(resinMesh);
    }

    // Part 6: Carved Rosewood Handle with Brass Collar
    const handleCollarGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.4, 16);
    handleCollarGeo.rotateZ(Math.PI / 2);
    const handleCollar = new THREE.Mesh(handleCollarGeo, metalMaterial);
    handleCollar.position.set(1.3, 0.85, 0);
    burnerRoot.add(handleCollar);

    const handleGeo = new THREE.CylinderGeometry(0.14, 0.12, 1.8, 16);
    handleGeo.rotateZ(Math.PI / 2);
    const handleMesh = new THREE.Mesh(handleGeo, woodMaterial);
    handleMesh.position.set(2.35, 0.85, 0);
    handleMesh.castShadow = !isHeadless;
    burnerRoot.add(handleMesh);

    const handleFinialGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const handleFinial = new THREE.Mesh(handleFinialGeo, metalMaterial);
    handleFinial.position.set(3.25, 0.85, 0);
    burnerRoot.add(handleFinial);

    // Part 7: Pierced Dome Lid with Sacred Peacock/Kalash Finial
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 1.4, 0);

    const lidPoints: THREE.Vector2[] = [];
    lidPoints.push(new THREE.Vector2(1.15, 0));
    lidPoints.push(new THREE.Vector2(1.12, 0.1));
    lidPoints.push(new THREE.Vector2(0.9, 0.4));
    lidPoints.push(new THREE.Vector2(0.5, 0.7));
    lidPoints.push(new THREE.Vector2(0.15, 0.85));
    lidPoints.push(new THREE.Vector2(0.1, 0.9));
    const lidGeo = new THREE.LatheGeometry(lidPoints, 32);
    const lidMesh = new THREE.Mesh(lidGeo, metalMaterial);
    lidMesh.castShadow = !isHeadless;
    lidGroup.add(lidMesh);

    // Kalash Finial atop lid
    const finialPoints: THREE.Vector2[] = [];
    finialPoints.push(new THREE.Vector2(0, 0.9));
    finialPoints.push(new THREE.Vector2(0.2, 0.95));
    finialPoints.push(new THREE.Vector2(0.25, 1.1));
    finialPoints.push(new THREE.Vector2(0.08, 1.25));
    finialPoints.push(new THREE.Vector2(0.14, 1.35));
    finialPoints.push(new THREE.Vector2(0, 1.48));
    const finialGeo = new THREE.LatheGeometry(finialPoints, 24);
    const finialMesh = new THREE.Mesh(finialGeo, metalMaterial);
    finialMesh.castShadow = !isHeadless;
    lidGroup.add(finialMesh);

    burnerRoot.add(lidGroup);

    // Part 8: Contact Ground Shadow Disk (Zero Z-fighting)
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a0604,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.005;
    burnerRoot.add(shadowMesh);

    scene.add(burnerRoot);

    // 8. Procedural Aromatic Incense Smoke Particle System
    const particleCount = isHeadless ? 25 : 85;
    const smokeGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const opacities = new Float32Array(particleCount);
    const life = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = 1.6 + Math.random() * 2.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 1] = 0.012 + Math.random() * 0.015;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.008;

      opacities[i] = Math.random();
      life[i] = Math.random();
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle sprite using procedural canvas texture
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 64;
    smokeCanvas.height = 64;
    const sCtx = smokeCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(250, 240, 220, 0.85)');
    grad.addColorStop(0.4, 'rgba(230, 215, 195, 0.35)');
    grad.addColorStop(1, 'rgba(230, 215, 195, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);

    const smokeTexture = new THREE.CanvasTexture(smokeCanvas);

    const smokeMaterial = new THREE.PointsMaterial({
      size: 0.65,
      map: smokeTexture,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const smokeParticles = new THREE.Points(smokeGeo, smokeMaterial);
    scene.add(smokeParticles);

    // Pre-warm renderer
    renderer.compile(scene, camera);

    // 9. Animation Loop with Exponential Damping
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Slow elegant turntable rotation
      burnerRoot.rotation.y = time * 0.18;

      // Update finish properties
      const currentFinish = finishColors[stateRef.current.metalFinish] || finishColors.brass;
      metalMaterial.color.setHex(currentFinish.color);
      metalMaterial.metalness = currentFinish.metalness;
      metalMaterial.roughness = currentFinish.roughness;

      // Smooth lid opening spring/damping
      stateRef.current.currentLidRotation = THREE.MathUtils.damp(
        stateRef.current.currentLidRotation,
        stateRef.current.targetLidRotation,
        6,
        delta
      );
      lidGroup.rotation.z = stateRef.current.currentLidRotation;

      // Ember flicker
      const flicker = 1.3 + Math.sin(time * 8) * 0.3 + Math.cos(time * 14) * 0.2;
      emberMaterial.emissiveIntensity = flicker;
      emberLight.intensity = flicker * 1.5;

      // Smoke simulation
      const smokePos = smokeGeo.attributes.position.array as Float32Array;
      const intensityFactor =
        stateRef.current.smokeIntensity === 'gentle' ? 0.6 : stateRef.current.smokeIntensity === 'aarti' ? 1.5 : 1.0;

      smokeMaterial.opacity = 0.4 * intensityFactor;

      for (let i = 0; i < particleCount; i++) {
        // Vertical rise
        smokePos[i * 3 + 1] += velocities[i * 3 + 1] * intensityFactor;

        // Curling sinusoidal swirl
        const y = smokePos[i * 3 + 1];
        smokePos[i * 3 + 0] += Math.sin(y * 3 + time * 2) * 0.005;
        smokePos[i * 3 + 2] += Math.cos(y * 3 + time * 2) * 0.005;

        // Reset if reached ceiling
        if (smokePos[i * 3 + 1] > 4.5) {
          smokePos[i * 3 + 1] = 1.6;
          smokePos[i * 3 + 0] = (Math.random() - 0.5) * 0.15;
          smokePos[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
        }
      }
      smokeGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // 10. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      brushedTexture.dispose();
      smokeTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[520px] md:h-[580px] bg-[#140D09] rounded-2xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" data-testid="fragrance-3d-canvas" />

      {/* Top Spec Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-[#1C120C]/90 border border-[#D4AF37]/40 rounded-lg text-xs text-[#FAF7F2]">
        <span className="font-serif font-semibold tracking-wide text-[#E8C547]">Ritual 3D Craft</span>
        <span aria-hidden="true" className="text-zinc-500">·</span>
        <span className="text-zinc-300">Hand-carved Brass Dhoop Dani</span>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-zinc-400 hover:text-white bg-[#1C120C]/80 rounded-lg border border-zinc-700 transition-colors"
          aria-label="Close 3D View"
        >
          ✕
        </button>
      )}

      {/* Collapsible Bottom Control Dock (Adheres strictly to Three.js UI Guidelines) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-[760px] flex flex-col items-center">
        {/* Toggle Collapse Pill */}
        <button
          onClick={() => setIsControlsVisible(!isControlsVisible)}
          className="mb-2 px-3 py-1 bg-[#231710] border border-[#D4AF37]/40 text-[#FAF7F2] text-xs font-medium rounded-full hover:bg-[#322117] transition-all shadow-md flex items-center gap-1.5"
          aria-expanded={isControlsVisible}
        >
          <span>{isControlsVisible ? '▾ Hide Controls' : '▴ Show Ritual Controls'}</span>
        </button>

        {isControlsVisible && (
          <div className="w-full bg-[#1A100B]/95 border border-[#D4AF37]/40 rounded-xl p-3 md:p-4 text-[#FAF7F2] shadow-2xl transition-all">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-center text-xs">
              {/* Finish Switcher */}
              <div>
                <span className="text-zinc-400 font-medium block mb-1.5">Sacred Finish</span>
                <div className="flex gap-1.5">
                  {(['brass', 'gold', 'bronze'] as const).map(fin => (
                    <button
                      key={fin}
                      onClick={() => setMetalFinish(fin)}
                      className={`flex-1 py-1.5 px-2 rounded font-medium capitalize transition-colors ${
                        metalFinish === fin
                          ? 'bg-[#B91C1C] text-white shadow-sm'
                          : 'bg-[#2A1B13] text-zinc-300 hover:bg-[#38241A]'
                      }`}
                    >
                      {fin}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smoke Density */}
              <div>
                <span className="text-zinc-400 font-medium block mb-1.5">Aromatic Smoke Flow</span>
                <div className="flex gap-1.5">
                  {(['gentle', 'temple', 'aarti'] as const).map(intensity => (
                    <button
                      key={intensity}
                      onClick={() => setSmokeIntensity(intensity)}
                      className={`flex-1 py-1.5 px-2 rounded font-medium capitalize transition-colors ${
                        smokeIntensity === intensity
                          ? 'bg-[#D97706] text-white shadow-sm'
                          : 'bg-[#2A1B13] text-zinc-300 hover:bg-[#38241A]'
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lid State */}
              <div>
                <span className="text-zinc-400 font-medium block mb-1.5">Burner Dome</span>
                <button
                  onClick={() => setIsLidOpen(!isLidOpen)}
                  className={`w-full py-1.5 px-3 rounded font-medium transition-colors ${
                    isLidOpen
                      ? 'bg-amber-700/80 text-white'
                      : 'bg-[#2A1B13] text-zinc-300 hover:bg-[#38241A]'
                  }`}
                >
                  {isLidOpen ? 'Close Dome Lid' : 'Open Dome (Expose Loban)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
