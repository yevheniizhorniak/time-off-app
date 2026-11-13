import { expect, test } from 'vitest';

import { trimLowerCase } from './trim-lower-case';

test('trims whitespace and converts text to lowercase', () => {
  expect(trimLowerCase('  ALex  ')).toBe('alex');
});
