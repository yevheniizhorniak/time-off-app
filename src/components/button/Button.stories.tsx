import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToaButton } from './Button';

const meta = {
  title: 'Components/Button',
  component: ToaButton,
  args: {
    disabled: false,
    emphasis: 'primary',
    label: 'Click me',
    loading: false,
    type: 'button',
  },
  argTypes: {
    emphasis: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
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

export const Primary: Story = {
  args: { emphasis: 'primary' },
};

export const Secondary: Story = {
  args: { emphasis: 'secondary' },
};
