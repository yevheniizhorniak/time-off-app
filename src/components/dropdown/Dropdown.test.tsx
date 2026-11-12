import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { expect, test, vi } from 'vitest';

import Dropdown from './Dropdown';

const options = [
  { value: 'paid', label: 'Paid time off' },
  { value: 'sick', label: 'Sick day' },
];

test('forwards the native change event and keeps selection controlled by its parent', () => {
  const onChange = vi.fn((event: ChangeEvent<HTMLSelectElement>) => event.currentTarget.value);
  const { rerender } = render(<Dropdown label="Time off type" onChange={onChange} options={options} value="" />);
  const select = screen.getByRole('combobox', { name: 'Time off type' });

  fireEvent.change(select, { target: { value: 'sick' } });

  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange).toHaveReturnedWith('sick');
  expect(select).toHaveValue('');

  rerender(<Dropdown label="Time off type" onChange={onChange} options={options} value="sick" />);
  expect(select).toHaveValue('sick');
});

test('associates each visible label with a unique, stable generated ID', () => {
  const fields = () => (
    <>
      <Dropdown label="First type" onChange={vi.fn()} options={options} value="" />
      <Dropdown label="Second type" onChange={vi.fn()} options={options} value="" />
    </>
  );
  const { rerender } = render(fields());
  const firstSelect = screen.getByLabelText('First type');
  const secondSelect = screen.getByLabelText('Second type');
  const firstId = firstSelect.id;

  expect(firstId).not.toBe('');
  expect(secondSelect.id).not.toBe(firstId);
  rerender(fields());
  expect(screen.getByLabelText('First type')).toHaveAttribute('id', firstId);
});

test('supports a supplied ID, required validation, and native form submission', () => {
  const { container, rerender } = render(
    <form>
      <Dropdown
        id="time-off-type"
        label="Time off type"
        name="type"
        onChange={vi.fn()}
        options={options}
        required
        value=""
      />
    </form>,
  );
  const select = screen.getByRole('combobox', { name: 'Time off type' });

  expect(select).toHaveAttribute('id', 'time-off-type');
  expect(select).toBeRequired();
  expect(select).toBeInvalid();
  expect(screen.getByRole('option', { name: 'Select an option' })).toBeDisabled();

  rerender(
    <form>
      <Dropdown
        id="time-off-type"
        label="Time off type"
        name="type"
        onChange={vi.fn()}
        options={options}
        required
        value="paid"
      />
    </form>,
  );
  expect(select).toBeValid();
  expect(new FormData(container.querySelector('form')!).get('type')).toBe('paid');
});

test('connects validation feedback to the select and removes stale error attributes', () => {
  const { rerender } = render(
    <Dropdown error="Choose a type." label="Time off type" onChange={vi.fn()} options={options} value="" />,
  );
  const select = screen.getByRole('combobox', { name: 'Time off type' });

  expect(select).toHaveAttribute('aria-invalid', 'true');
  expect(select).toHaveAccessibleDescription('Choose a type.');
  expect(select).toHaveAttribute('aria-describedby', screen.getByText('Choose a type.').id);

  rerender(<Dropdown label="Time off type" onChange={vi.fn()} options={options} value="paid" />);
  expect(select).not.toHaveAttribute('aria-invalid');
  expect(select).not.toHaveAttribute('aria-describedby');
  expect(screen.queryByText('Choose a type.')).not.toBeInTheDocument();
});

test('supports a custom placeholder, disabled options, and a disabled field', () => {
  render(
    <Dropdown
      disabled
      label="Time off type"
      onChange={vi.fn()}
      options={[...options, { value: 'parental', label: 'Parental leave', disabled: true }]}
      placeholder="Choose a type"
      value=""
    />,
  );

  expect(screen.getByRole('combobox', { name: 'Time off type' })).toBeDisabled();
  expect(screen.getByRole('option', { name: 'Choose a type' })).toBeDisabled();
  expect(screen.getByRole('option', { name: 'Parental leave' })).toBeDisabled();
});
