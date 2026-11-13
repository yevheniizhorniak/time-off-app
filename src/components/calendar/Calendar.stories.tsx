import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { ToaCalendar, type ToaCalendarProps } from './Calendar';
import { formatDate } from './format-date';

const meta = {
  title: 'Components/Calendar',
  component: ToaCalendar,
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
    const [, updateArgs] = useArgs<ToaCalendarProps>();

    return (
      <div style={{ boxSizing: 'border-box', maxWidth: '28rem', padding: '1rem', width: '100%' }}>
        <ToaCalendar
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
} satisfies Meta<typeof ToaCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  tags: ['!dev'],
};

export const AnnotatedDays: Story = {
  args: {
    renderDayContent: (date) => (date.endsWith('-15') ? <span aria-hidden="true">★</span> : null),
    getDayAriaLabel: (date) => `${formatDate(date)}${date.endsWith('-15') ? ', event scheduled' : ''}`,
  },
};
