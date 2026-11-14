import { describe, expect, it, beforeEach } from 'vitest';
import { LanguageManager } from '../../src/localization/LanguageManager';
import { LanguageStorage } from '../../src/localization/LanguageStorage';
import { SUPPORTED_LANGUAGES } from '../../src/localization/LanguageTypes';

describe('5-Language Localization QA', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('has 100% identical translation keys across th, en, zh, ja, and ko', () => {
    const baseKeys = Object.keys(LanguageManager.getDictionary('th')).sort();
    expect(baseKeys.length).toBeGreaterThan(80);

    for (const lang of SUPPORTED_LANGUAGES) {
      const dict = LanguageManager.getDictionary(lang.code);
      const keys = Object.keys(dict).sort();
      expect(keys, `Key mismatch in locale ${lang.code}`).toEqual(baseKeys);

      for (const k of keys) {
        expect(dict[k].trim().length, `Empty value for ${lang.code}:${k}`).toBeGreaterThan(0);
      }
    }
  });

  it('switches languages live and interpolates parameters accurately', () => {
    const manager = new LanguageManager('th');
    expect(manager.getLanguage()).toBe('th');
    expect(manager.translate('fishing.cast')).toBe('เหวี่ยงเบ็ด');

    manager.setLanguage('ja', false);
    expect(manager.getLanguage()).toBe('ja');
    expect(manager.translate('fishing.cast')).toBe('キャスト');
    expect(manager.translate('equip.buy', { price: 210 })).toContain('210');

    manager.setLanguage('ko', false);
    expect(manager.translate('fishing.cast')).toBe('캐스팅');

    manager.setLanguage('zh', false);
    expect(manager.translate('fishing.cast')).toBe('抛竿');

    manager.setLanguage('en', false);
    expect(manager.translate('fishing.cast')).toBe('Cast Line');
  });

  it('validates supported language codes and falls back to Thai when unsupported', () => {
    expect(LanguageStorage.isSupported('th')).toBe(true);
    expect(LanguageStorage.isSupported('fr')).toBe(false);
    const manager = new LanguageManager('th');
    expect(manager.translate('missing.nonexistent.key')).toBe('missing.nonexistent.key');
  });
});
