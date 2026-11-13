import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import Calendar, { type CalendarProps } from './Calendar';
import { formatDate } from './format-date';

const meta = {
  title: 'Components/Calendar',
  component: Calendar,
  args: {
    month: new Date(2026, 10, 1, 12),
    selectedDate: '2026-11-12',
    onMonthChange: fn(),
    onDateChange: fn(),
  },
  argTypes: {
    month: { control: false },
    renderDayContent: { control: false },
    getDayAriaLabel: { control: false },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<CalendarProps>();

    return (
      <div style={{ boxSizing: 'border-box', maxWidth: '28rem', padding: '1rem', width: '100%' }}>
        <Calendar
          {...args}
          onMonthChange={(month) => {
            updateArgs({ month });
            args.onMonthChange(month);
          }}
          onDateChange={(selectedDate) => {
            updateArgs({ selectedDate });
            args.onDateChange(selectedDate);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AnnotatedDays: Story = {
  args: {
    renderDayContent: (date) => (date.endsWith('-15') ? <span aria-hidden="true">★</span> : null),
    getDayAriaLabel: (date) => `${formatDate(date)}${date.endsWith('-15') ? ', event scheduled' : ''}`,
  },
};
