import { expect, test } from 'vitest';

import { employeeKey } from './session-domain';

test('normalizes employee names into identity keys', () => {
  expect(employeeKey('  ALex  ')).toBe('alex');
});
