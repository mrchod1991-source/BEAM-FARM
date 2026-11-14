import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../src/core/GameConfig';
import { CameraManager } from '../../src/engine/camera/CameraManager';
import { LightingManager } from '../../src/engine/lighting/LightingManager';
import { FishingState } from '../../src/systems/fishing/FishingState';
import { WaterPhysics } from '../../src/systems/physics/water/WaterPhysics';

describe('Underwater Fight Chase Camera & Subsurface Atmosphere', () => {
  const dockTip = DEFAULT_GAME_CONFIG.dockTipPosition;

  it('stays above the pier in IDLE/WAITING, auto-dives underwater during FIGHTING, and allows manual mid-fight override', () => {
    const camMgr = new CameraManager(1280, 720);
    const bobberPos = new THREE.Vector3(0, 0, 2);

    // 1. Settle in WAITING state above water
    for (let i = 0; i < 60; i++) {
      camMgr.update(1 / 60, i / 60, FishingState.WAITING, dockTip, bobberPos, 0, 0.15);
    }
    expect(camMgr.camera.position.y).toBeGreaterThan(2.0);
    expect(camMgr.getUnderwaterFactor(1.0)).toBe(0);
    expect(camMgr.getEffectivePreset(FishingState.WAITING)).toBe('angler');

    // 2. Fish hooks and runs underwater at (1.8, -1.35, 3.5) with lateral sprint velocity
    const fishPos = new THREE.Vector3(1.8, -1.35, 3.5);
    for (let i = 0; i < 90; i++) {
      const t = 1 + i / 60;
      camMgr.update(
        1 / 60,
        t,
        FishingState.FIGHTING,
        dockTip,
        fishPos,
        0,
        0.68,
        2.4,
        -0.1,
        -0.8
      );
    }

    const camPos = camMgr.camera.position;
    const bedY = WaterPhysics.terrainHeightAt(camPos.x, camPos.z);
    const surfY = WaterPhysics.waveHeightAt(camPos.x, camPos.z, 2.5);

    expect(camMgr.getEffectivePreset(FishingState.FIGHTING)).toBe('underwater');
    expect(camPos.y).toBeLessThan(surfY - 0.3);
    expect(camPos.y).toBeGreaterThan(bedY + 0.25);
    expect(camMgr.getUnderwaterFactor(2.5)).toBeGreaterThan(0.9);

    // 3. Player can manually override back to 'angler' pier view mid-fight if desired
    camMgr.setPreset('angler');
    expect(camMgr.getEffectivePreset(FishingState.FIGHTING)).toBe('angler');
    for (let i = 0; i < 90; i++) {
      const t = 2.5 + i / 60;
      camMgr.update(1 / 60, t, FishingState.FIGHTING, dockTip, fishPos, 0, 0.5);
    }
    expect(camMgr.camera.position.y).toBeGreaterThan(2.0);

    // 4. Player can also select 'underwater' anytime during WAITING to scout fish around the bait
    camMgr.setPreset('underwater');
    for (let i = 0; i < 90; i++) {
      const t = 4.0 + i / 60;
      camMgr.update(1 / 60, t, FishingState.WAITING, dockTip, bobberPos, 0, 0.1);
    }
    expect(camMgr.camera.position.y).toBeLessThan(-0.35);
    expect(camMgr.getUnderwaterFactor(5.5)).toBeGreaterThan(0.9);

    // 5. When fish is LANDED, camera smoothly pans back above the pier for trophy showcase
    for (let i = 0; i < 90; i++) {
      const t = 5.5 + i / 60;
      camMgr.update(1 / 60, t, FishingState.LANDED, dockTip, fishPos, 0, 0);
    }

    expect(camMgr.camera.position.y).toBeGreaterThan(2.0);
    expect(camMgr.getUnderwaterFactor(7.0)).toBe(0);
  });

  it('transitions LightingManager fog density and hides aerial rain streaks when submerged', () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xbbe0f2, 0.0085);
    const lighting = new LightingManager(scene, true);

    lighting.applyWeather('rain');
    expect((scene.fog as THREE.FogExp2).density).toBeCloseTo(0.0185, 4);

    // Submerge camera completely
    lighting.setUnderwaterFactor(1.0);
    expect((scene.fog as THREE.FogExp2).density).toBeCloseTo(0.044, 4);

    // Resurface camera above waves
    lighting.setUnderwaterFactor(0.0);
    expect((scene.fog as THREE.FogExp2).density).toBeCloseTo(0.0185, 4);
  });
});
