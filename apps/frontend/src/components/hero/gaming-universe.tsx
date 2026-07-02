'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Living "Gaming Universe" — an original WebGL scene (raw three.js) that powers
 * the hero. Multiple layers (particle field, floating casino objects via
 * instancing, light beams, drifting vehicles) over a vivid animated gradient.
 * Color "moods" rotate every ~38s and crossfade. Reacts to cursor + scroll.
 *
 * Performance: capped DPR, InstancedMesh + Points (few draw calls), pauses when
 * offscreen or tab-hidden, fewer instances on small screens, and renders a
 * single static frame under prefers-reduced-motion. Disposes everything on
 * unmount. The canvas is transparent so the gradient backdrop shows through.
 */

const MOODS: { a: string; b: string; c: string }[] = [
  { a: '#7c3aed', b: '#22d3ee', c: '#ec4899' }, // cyber casino
  { a: '#2563eb', b: '#06b6d4', c: '#a855f7' }, // space arena
  { a: '#db2777', b: '#f59e0b', c: '#8b5cf6' }, // neon festival
  { a: '#0ea5e9', b: '#14b8a6', c: '#6366f1' }, // tokyo streets
  { a: '#6d28d9', b: '#ec4899', c: '#f59e0b' }, // formula track
  { a: '#0891b2', b: '#7c3aed', c: '#22d3ee' }, // night drift
];

