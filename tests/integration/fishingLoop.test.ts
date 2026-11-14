import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AudioSystem } from '../../src/systems/audio/AudioSystem';
import { EquipmentManager } from '../../src/systems/equipment/EquipmentManager';
import { FishAIState } from '../../src/systems/fish/ai/FishStateMachine';
import { FishManager } from '../../src/systems/fish/FishManager';
import { FishingState } from '../../src/systems/fishing/FishingState';
import { FishingSystem } from '../../src/systems/fishing/FishingSystem';
import { PhysicsWorld } from '../../src/systems/physics/PhysicsWorld';

describe('End-to-End Fishing Gameplay Integration', () => {
  it('completes cast -> water hit -> waiting -> fish strike -> hook -> fight -> landing -> result', () => {
    const physics = new PhysicsWorld();
    const fishManager = new FishManager(4);
    fishManager.populateInitialSchool(['largemouth_bass']);

    const equipment = new EquipmentManager({
      rodId: 'rod_titan_master',
      reelId: 'reel_magnum_6000',
      lineId: 'line_braid_24kg',
      baitId: 'bait_golden_spoon',
    });
    const audio = new AudioSystem();
    audio.setMuted(true);

    let splashes = 0;
    let outcomeRecorded: string | null = null;

    const dockTip = { x: 0, y: 1.15, z: 14.2 };
    const rodTip = new THREE.Vector3(0, 2.5, 12.2);

    const fishing = new FishingSystem(dockTip, physics, fishManager, equipment, audio, {
      onWaterSplash: () => {
        splashes++;
      },
      onCastRecorded: () => {},
      onOutcomeReached: (outcome) => {
        outcomeRecorded = outcome;
      },
    });

    expect(fishing.session.getState()).toBe(FishingState.IDLE);

    // 1. Charge and launch cast
    fishing.controller.beginCastCharge();
    fishing.fixedUpdate(0.25, 0.25, rodTip);
    fishing.controller.releaseCastCharge();
    expect(fishing.session.getState()).toBe(FishingState.CASTING);

    // 2. Step fixed physics until projectile impacts lake water
    let elapsed = 0.25;
    for (let i = 0; i < 180 && fishing.session.getState() === FishingState.CASTING; i++) {
      elapsed += 1 / 60;
      fishing.fixedUpdate(1 / 60, elapsed, rodTip);
    }
    expect(fishing.session.getState()).toBe(FishingState.WAITING);
    expect(splashes).toBeGreaterThan(0);

    // 3. Simulate a lake fish striking the bait
    const firstFish = Array.from(fishManager.getAllFish())[0];
    expect(firstFish).toBeDefined();
    const baitSignal = fishing.getBaitSignal();
    baitSignal.claimedByFishId = firstFish.id;
    firstFish.position.copy(fishing.session.bobberPosition).setY(-0.5);
    firstFish.brain.fsm.transitionTo(FishAIState.APPROACH_BAIT);
    firstFish.brain.fsm.transitionTo(FishAIState.STRIKE_BITE);

    elapsed += 1 / 60;
    fishing.fixedUpdate(1 / 60, elapsed, rodTip);
    expect(fishing.session.getState()).toBe(FishingState.BITE);

    // 4. Player triggers hookset strike
    fishing.controller.triggerStrike();
    expect(fishing.session.getState()).toBe(FishingState.HOOKED);

    // Advance past 0.28s hookset into active fight
    for (let i = 0; i < 25; i++) {
      elapsed += 1 / 60;
      fishManager.update(1 / 60, rodTip, baitSignal, firstFish.id, fishing.session.lineTensionN);
      fishing.fixedUpdate(1 / 60, elapsed, rodTip);
    }
    expect(fishing.session.getState()).toBe(FishingState.FIGHTING);

    // 5. Reel fish steadily to pier landing zone
    fishing.controller.setReeling(true);
    firstFish.stamina = 5;
    for (let i = 0; i < 600 && fishing.session.getState() !== FishingState.LANDED; i++) {
      elapsed += 1 / 60;
      fishManager.update(1 / 60, rodTip, baitSignal, firstFish.id, fishing.session.lineTensionN);
      fishing.fixedUpdate(1 / 60, elapsed, rodTip);
    }

    expect(outcomeRecorded).toBe('landed');
    expect(fishing.session.pendingCatchRecord).not.toBeNull();

    // Advance 0.6s from LANDED -> RESULT -> IDLE
    for (let i = 0; i < 40; i++) {
      elapsed += 1 / 60;
      fishing.fixedUpdate(1 / 60, elapsed, rodTip);
    }
    expect(fishing.session.getState()).toBe(FishingState.RESULT);
    fishing.acknowledgeOutcomeAndReset();
    expect(fishing.session.getState()).toBe(FishingState.IDLE);
  });
});
