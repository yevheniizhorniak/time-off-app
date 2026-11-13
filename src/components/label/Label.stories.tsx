import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId } from 'react';

import { ToaLabel } from './Label';

const meta = {
  title: 'Components/Label',
  component: ToaLabel,
  args: {
    text: 'Employee name',
    required: false,
  },
  render: function Field(args) {
    const generatedId = useId();
    const inputId = args.htmlFor ?? generatedId;

    return (
      <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '24rem', padding: '1rem' }}>
        <ToaLabel {...args} htmlFor={inputId} />
        <input id={inputId} required={args.required} style={{ minWidth: 0 }} type="text" />
      </div>
    );
  },
} satisfies Meta<typeof ToaLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const LongText: Story = {
  args: {
    text: 'Additional details your supervisor should consider when reviewing this time off request',
  },
};
