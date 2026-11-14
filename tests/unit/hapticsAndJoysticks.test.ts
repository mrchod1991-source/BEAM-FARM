import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HapticsManager } from '../../src/platform/HapticsManager';
import { AudioSystem } from '../../src/systems/audio/AudioSystem';
import { EquipmentManager } from '../../src/systems/equipment/EquipmentManager';
import { FishAIState } from '../../src/systems/fish/ai/FishStateMachine';
import { FishManager } from '../../src/systems/fish/FishManager';
import { FishingState } from '../../src/systems/fishing/FishingState';
import { FishingSystem } from '../../src/systems/fishing/FishingSystem';
import { PhysicsWorld } from '../../src/systems/physics/PhysicsWorld';

describe('Mobile Dual Joysticks, Real Haptics & Rain/Thunder Audio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers real navigator.vibrate patterns during bite, hookset, and fish fighting', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    const haptics = new HapticsManager();
    haptics.pulseBiteAlert();
    expect(vibrateMock).toHaveBeenCalledWith([55, 38, 95]);
    expect(haptics.getRumbleIntensity()).toBeGreaterThan(0.7);

    vibrateMock.mockClear();
    haptics.updateFightRumble(0.88, true, true, 1000);
    expect(vibrateMock).toHaveBeenCalledWith([58, 24, 48]);

    // Throttled within 135ms window
    vibrateMock.mockClear();
    haptics.updateFightRumble(0.88, true, true, 1050);
    expect(vibrateMock).not.toHaveBeenCalled();

    // Disabling haptics immediately stops motor vibration
    haptics.setEnabled(false);
    expect(vibrateMock).toHaveBeenCalledWith(0);
    expect(haptics.getRumbleIntensity()).toBe(0);
  });

  it('steers cast, charges/launches via Right Joystick, strikes via Left Joystick pull-up, and counter-pulls fish', () => {
    const dockTip = { x: 0, y: 1.15, z: 14.2 };
    const physics = new PhysicsWorld();
    const fishMgr = new FishManager(6);
    fishMgr.populateInitialSchool(['largemouth_bass']);
    const equip = new EquipmentManager();
    const audio = new AudioSystem();
    const haptics = new HapticsManager();

    const sys = new FishingSystem(
      dockTip,
      physics,
      fishMgr,
      equip,
      audio,
      {
        onWaterSplash: () => {},
        onCastRecorded: () => {},
        onOutcomeReached: () => {},
      },
      haptics
    );

    // 1. Left Joystick steers aim in IDLE
    sys.controller.applyLeftJoystick(0.8, 0, 0.25);
    expect(sys.session.aimAngleDeg).toBeGreaterThan(5);

    // 2. Right Joystick holds to charge cast power, then releases to cast
    sys.controller.applyRightJoystick(0, 0.75, 0, true);
    expect(sys.session.isChargingCast).toBe(true);
    sys.fixedUpdate(0.25, 0.25, new THREE.Vector3(0, 2.5, 12));
    expect(sys.session.castPower).toBeGreaterThan(0.3);

    sys.controller.applyRightJoystick(0, 0, 0, false);
    expect(sys.session.getState()).toBe(FishingState.CASTING);

    // Advance until bobber lands on water -> WAITING
    const rodTip = new THREE.Vector3(0, 2.5, 12);
    for (let i = 0; i < 180 && sys.session.getState() === FishingState.CASTING; i++) {
      sys.fixedUpdate(1 / 60, i / 60, rodTip);
    }
    expect(sys.session.getState()).toBe(FishingState.WAITING);

    // Simulate a fish biting -> BITE
    const targetFish = Array.from(fishMgr.getAllFish())[0]!;
    sys.getBaitSignal().claimedByFishId = targetFish.id;
    targetFish.brain.fsm.transitionTo(FishAIState.APPROACH_BAIT);
    targetFish.brain.fsm.transitionTo(FishAIState.NIBBLE);
    targetFish.brain.fsm.transitionTo(FishAIState.STRIKE_BITE);
    sys.fixedUpdate(1 / 60, 4.0, rodTip);
    expect(sys.session.getState()).toBe(FishingState.BITE);

    // 3. Yanking Left Joystick UP (y = -0.85) triggers Strike -> HOOKED -> FIGHTING without artificial snap spike even when fish dives deeper
    sys.controller.applyLeftJoystick(0, -0.85, 1 / 60);
    expect(sys.session.getState()).toBe(FishingState.HOOKED);

    targetFish.position.y = -1.85;
    targetFish.position.z -= 1.2;
    sys.fixedUpdate(0.35, 4.35, rodTip);
    expect(sys.session.getState()).toBe(FishingState.FIGHTING);

    // 4. Fish swims right (+x), player pulls Left Joystick left (-x) + cranks Right Joystick
    targetFish.velocity.set(1.2, 0, -0.5);
    sys.controller.applyLeftJoystick(-0.9, -0.5, 1 / 60);
    sys.controller.applyRightJoystick(0.6, 0.4, 6.2, true);
    expect(sys.session.isReelingInput).toBe(true);
    expect(sys.session.reelSpeedMultiplier).toBeGreaterThan(1.0);

    const staminaBefore = targetFish.stamina;
    sys.fixedUpdate(0.1, 4.5, rodTip);
    expect(sys.session.getState()).toBe(FishingState.FIGHTING);
    expect(sys.session.isCounterPulling).toBe(true);
    expect(targetFish.stamina).toBeLessThan(staminaBefore);

    // 5. Resetting session clears any held joystick/reel latches so next cast never auto-reels
    sys.retrieveToIdle();
    expect(sys.session.isReelingInput).toBe(false);
    expect(sys.session.rodPullX).toBe(0);
    expect(sys.session.reelSpeedMultiplier).toBe(1.0);
  });

  it('switches AudioSystem weather ambience to rain and cleans up cleanly', () => {
    const audio = new AudioSystem();
    expect(audio.getWeatherAmbience()).toBe('clear');

    audio.setWeatherAmbience('rain');
    expect(audio.getWeatherAmbience()).toBe('rain');
    audio.updateAmbience(0.5);

    audio.setWeatherAmbience('sunset');
    expect(audio.getWeatherAmbience()).toBe('sunset');
    audio.dispose();
  });
});
