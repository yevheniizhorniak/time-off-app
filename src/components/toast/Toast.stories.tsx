import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToaButton } from '../button/Button';

import { ToaToast } from './Toast';
import { ToaToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function ToastExample({ message, stacked = false }: { message: string; stacked?: boolean }): React.JSX.Element {
  const { showToast } = useToast();

  return (
    <ToaButton
      label={stacked ? 'Show three notifications' : 'Show notification'}
      onClick={() => {
        showToast(message);
        if (stacked) {
          showToast('Your time off request is waiting for review.');
          showToast('You can check its status in your time off requests.');
        }
      }}
      type="button"
    />
  );
}

const meta = {
  title: 'Components/Toast',
  component: ToaToast,
  decorators: [
    (Story) => (
      <ToaToastProvider>
        <Story />
      </ToaToastProvider>
    ),
  ],
  args: { message: 'Your time off request has been submitted.', onDismiss: () => undefined },
} satisfies Meta<typeof ToaToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
  render: (args) => <ToastExample message={args.message} />,
};

export const Stacked: Story = {
  render: (args) => <ToastExample message={args.message} stacked />,
};

export const LongMessage: Story = {
  args: {
    message:
      'Your time off request has been submitted successfully. Your supervisor will review the dates and you can check the approval status in your list of time off requests. Reference: time-off-request-with-a-very-long-unbroken-identifier-to-check-wrapping-on-narrow-screens.',
  },
  render: (args) => <ToastExample message={args.message} />,
};
