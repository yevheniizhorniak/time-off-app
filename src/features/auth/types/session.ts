import { trimLowerCase } from '../../../trim-lower-case';
import { isRecord } from '../../../type-safety/is-record';

export type Session = { role: 'employee'; name: string; employeeKey: string } | { role: 'supervisor' };

export function isSession(value: unknown): value is Session {
  if (!isRecord(value)) return false;
  return (
    value.role === 'supervisor' ||
    (value.role === 'employee' &&
      typeof value.name === 'string' &&
      value.name.trim().length > 0 &&
      value.employeeKey === trimLowerCase(value.name))
  );
}
