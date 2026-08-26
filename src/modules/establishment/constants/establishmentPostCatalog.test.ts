import { describe, expect, it } from 'vitest';
import { ESTABLISHMENT_POST_OPTIONS } from './establishmentPostCatalog';

describe('establishment post catalogue', () => {
  it('contains the 68 source posts in source order', () => {
    expect(ESTABLISHMENT_POST_OPTIONS).toHaveLength(68);
    expect(ESTABLISHMENT_POST_OPTIONS[0].name).toBe('પટાવાળા વર્ગ-૪');
    expect(ESTABLISHMENT_POST_OPTIONS[ESTABLISHMENT_POST_OPTIONS.length - 1].name).toBe('હેચરી આસીસ્ટન્ટ');
    expect(ESTABLISHMENT_POST_OPTIONS.some((option) => option.name === 'Headquarter')).toBe(false);
  });

  it('keeps pay reference data with each source post', () => {
    const veterinaryOfficer = ESTABLISHMENT_POST_OPTIONS.find(
      (option) => option.name === 'પશુચિકિત્સા અધિકારી'
    );
    expect(veterinaryOfficer).toMatchObject({ payLevel: 'Level 8', minPay: 44900 });
  });
});
