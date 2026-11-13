import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { ToaLoadingSpinner } from './LoadingSpinner';

test('provides a default and customizable accessible label', () => {
  const { rerender } = render(<ToaLoadingSpinner />);

  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();

  rerender(<ToaLoadingSpinner label="Loading time off requests" />);

  expect(screen.getByRole('status', { name: 'Loading time off requests' })).toBeInTheDocument();
});

test('hides a decorative spinner from assistive technology', () => {
  const { container } = render(<ToaLoadingSpinner decorative />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(container.querySelector('.toa-loading-spinner')).toHaveAttribute('aria-hidden', 'true');
});
