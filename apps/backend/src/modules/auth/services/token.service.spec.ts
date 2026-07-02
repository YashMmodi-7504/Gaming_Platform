import { durationToSeconds } from './token.service';

describe('durationToSeconds', () => {
  it('parses seconds, minutes, hours, and days', () => {
    expect(durationToSeconds('30s')).toBe(30);
    expect(durationToSeconds('15m')).toBe(900);
    expect(durationToSeconds('2h')).toBe(7200);
    expect(durationToSeconds('7d')).toBe(604800);
  });

  it('tolerates surrounding whitespace', () => {
    expect(durationToSeconds(' 1d ')).toBe(86400);
  });

  it('falls back to 15 minutes on malformed input', () => {
    expect(durationToSeconds('not-a-duration')).toBe(900);
  });
});
