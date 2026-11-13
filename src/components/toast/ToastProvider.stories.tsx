import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import Button from '../button/Button';

import ToastProvider from './ToastProvider';
import { useToast } from './useToast';

function ToastProviderExample(): React.JSX.Element {
  const { showToast, dismissToast } = useToast();
  const [latestId, setLatestId] = useState<string>();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <Button label="Show notification" onClick={() => setLatestId(showToast('Your request has been submitted.'))} />
      <Button
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
  component: ToastProvider,
  args: {
    children: <ToastProviderExample />,
  },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
