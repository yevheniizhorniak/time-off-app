import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import Label from './Label';

test('associates its content with the input through htmlFor', () => {
  render(
    <>
      <Label htmlFor="employee-name">Employee name</Label>
      <input id="employee-name" type="text" />
    </>,
  );

  const input = screen.getByRole('textbox', { name: 'Employee name' });
  expect(screen.getByLabelText('Employee name')).toBe(input);
  expect(input).not.toBeRequired();
});

test('keeps the required marker out of the input accessible name', () => {
  render(
    <>
      <Label htmlFor="employee-name" required>
        Employee name
      </Label>
      <input id="employee-name" required type="text" />
    </>,
  );

  expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('textbox', { name: 'Employee name' })).toBeRequired();
});
