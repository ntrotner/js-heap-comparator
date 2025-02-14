import {
  type NextBestMatchTracker,
} from '../types/index.js';

/*+
 * Returns the default value of the next best match tracker.
 */
export function getDefaultValueOfNextBestMatchTracker(): NextBestMatchTracker {
  return {
    100: new Map(),
    95: new Map(),
    90: new Map(),
    85: new Map(),
    80: new Map(),
    75: new Map(),
    70: new Map(),
    65: new Map(),
    60: new Map(),
    55: new Map(),
    50: new Map(),
    45: new Map(),
    40: new Map(),
    35: new Map(),
    30: new Map(),
    25: new Map(),
    20: new Map(),
    15: new Map(),
    10: new Map(),
    5: new Map(),
    0: new Map(),
  };
}

/**
 * Maps a number between 0 and 100 to the lower 5 of the interval.
 *
 *
 * @param input number between 100 and 0
 */
export function mapIntervalToNumber(input: number) {
  if (input === 100) {
    return '100';
  }

  if (input >= 95) {
    return '95';
  }

  if (input >= 90) {
    return '90';
  }

  if (input >= 85) {
    return '85';
  }

  if (input >= 80) {
    return '80';
  }

  if (input >= 75) {
    return '75';
  }

  if (input >= 70) {
    return '70';
  }

  if (input >= 65) {
    return '65';
  }

  if (input >= 60) {
    return '60';
  }

  if (input >= 55) {
    return '55';
  }

  if (input >= 50) {
    return '50';
  }

  if (input >= 45) {
    return '45';
  }

  if (input >= 40) {
    return '40';
  }

  if (input >= 35) {
    return '35';
  }

  if (input >= 30) {
    return '30';
  }

  if (input >= 25) {
    return '25';
  }

  if (input >= 20) {
    return '20';
  }

  if (input >= 15) {
    return '15';
  }

  if (input >= 10) {
    return '10';
  }

  if (input >= 5) {
    return '5';
  }

  return '0';
}
