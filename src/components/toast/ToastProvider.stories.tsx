import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ToaButton } from '../button/Button';

import { ToaToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function ToastProviderExample(): React.JSX.Element {
  const { showToast, dismissToast } = useToast();
  const [latestId, setLatestId] = useState<string>();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <ToaButton
        label="Show notification"
        onClick={() => setLatestId(showToast('Your time off request has been submitted.'))}
      />
      <ToaButton
        disabled={!latestId}
        label="Dismiss latest notification"
        onClick={() => {
          if (latestId) dismissToast(latestId);
          setLatestId(undefined);
        }}
      />
    </div>
  );
}

const meta = {
  title: 'Components/ToastProvider',
  component: ToaToastProvider,
  args: {
    children: <ToastProviderExample />,
  },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof ToaToastProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
};
