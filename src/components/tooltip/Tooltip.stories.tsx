import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ToaButton } from '../button/Button';

import { ToaTooltip } from './Tooltip';

import './Tooltip.stories.scss';

const meta = {
  title: 'Components/Tooltip',
  component: ToaTooltip,
  args: {
    content: 'Add any details that will help your supervisor review the time off request.',
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
} satisfies Meta<typeof ToaTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NativeButton: Story = {};

export const ExistingButton: Story = {
  args: { children: <ToaButton label="About notes" /> },
};

export const LongText: Story = {
  args: {
    content:
      'Notes are optional. You can include information to help your supervisor review your time off request. Long words also wrap safely: ALongReferenceWithoutSpacesThatMustStayInsideThePhoneViewportEvenAtNarrowWidths.',
  },
};

export const ViewportEdges: Story = {
  render: (args) => (
    <div className="toa-tooltip-example__edges">
      {['Top left', 'Top right', 'Bottom left', 'Bottom right'].map((label) => (
        <ToaTooltip content={args.content} key={label}>
          <button className="toa-tooltip-example__button" type="button">
            {label}
          </button>
        </ToaTooltip>
      ))}
    </div>
  ),
};

export const ScrollingContainer: Story = {
  render: (args) => (
    <div className="toa-tooltip-example__scroll">
      <div className="toa-tooltip-example__scroll-content">
        <p>Scroll while the tooltip is open to check that it follows its trigger.</p>
        <ToaTooltip {...args} />
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
        <ToaTooltip content={args.content}>
          <ToaButton label="Count activation" onClick={() => setCount((value) => value + 1)} />
        </ToaTooltip>
        <p aria-live="polite">Activations: {count}</p>
      </>
    );
  },
};
