import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToaButton } from './Button';

const meta = {
  title: 'Components/Button',
  component: ToaButton,
  args: {
    label: 'Click me',
    type: 'button',
  },
  argTypes: {
    type: {
      control: false,
      description: 'Native button behavior.',
      table: {
        type: { summary: "'button' | 'submit' | 'reset'" },
        defaultValue: { summary: 'button' },
      },
    },
  },
} satisfies Meta<typeof ToaButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
};
