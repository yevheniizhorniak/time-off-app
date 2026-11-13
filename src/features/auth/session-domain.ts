export type Session = { role: 'employee'; name: string; employeeKey: string } | { role: 'supervisor' };

export function employeeKey(name: string): string {
  return name.trim().toLowerCase();
}
