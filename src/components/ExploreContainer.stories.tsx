import type { Meta, StoryObj } from '@storybook/react-vite';

import ExploreContainer from './ExploreContainer';

const meta = {
  title: 'Starter/ExploreContainer',
  component: ExploreContainer,
} satisfies Meta<typeof ExploreContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
