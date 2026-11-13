import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToaLoadingSpinner } from './LoadingSpinner';

const meta = {
  title: 'Components/LoadingSpinner',
  component: ToaLoadingSpinner,
} satisfies Meta<typeof ToaLoadingSpinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
};
