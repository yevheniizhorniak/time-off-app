import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import Toast from './Toast';

test('renders plain text and calls onDismiss from an accessible native button', () => {
  const onDismiss = vi.fn();
  render(<Toast message="<b>Request submitted</b>" onDismiss={onDismiss} />);
  expect(screen.getByText('<b>Request submitted</b>')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(onDismiss).toHaveBeenCalledOnce();
});
