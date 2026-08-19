import { describe, it, expect } from 'vitest';
import { gujaratiUnicodeRecoveryService } from './gujaratiUnicodeRecovery.service';

describe('GujaratiUnicodeRecoveryService', () => {
  it('correctly reorders Indic pre-base short-i matra (િવભાગીય -> વિભાગીય)', () => {
    // િવભાગીય has \u0ABF before \u0AB5
    const corrupted = 'િવભાગીય';
    const recovered = gujaratiUnicodeRecoveryService.reorderIndicMatras(corrupted);
    expect(recovered).toBe('વિભાગીય');
  });

  it('correctly reorders short-i matra on conjuncts (િસ્થતિ -> સ્થિતિ)', () => {
    const corrupted = 'િસ્થતિ';
    const recovered = gujaratiUnicodeRecoveryService.reorderIndicMatras(corrupted);
    expect(recovered).toBe('સ્થિતિ');
  });

  it('correctly decodes legacy font glyphs (કÖપાઉÑડ -> કમ્પાઉન્ડ)', () => {
    const corrupted = 'કÖપાઉÑડ';
    const recovered = gujaratiUnicodeRecoveryService.decodeLegacyFontGlyphs(corrupted);
    expect(recovered).toBe('કમ્પાઉન્ડ');
  });

  it('correctly decodes legacy font glyphs (ઈવેØયુએશન -> ઈવેલ્યુએશન)', () => {
    const corrupted = 'ઈવેØયુએશન';
    const recovered = gujaratiUnicodeRecoveryService.decodeLegacyFontGlyphs(corrupted);
    expect(recovered).toBe('ઈવેલ્યુએશન');
  });

  it('accurately assesses text quality and marks corruption', () => {
    const clean = 'ગુજરાત સરકાર નાણાં વિભાગ';
    const qualityClean = gujaratiUnicodeRecoveryService.assessTextQuality(clean);
    expect(qualityClean.valid).toBe(true);
    expect(qualityClean.needsRecovery).toBe(false);

    const corrupted = 'િવભાગીય કÖપાઉÑડ ઈવેØયુએશન';
    const qualityCorrupted = gujaratiUnicodeRecoveryService.assessTextQuality(corrupted);
    expect(qualityCorrupted.valid).toBe(false);
    expect(qualityCorrupted.needsRecovery).toBe(true);
    expect(qualityCorrupted.issues.length).toBeGreaterThan(0);
  });

  it('runs complete recovery pipeline on mixed document text', () => {
    const corruptedText = 'િવભાગીય કÖપાઉÑડ ઈવેØયુએશન િસ્થતિ';
    const result = gujaratiUnicodeRecoveryService.recoverText(corruptedText);
    expect(result.wasRecovered).toBe(true);
    expect(result.text).toBe('વિભાગીય કમ્પાઉન્ડ ઈવેલ્યુએશન સ્થિતિ');
  });
});
