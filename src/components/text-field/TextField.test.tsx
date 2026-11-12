import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { expect, test, vi } from 'vitest';

import TextField from './TextField';

test('supports native date fields and date bounds', () => {
  const { rerender } = render(
    <TextField
      label="Start date"
      type="date"
      min="2026-11-12"
      max="2026-12-31"
      value="2026-11-11"
      onChange={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('Start date')).toBeInvalid();
  rerender(
    <TextField
      label="Start date"
      type="date"
      min="2026-11-12"
      max="2026-12-31"
      value="2026-11-12"
      onChange={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('Start date')).toBeValid();
});

test('forwards native changes and keeps the value controlled by its parent', () => {
  const onChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => event.currentTarget.value);
  const { rerender } = render(<TextField label="Employee name" onChange={onChange} value="" />);
  const control = screen.getByRole('textbox', { name: 'Employee name' });

  fireEvent.change(control, { target: { value: 'Alex Morgan' } });

  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange).toHaveReturnedWith('Alex Morgan');
  expect(control).toHaveValue('');

  rerender(<TextField label="Employee name" onChange={onChange} value="Alex Morgan" />);
  expect(control).toHaveValue('Alex Morgan');
});

test('associates labels with unique, stable IDs and respects an explicit ID', () => {
  const fields = () => (
    <>
      <TextField label="First" onChange={vi.fn()} value="" />
      <TextField label="Second" onChange={vi.fn()} value="" />
      <TextField id="custom-text-field" label="Custom" onChange={vi.fn()} value="" />
    </>
  );
  const { rerender } = render(fields());
  const first = screen.getByLabelText('First');
  const second = screen.getByLabelText('Second');
  const firstId = first.id;

  expect(firstId).not.toBe('');
  expect(second.id).not.toBe(firstId);
  expect(screen.getByLabelText('Custom')).toHaveAttribute('id', 'custom-text-field');
  rerender(fields());
  expect(screen.getByLabelText('First')).toHaveAttribute('id', firstId);
});

test('associates validation feedback and removes stale errors', () => {
  const { rerender } = render(
    <TextField error="This field needs attention." label="Employee name" onChange={vi.fn()} value="" />,
  );
  const control = screen.getByRole('textbox', { name: 'Employee name' });

  expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(control).toHaveAccessibleDescription('This field needs attention.');
  expect(control).toHaveAttribute('aria-describedby', screen.getByText('This field needs attention.').id);

  rerender(<TextField label="Employee name" onChange={vi.fn()} value="" />);
  expect(control).not.toHaveAttribute('aria-invalid');
  expect(control).not.toHaveAttribute('aria-describedby');
  expect(screen.queryByText('This field needs attention.')).not.toBeInTheDocument();
});

test('supports required validation and native form submission', () => {
  const { container, rerender } = render(
    <form>
      <TextField label="Employee name" name="field" onChange={vi.fn()} required value="" />
    </form>,
  );
  const control = screen.getByRole('textbox', { name: 'Employee name' });

  expect(control).toHaveAccessibleName('Employee name');
  expect(control).toBeRequired();
  expect(control).toBeInvalid();

  rerender(
    <form>
      <TextField label="Employee name" name="field" onChange={vi.fn()} required value={'Alex Morgan'} />
    </form>,
  );
  expect(control).toBeValid();
  expect(new FormData(container.querySelector('form')!).get('field')).toBe('Alex Morgan');
});

test('disabled controls are excluded from submission while read-only values remain included', () => {
  const { container } = render(
    <form>
      <TextField disabled label="Disabled" name="disabled" onChange={vi.fn()} value="Disabled value" />
      <TextField label="Read only" name="readOnly" onChange={vi.fn()} readOnly required value="Read-only value" />
    </form>,
  );

  expect(screen.getByRole('textbox', { name: 'Disabled' })).toBeDisabled();
  expect(screen.getByRole('textbox', { name: 'Read only' })).toHaveAttribute('readonly');
  expect(screen.getByRole('textbox', { name: 'Read only' })).toBeValid();
  const data = new FormData(container.querySelector('form')!);
  expect(data.has('disabled')).toBe(false);
  expect(data.get('readOnly')).toBe('Read-only value');
});

test('defaults to text and supports native email and pattern validation', () => {
  const { rerender } = render(<TextField label="Email" onChange={vi.fn()} value="" />);
  const control = screen.getByRole('textbox', { name: 'Email' });

  expect(control).toHaveAttribute('type', 'text');

  rerender(<TextField label="Email" onChange={vi.fn()} pattern=".+@example[.]com" type="email" value="invalid" />);
  expect(control).toBeInvalid();

  rerender(
    <TextField label="Email" onChange={vi.fn()} pattern=".+@example[.]com" type="email" value="alex@other.com" />,
  );
  expect(control).toBeInvalid();

  rerender(
    <TextField label="Email" onChange={vi.fn()} pattern=".+@example[.]com" type="email" value="alex@example.com" />,
  );
  expect(control).toBeValid();

  rerender(<TextField label="Password" onChange={vi.fn()} type="password" value="secret" />);
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
});
