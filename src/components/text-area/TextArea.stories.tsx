import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { ToaTextArea, type ToaTextAreaProps } from './TextArea';

const meta = {
  title: 'Components/TextArea',
  component: ToaTextArea,
  argTypes: {
    placeholder: { table: { disable: true } },
    onChange: { control: false },
  },
  args: {
    label: 'Notes',
    value: '',
    placeholder: 'Add an optional note',
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ToaTextAreaProps>();

    return (
      <div style={{ boxSizing: 'border-box', maxWidth: '28rem', padding: '1rem', width: '100%' }}>
        <ToaTextArea
          {...args}
          onChange={(event) => {
            updateArgs({ value: event.currentTarget.value });
            args.onChange(event);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof ToaTextArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Populated: Story = {
  args: { value: 'Family trip.\nI will hand over my tasks before leaving.' },
};

export const Required: Story = {
  args: { required: true },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'Family trip.\nI will hand over my tasks before leaving.' },
};

export const ReadOnly: Story = {
  args: { readOnly: true, value: 'Family trip.\nI will hand over my tasks before leaving.' },
};

export const ValidationError: Story = {
  args: { required: true, error: 'Add a note explaining your request.' },
};

export const Multiline: Story = {
  args: {
    rows: 6,
    value: 'Family trip.\nI will hand over my tasks before leaving.\nPlease contact me if you need more details.',
  },
};
