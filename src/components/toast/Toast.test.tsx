import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { ToaToast } from './Toast';

test('renders plain text and calls onDismiss from an accessible native button', () => {
  const onDismiss = vi.fn();
  render(<ToaToast message="<b>Time off request submitted</b>" onDismiss={onDismiss} />);
  expect(screen.getByText('<b>Time off request submitted</b>')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(onDismiss).toHaveBeenCalledOnce();
});
