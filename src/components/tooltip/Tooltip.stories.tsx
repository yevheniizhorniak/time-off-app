import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import Button from '../button/Button';

import Tooltip from './Tooltip';

import './Tooltip.stories.scss';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  args: {
    content: 'Add any details that will help your supervisor review the request.',
    children: (
      <button className="toa-tooltip-example__button" type="button">
        About notes
      </button>
    ),
  },
  decorators: [
    (Story) => (
      <div className="toa-tooltip-example">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NativeButton: Story = {};

export const ExistingButton: Story = {
  args: { children: <Button label="About notes" /> },
};

export const LongText: Story = {
  args: {
    content:
      'Notes are optional. You can include information to help your supervisor review your request. Long words also wrap safely: ALongReferenceWithoutSpacesThatMustStayInsideThePhoneViewportEvenAtNarrowWidths.',
  },
};

export const ViewportEdges: Story = {
  render: (args) => (
    <div className="toa-tooltip-example__edges">
      {['Top left', 'Top right', 'Bottom left', 'Bottom right'].map((label) => (
        <Tooltip content={args.content} key={label}>
          <button className="toa-tooltip-example__button" type="button">
            {label}
          </button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const ScrollingContainer: Story = {
  render: (args) => (
    <div className="toa-tooltip-example__scroll">
      <div className="toa-tooltip-example__scroll-content">
        <p>Scroll while the tooltip is open to check that it follows its trigger.</p>
        <Tooltip {...args} />
        <p>The bubble can extend outside this scrolling container.</p>
      </div>
    </div>
  ),
};

export const PreservedAction: Story = {
  render: function Render(args) {
    const [count, setCount] = useState(0);
    return (
      <>
        <Tooltip content={args.content}>
          <Button label="Count activation" onClick={() => setCount((value) => value + 1)} />
        </Tooltip>
        <p aria-live="polite">Activations: {count}</p>
      </>
    );
  },
};
