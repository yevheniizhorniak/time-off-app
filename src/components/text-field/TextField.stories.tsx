import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { ToaTextField, type ToaTextFieldProps } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: ToaTextField,
  argTypes: {
    placeholder: { table: { disable: true } },
    onChange: { control: false },
  },
  args: {
    label: 'Employee name',
    value: '',
    placeholder: 'Enter your name',
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ToaTextFieldProps>();

    return (
      <div style={{ boxSizing: 'border-box', maxWidth: '28rem', padding: '1rem', width: '100%' }}>
        <ToaTextField
          {...args}
          onChange={(event) => {
            updateArgs({ value: event.currentTarget.value });
            args.onChange(event);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof ToaTextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
};

export const Date: Story = {
  args: {
    label: 'Start date',
    type: 'date',
    value: '2026-11-12',
    min: '2026-11-01',
    max: '2026-12-31',
    required: true,
    placeholder: undefined,
  },
};

export const Populated: Story = {
  args: { value: 'Alex Morgan' },
};

export const Required: Story = {
  args: { required: true },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'Alex Morgan' },
};

export const ReadOnly: Story = {
  args: { readOnly: true, value: 'Alex Morgan' },
};

export const ValidationError: Story = {
  args: { required: true, error: 'Enter your name.' },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    autoComplete: 'current-password',
  },
};
