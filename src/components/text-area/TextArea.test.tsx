import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { expect, test, vi } from 'vitest';

import TextArea from './TextArea';

test('forwards native changes and keeps the value controlled by its parent', () => {
  const onChange = vi.fn((event: ChangeEvent<HTMLTextAreaElement>) => event.currentTarget.value);
  const { rerender } = render(<TextArea label="Notes" onChange={onChange} value="" />);
  const control = screen.getByRole('textbox', { name: 'Notes' });

  fireEvent.change(control, { target: { value: 'First line\nSecond line' } });

  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange).toHaveReturnedWith('First line\nSecond line');
  expect(control).toHaveValue('');

  rerender(<TextArea label="Notes" onChange={onChange} value={'First line\nSecond line'} />);
  expect(control).toHaveValue('First line\nSecond line');
});

test('associates labels with unique, stable IDs and respects an explicit ID', () => {
  const fields = () => (
    <>
      <TextArea label="First" onChange={vi.fn()} value="" />
      <TextArea label="Second" onChange={vi.fn()} value="" />
      <TextArea id="custom-text-area" label="Custom" onChange={vi.fn()} value="" />
    </>
  );
  const { rerender } = render(fields());
  const first = screen.getByLabelText('First');
  const second = screen.getByLabelText('Second');
  const firstId = first.id;

  expect(firstId).not.toBe('');
  expect(second.id).not.toBe(firstId);
  expect(screen.getByLabelText('Custom')).toHaveAttribute('id', 'custom-text-area');
  rerender(fields());
  expect(screen.getByLabelText('First')).toHaveAttribute('id', firstId);
});

test('associates validation feedback and removes stale errors', () => {
  const { rerender } = render(
    <TextArea error="This field needs attention." label="Notes" onChange={vi.fn()} value="" />,
  );
  const control = screen.getByRole('textbox', { name: 'Notes' });

  expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(control).toHaveAccessibleDescription('This field needs attention.');
  expect(control).toHaveAttribute('aria-describedby', screen.getByText('This field needs attention.').id);

  rerender(<TextArea label="Notes" onChange={vi.fn()} value="" />);
  expect(control).not.toHaveAttribute('aria-invalid');
  expect(control).not.toHaveAttribute('aria-describedby');
  expect(screen.queryByText('This field needs attention.')).not.toBeInTheDocument();
});

test('supports required validation and native form submission', () => {
  const { container, rerender } = render(
    <form>
      <TextArea label="Notes" name="field" onChange={vi.fn()} required value="" />
    </form>,
  );
  const control = screen.getByRole('textbox', { name: 'Notes' });

  expect(control).toHaveAccessibleName('Notes');
  expect(control).toBeRequired();
  expect(control).toBeInvalid();

  rerender(
    <form>
      <TextArea label="Notes" name="field" onChange={vi.fn()} required value={'First line\nSecond line'} />
    </form>,
  );
  expect(control).toBeValid();
  expect(new FormData(container.querySelector('form')!).get('field')).toBe('First line\nSecond line');
});

test('disabled controls are excluded from submission while read-only values remain included', () => {
  const { container } = render(
    <form>
      <TextArea disabled label="Disabled" name="disabled" onChange={vi.fn()} value="Disabled value" />
      <TextArea label="Read only" name="readOnly" onChange={vi.fn()} readOnly required value="Read-only value" />
    </form>,
  );

  expect(screen.getByRole('textbox', { name: 'Disabled' })).toBeDisabled();
  expect(screen.getByRole('textbox', { name: 'Read only' })).toHaveAttribute('readonly');
  expect(screen.getByRole('textbox', { name: 'Read only' })).toBeValid();
  const data = new FormData(container.querySelector('form')!);
  expect(data.has('disabled')).toBe(false);
  expect(data.get('readOnly')).toBe('Read-only value');
});

test('defaults to four rows and allows a custom visible row count', () => {
  const { rerender } = render(<TextArea label="Notes" onChange={vi.fn()} value="" />);
  const control = screen.getByRole('textbox', { name: 'Notes' });

  expect(control).toHaveAttribute('rows', '4');

  rerender(<TextArea label="Notes" onChange={vi.fn()} rows={6} value="" />);
  expect(control).toHaveAttribute('rows', '6');
});
