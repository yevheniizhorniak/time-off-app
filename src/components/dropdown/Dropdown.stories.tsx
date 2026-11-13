import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import Dropdown, { type DropdownProps } from './Dropdown';

const options = [
  { value: 'paid', label: 'Paid time off' },
  { value: 'sick', label: 'Sick day' },
  { value: 'parental', label: 'Parental leave' },
];

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
  argTypes: {
    onChange: { control: false },
  },
  args: {
    label: 'Time off type',
    value: '',
    options,
    onChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<DropdownProps>();

    return (
      <div style={{ boxSizing: 'border-box', maxWidth: '28rem', padding: '1rem', width: '100%' }}>
        <Dropdown
          {...args}
          onChange={(event) => {
            updateArgs({ value: event.currentTarget.value });
            args.onChange(event);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof Dropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Preselected: Story = {
  args: { value: 'paid' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'paid' },
};

export const DisabledOption: Story = {
  args: {
    options: options.map((option) => ({ ...option, disabled: option.value === 'parental' })),
  },
};

export const ValidationError: Story = {
  args: { required: true, error: 'Choose a time off type.' },
};
