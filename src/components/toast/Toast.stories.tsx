import type { Meta, StoryObj } from '@storybook/react-vite';

import Button from '../button/Button';

import Toast from './Toast';
import ToastProvider from './ToastProvider';
import { useToast } from './useToast';

function ToastExample({ message, stacked = false }: { message: string; stacked?: boolean }): React.JSX.Element {
  const { showToast } = useToast();

  return (
    <Button
      label={stacked ? 'Show three notifications' : 'Show notification'}
      onClick={() => {
        showToast(message);
        if (stacked) {
          showToast('Your request is waiting for review.');
          showToast('You can check its status in your requests.');
        }
      }}
      type="button"
    />
  );
}

const meta = {
  title: 'Components/Toast',
  component: Toast,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  args: { message: 'Your request has been submitted.', onDismiss: () => undefined },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <ToastExample message={args.message} />,
};

export const Stacked: Story = {
  render: (args) => <ToastExample message={args.message} stacked />,
};

export const LongMessage: Story = {
  args: {
    message:
      'Your time off request has been submitted successfully. Your supervisor will review the dates and you can check the approval status in your list of requests. Reference: request-with-a-very-long-unbroken-identifier-to-check-wrapping-on-narrow-screens.',
  },
  render: (args) => <ToastExample message={args.message} />,
};
