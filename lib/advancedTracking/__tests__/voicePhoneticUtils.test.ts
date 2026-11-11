import { soundsAlike } from '@/lib/advancedTracking/voicePhoneticUtils';

describe('soundsAlike', () => {
  it.each([
    ['geoff', 'jeff'],
    ['long', 'lang'],
    ['kris', 'chris'],
    ['steven', 'stephen'],
    ['katelyn', 'caitlin'],
    ['jo ramires', 'joe ramirez'],
  ])('treats %s and %s as the same spoken name', (heard, name) => {
    expect(soundsAlike(heard, name)).toBe(true);
  });

  it.each([
    ['mark', 'matt'],
    ['tate', 'take'],
    ['sarah', 'sam'],
  ])('keeps %s and %s apart', (heard, name) => {
    expect(soundsAlike(heard, name)).toBe(false);
  });

  it('does not match on a single sound, which filler words share with short names', () => {
    expect(soundsAlike('low', 'lee')).toBe(false);
  });
});
