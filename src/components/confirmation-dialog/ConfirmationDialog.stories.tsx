import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { ToaButton } from '../button/Button';

import { ToaConfirmationDialog, type ToaConfirmationDialogProps } from './ConfirmationDialog';

const meta = {
  title: 'Components/ConfirmationDialog',
  component: ToaConfirmationDialog,
  argTypes: {
    isOpen: { control: false },
  },
  args: {
    isOpen: false,
    title: 'Approve time off request?',
    message: 'This will approve the request and update its status.',
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ToaConfirmationDialogProps>();

    return (
      <>
        <ToaButton label="Open confirmation" onClick={() => updateArgs({ isOpen: true })} />
        <ToaConfirmationDialog
          {...args}
          onCancel={() => {
            updateArgs({ isOpen: false });
            args.onCancel();
          }}
          onConfirm={() => {
            updateArgs({ isOpen: false });
            args.onConfirm();
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof ToaConfirmationDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
};
