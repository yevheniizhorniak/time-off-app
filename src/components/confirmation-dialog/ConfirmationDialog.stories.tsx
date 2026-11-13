import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ToaButton } from '../button/Button';

import { ToaConfirmationDialog, type ToaConfirmationDialogProps } from './ConfirmationDialog';

function ConfirmationDialogExample({
  title,
  message,
  confirmLabel,
  cancelLabel,
}: Pick<ToaConfirmationDialogProps, 'title' | 'message' | 'confirmLabel' | 'cancelLabel'>): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ToaButton label="Open confirmation" onClick={() => setIsOpen(true)} type="button" />
      <ToaConfirmationDialog
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        isOpen={isOpen}
        message={message}
        onCancel={() => setIsOpen(false)}
        onConfirm={() => setIsOpen(false)}
        title={title}
      />
    </>
  );
}

const meta = {
  title: 'Components/ConfirmationDialog',
  component: ToaConfirmationDialog,
  args: {
    isOpen: false,
    title: 'Approve time off request?',
    message: 'This will approve the request and update its status.',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof ToaConfirmationDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <ConfirmationDialogExample {...args} />,
};
