import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToaButton } from './Button';

const meta = {
  title: 'Components/Button',
  component: ToaButton,
  args: {
    label: 'Click me',
  },
} satisfies Meta<typeof ToaButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
