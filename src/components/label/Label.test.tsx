import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { ToaLabel } from './Label';

test('associates its content with the input through htmlFor', () => {
  render(
    <>
      <ToaLabel htmlFor="employee-name" text="Employee name" />
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
      <ToaLabel htmlFor="employee-name" required text="Employee name" />
      <input id="employee-name" required type="text" />
    </>,
  );

  expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('textbox', { name: 'Employee name' })).toBeRequired();
});
