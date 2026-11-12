import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import LoadingSpinner from './LoadingSpinner';

test('provides a default and customizable accessible label', () => {
  const { rerender } = render(<LoadingSpinner />);

  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();

  rerender(<LoadingSpinner label="Loading requests" />);

  expect(screen.getByRole('status', { name: 'Loading requests' })).toBeInTheDocument();
});

test('hides a decorative spinner from assistive technology', () => {
  const { container } = render(<LoadingSpinner decorative />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(container.querySelector('.toa-loading-spinner')).toHaveAttribute('aria-hidden', 'true');
});
