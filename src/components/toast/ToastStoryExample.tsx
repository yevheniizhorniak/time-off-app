import { useState } from 'react';

import { ToaButton } from '../button/Button';

import { useToast } from './useToast';

type ToastStoryExampleProps = {
  /** Notification text supplied by story controls. */
  message: string;
  /** Shows three notifications per activation. Defaults to false. */
  stacked?: boolean;
  /** Includes a control to dismiss the latest notification. Defaults to false. */
  dismissLatest?: boolean;
};

export function ToastStoryExample({
  message,
  stacked = false,
  dismissLatest = false,
}: ToastStoryExampleProps): React.JSX.Element {
  const { showToast, dismissToast } = useToast();
  const [latestId, setLatestId] = useState<string>();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <ToaButton
        label={stacked ? 'Show three notifications' : 'Show notification'}
        onClick={() => {
          setLatestId(showToast(message));
          if (stacked) {
            showToast('Your time off request is waiting for review.');
            setLatestId(showToast('You can check its status in your time off requests.'));
          }
        }}
        type="button"
      />
      {dismissLatest && (
        <ToaButton
          disabled={!latestId}
          label="Dismiss latest notification"
          onClick={() => {
            if (latestId) dismissToast(latestId);
            setLatestId(undefined);
          }}
          type="button"
        />
      )}
    </div>
  );
}
