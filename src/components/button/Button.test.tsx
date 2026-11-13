import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { ToaButton } from './Button';

test('passes clicks through and defaults to a non-submit button', () => {
  const onClick = vi.fn();
  render(<ToaButton label="Save request" onClick={onClick} />);

  const button = screen.getByRole('button', { name: 'Save request' });
  expect(button).toHaveAttribute('type', 'button');
  button.click();
  expect(onClick).toHaveBeenCalledOnce();
});

test('allows a submit button', () => {
  render(<ToaButton label="Save request" type="submit" />);

  expect(screen.getByRole('button', { name: 'Save request' })).toHaveAttribute('type', 'submit');
});

test('prevents clicks while disabled or loading and keeps the label accessible', () => {
  const onClick = vi.fn();
  const { rerender } = render(<ToaButton disabled label="Save request" onClick={onClick} />);

  const button = screen.getByRole('button', { name: 'Save request' });
  expect(button).toBeDisabled();
  button.click();

  expect(button.querySelector('.toa-button__spinner')).not.toBeInTheDocument();

  rerender(<ToaButton label="Save request" loading onClick={onClick} />);

  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toHaveTextContent('Save request');
  expect(button.lastElementChild).toHaveClass('toa-button__spinner');
  expect(button.querySelector('.toa-button__spinner > .toa-loading-spinner')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  button.click();
  expect(onClick).not.toHaveBeenCalled();
});
