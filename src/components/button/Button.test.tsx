import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { ToaButton } from './Button';

test.each([undefined, 'primary', 'secondary'] as const)(
  'passes clicks through with %s emphasis and defaults to a non-submit button',
  (emphasis) => {
    const onClick = vi.fn();
    render(<ToaButton emphasis={emphasis} label="Save time off request" onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Save time off request' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('toa-button', `toa-button--${emphasis ?? 'primary'}`);
    expect(button).not.toHaveAttribute('emphasis');
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  },
);

test('allows a submit button', () => {
  render(<ToaButton label="Save time off request" type="submit" />);

  expect(screen.getByRole('button', { name: 'Save time off request' })).toHaveAttribute('type', 'submit');
});

test.each(['primary', 'secondary'] as const)(
  'prevents clicks while disabled or loading with %s emphasis and keeps the label accessible',
  (emphasis) => {
    const onClick = vi.fn();
    const { rerender } = render(
      <ToaButton disabled emphasis={emphasis} label="Save time off request" onClick={onClick} />,
    );

    const button = screen.getByRole('button', { name: 'Save time off request' });
    expect(button).toBeDisabled();
    button.click();

    expect(button.querySelector('.toa-button__spinner')).not.toBeInTheDocument();

    rerender(<ToaButton emphasis={emphasis} label="Save time off request" loading onClick={onClick} />);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent('Save time off request');
    expect(button.querySelector('.toa-button__spinner')).toBeInTheDocument();
    expect(button.querySelector('.toa-button__spinner > .toa-loading-spinner')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  },
);