export default function GamingUniverse() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const small = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);

    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
    camera.position.set(0, 0, 26);

    const world = new THREE.Group();
    scene.add(world);

    // ---- Layer 1: particle field --------------------------------------------
    const PCOUNT = small ? 1400 : 3600;
    const pPos = new Float32Array(PCOUNT * 3);
    const pCol = new Float32Array(PCOUNT * 3);
    const pSpd = new Float32Array(PCOUNT);
    for (let i = 0; i < PCOUNT; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 120;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 90 - 10;
      pSpd[i] = 0.02 + Math.random() * 0.06;
      pCol[i * 3] = 1;
      pCol[i * 3 + 1] = 1;
      pCol[i * 3 + 2] = 1;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({
      size: small ? 0.32 : 0.26,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    world.add(points);

    // ---- Layer 2: floating casino objects (instanced) -----------------------
    const dummy = new THREE.Object3D();
    type Inst = { mesh: THREE.InstancedMesh; data: { rot: THREE.Vector3; spin: THREE.Vector3; vy: number }[] };
    const insts: Inst[] = [];

    const makeInst = (geo: THREE.BufferGeometry, count: number) => {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 });
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const color = new THREE.Color();
      const data: Inst['data'] = [];
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50 - 6,
        );
        const rot = new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        const s = 0.7 + Math.random() * 1.5;
        dummy.position.copy(pos);
        dummy.rotation.set(rot.x, rot.y, rot.z);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        color.setHSL(Math.random(), 0.8, 0.62);
        mesh.setColorAt(i, color);
        data.push({ rot, spin: new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01), vy: 0.01 + Math.random() * 0.03 });
        // store position back into matrix via dummy reuse on update
        (data[i] as unknown as { pos: THREE.Vector3 }).pos = pos;
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      world.add(mesh);
      insts.push({ mesh, data });
    };

    const per = small ? 10 : 20;
    makeInst(new THREE.BoxGeometry(1, 1, 1), per); // dice
    makeInst(new THREE.CylinderGeometry(0.9, 0.9, 0.18, 20), per); // chips
    makeInst(new THREE.BoxGeometry(0.8, 1.2, 0.04), per); // cards
    makeInst(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 24), small ? 8 : 16); // coins

    // ---- Layer 3: drifting vehicles (simple elongated shapes) ---------------
    const vehicles: { mesh: THREE.Mesh; speed: number; dir: number }[] = [];
    const vehColors = ['#22d3ee', '#ec4899', '#a855f7', '#f59e0b'];
    for (let i = 0; i < (small ? 2 : 4); i++) {
      const g = new THREE.CapsuleGeometry(0.5, 3.2, 4, 8);
      const m = new THREE.MeshBasicMaterial({ color: vehColors[i % vehColors.length], transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.z = Math.PI / 2;
      const dir = i % 2 === 0 ? 1 : -1;
      mesh.position.set(dir * -55, -12 + i * 7, -8 - i * 3);
      mesh.scale.setScalar(1 + i * 0.2);
      scene.add(mesh);
      vehicles.push({ mesh, speed: 0.08 + Math.random() * 0.08, dir });
    }

    // ---- Layer 4: light beams (additive planes) -----------------------------
    const beams: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.PlaneGeometry(2.2, 70);
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set((i - 1) * 22, 0, -28);
      mesh.rotation.z = (i - 1) * 0.25;
      scene.add(mesh);
      beams.push(mesh);
    }

    // ---- Color mood state ----------------------------------------------------
    const colA = new THREE.Color(MOODS[0]!.a);
    const colB = new THREE.Color(MOODS[0]!.b);
    const colC = new THREE.Color(MOODS[0]!.c);
    const tgtA = colA.clone();
    const tgtB = colB.clone();
    const tgtC = colC.clone();
    let moodIdx = 0;

    const applyMoodColors = () => {
      // particles tint toward A/B
      const arr = pGeo.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < PCOUNT; i++) {
        const mix = i % 3;
        const col = mix === 0 ? colA : mix === 1 ? colB : colC;
        arr.setXYZ(i, col.r * 0.6 + 0.4, col.g * 0.6 + 0.4, col.b * 0.6 + 0.4);
      }
      arr.needsUpdate = true;
      const beamCols = [colA, colB, colC];
      beams.forEach((beam, i) => {
        (beam.material as THREE.MeshBasicMaterial).color.copy(beamCols[i] ?? colA);
      });
    };
    applyMoodColors();

    // pointer + scroll parallax
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let scrollY = 0;
    const onScroll = () => {
      scrollY = window.scrollY;
    };

    const resize = () => {
      width = mount.clientWidth || window.innerWidth;
      height = mount.clientHeight || 600;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    let raf = 0;
    let running = true;
    let t = 0;
    let moodTimer = 0;

    const tmpMat = new THREE.Matrix4();
    const tmpS = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpP = new THREE.Vector3();

    const frame = () => {
      t += 0.016;
      moodTimer += 0.016;

      // rotate mood every ~38s
      if (moodTimer > 38) {
        moodTimer = 0;
        moodIdx = (moodIdx + 1) % MOODS.length;
        tgtA.set(MOODS[moodIdx]!.a);
        tgtB.set(MOODS[moodIdx]!.b);
        tgtC.set(MOODS[moodIdx]!.c);
      }
      // lerp colors smoothly; reapply occasionally
      colA.lerp(tgtA, 0.01);
      colB.lerp(tgtB, 0.01);
      colC.lerp(tgtC, 0.01);
      if (Math.floor(t * 60) % 20 === 0) applyMoodColors();

      // particle drift
      const ppos = pGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < PCOUNT; i++) {
        let y = ppos.getY(i) + pSpd[i]!;
        if (y > 40) y = -40;
        ppos.setY(i, y);
      }
      ppos.needsUpdate = true;
      points.rotation.y += 0.0006;

      // instanced objects float + spin
      for (const inst of insts) {
        for (let i = 0; i < inst.data.length; i++) {
          const d = inst.data[i]!;
          const pos = (d as unknown as { pos: THREE.Vector3 }).pos;
          pos.y += d.vy;
          if (pos.y > 26) pos.y = -26;
          d.rot.x += d.spin.x;
          d.rot.y += d.spin.y;
          d.rot.z += d.spin.z;
          dummy.position.copy(pos);
          dummy.rotation.set(d.rot.x, d.rot.y, d.rot.z);
          inst.mesh.getMatrixAt(i, tmpMat);
          tmpMat.decompose(tmpP, tmpQ, tmpS);
          dummy.scale.copy(tmpS);
          dummy.updateMatrix();
          inst.mesh.setMatrixAt(i, dummy.matrix);
        }
        inst.mesh.instanceMatrix.needsUpdate = true;
      }

      // vehicles cross the screen
      for (const v of vehicles) {
        v.mesh.position.x += v.speed * v.dir;
        if (v.dir > 0 && v.mesh.position.x > 60) v.mesh.position.x = -60;
        if (v.dir < 0 && v.mesh.position.x < -60) v.mesh.position.x = 60;
      }

      // beams sway
      beams.forEach((b, i) => {
        b.rotation.z = (i - 1) * 0.25 + Math.sin(t * 0.3 + i) * 0.08;
      });

      // parallax
      cur.x += (target.x - cur.x) * 0.04;
      cur.y += (target.y - cur.y) * 0.04;
      world.rotation.y = cur.x * 0.25;
      world.rotation.x = -cur.y * 0.15;
      camera.position.y = -scrollY * 0.004;

      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(frame);
    };

    window.addEventListener('resize', resize);

    if (reduce) {
      renderer.render(scene, camera);
    } else {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('scroll', onScroll, { passive: true });
      const io = new IntersectionObserver(
        ([entry]) => {
          const visible = entry?.isIntersecting ?? true;
          if (visible && !running) {
            running = true;
            raf = requestAnimationFrame(frame);
          } else if (!visible && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0 },
      );
      io.observe(renderer.domElement);
      const onVis = () => {
        if (document.hidden) {
          running = false;
          cancelAnimationFrame(raf);
        } else if (!running) {
          running = true;
          raf = requestAnimationFrame(frame);
        }
      };
      document.addEventListener('visibilitychange', onVis);
      raf = requestAnimationFrame(frame);

      return () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('visibilitychange', onVis);
        io.disconnect();
        disposeAll();
      };
    }

    function disposeAll() {
      pGeo.dispose();
      pMat.dispose();
      insts.forEach((i) => {
        i.mesh.geometry.dispose();
        (i.mesh.material as THREE.Material).dispose();
      });
      vehicles.forEach((v) => {
        v.mesh.geometry.dispose();
        (v.mesh.material as THREE.Material).dispose();
      });
      beams.forEach((b) => {
        b.geometry.dispose();
        (b.material as THREE.Material).dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    }

    return () => {
      window.removeEventListener('resize', resize);
      disposeAll();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
