import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToaToast } from './Toast';
import { ToaToastProvider } from './ToastProvider';
import { ToastStoryExample } from './ToastStoryExample';

const meta = {
  title: 'Components/Toast',
  component: ToaToast,
  subcomponents: { ToaToastProvider },
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
  render: (args) => <ToastStoryExample message={args.message} />,
};

export const Stacked: Story = {
  render: (args) => <ToastStoryExample message={args.message} stacked />,
};

export const LongMessage: Story = {
  args: {
    message:
      'Your time off request has been submitted successfully. Your supervisor will review the dates and you can check the approval status in your list of time off requests. Reference: time-off-request-with-a-very-long-unbroken-identifier-to-check-wrapping-on-narrow-screens.',
  },
  render: (args) => <ToastStoryExample message={args.message} />,
};

export const ProgrammaticDismissal: Story = {
  render: (args) => <ToastStoryExample message={args.message} dismissLatest />,
  parameters: {
    docs: {
      description: {
        story:
          'Save the ID returned by showToast, then pass it to dismissToast to remove that notification. Mount ToaToastProvider once above callers of useToast.',
      },
      source: {
        type: 'code',
        language: 'tsx',
        code: `import { useState } from 'react';
import { ToaButton } from './src/components/button/Button';
import { ToaToastProvider } from './src/components/toast/ToastProvider';
import { useToast } from './src/components/toast/useToast';

function NotificationExample() {
  const { showToast, dismissToast } = useToast();
  const [latestId, setLatestId] = useState<string>();

  return (
    <>
      <ToaButton
        label="Show notification"
        onClick={() => {
          const id = showToast('Your time off request has been submitted.');
          setLatestId(id);
        }}
      />
      <ToaButton
        label="Dismiss latest notification"
        disabled={!latestId}
        onClick={() => {
          if (latestId) dismissToast(latestId);
          setLatestId(undefined);
        }}
      />
    </>
  );
}

export default function Example() {
  return (
    <ToaToastProvider>
      <NotificationExample />
    </ToaToastProvider>
  );
}`,
      },
    },
  },
};
