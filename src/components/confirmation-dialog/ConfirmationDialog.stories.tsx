import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import Button from '../button/Button';

import ConfirmationDialog, { type ConfirmationDialogProps } from './ConfirmationDialog';

function ConfirmationDialogExample({
  title,
  message,
  confirmLabel,
  cancelLabel,
}: Pick<ConfirmationDialogProps, 'title' | 'message' | 'confirmLabel' | 'cancelLabel'>): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button label="Open confirmation" onClick={() => setIsOpen(true)} type="button" />
      <ConfirmationDialog
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
  component: ConfirmationDialog,
  args: {
    isOpen: false,
    title: 'Approve time off request?',
    message: 'This will approve the request and update its status.',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof ConfirmationDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <ConfirmationDialogExample {...args} />,
};
