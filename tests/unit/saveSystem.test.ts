import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IndexedDBStorage } from '../../src/storage/IndexedDBStorage';
import { SaveManager } from '../../src/storage/SaveManager';
import { SaveMigration } from '../../src/storage/SaveMigration';
import { SaveValidator } from '../../src/storage/SaveValidator';
import { CURRENT_SAVE_VERSION, PRIMARY_SAVE_SLOT } from '../../src/storage/SaveVersion';

describe('IndexedDB Save, Validation & Migration System', () => {
  it('migrates v1 legacy save data to current schema version while preserving progression', () => {
    const legacyV1 = {
      version: 1,
      language: 'ja',
      level: 4,
      xp: 120,
      coins: 680,
      inventory: [],
      ownedEquipmentIds: ['rod_carbon_pro'],
    };

    const migrated = SaveMigration.migrate(legacyV1);
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.language).toBe('ja');
    expect(migrated.level).toBe(4);
    expect(migrated.coins).toBe(680);
    expect(migrated.ownedEquipmentIds).toContain('rod_fiberglass');
    expect(migrated.ownedEquipmentIds).toContain('rod_carbon_pro');
    expect(migrated.unlockedLocations).toContain('emerald_pine_lake');
    expect(SaveValidator.isValid(migrated)).toBe(true);
  });

  it('persists and reloads player save data via IndexedDB', async () => {
    const storage = new IndexedDBStorage();
    const manager = new SaveManager(storage);
    await manager.load();

    manager.update((draft) => {
      draft.coins = 999;
      draft.level = 3;
      draft.language = 'ko';
      draft.settings.cameraPreset = 'underwater';
    });
    await manager.flushPending();

    const rawStored = await storage.get(PRIMARY_SAVE_SLOT);
    expect(SaveValidator.isValid(rawStored)).toBe(true);

    const secondManager = new SaveManager(storage);
    const reloaded = await secondManager.load();
    expect(reloaded.coins).toBe(999);
    expect(reloaded.level).toBe(3);
    expect(reloaded.language).toBe('ko');
    expect(reloaded.settings.cameraPreset).toBe('underwater');

    manager.dispose();
    secondManager.dispose();
  });
});
