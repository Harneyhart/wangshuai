'use client';

import FullCalendar from '@fullcalendar/react';
import { EventSourceInput } from '@fullcalendar/core';
import cnLocale from '@fullcalendar/core/locales/zh-cn';

import timeGridPlugin from '@fullcalendar/timegrid';

type CalendarProps = {
  events: EventSourceInput;
};

export default function Calendar({ events }: CalendarProps) {
  return (
    <FullCalendar
      locale={cnLocale}
      plugins={[timeGridPlugin]}
      height={700}
      initialView="timeGridWeek"
      weekends={true}
      allDaySlot={false}
      slotMinTime="08:00:00"
      slotMaxTime="20:00:00"
      slotLabelFormat={{
        hour: 'numeric',
        minute: '2-digit',
        omitZeroMinute: false,
        meridiem: 'short',
        hour12: false,
      }}
      // views={{
      //   timeGridFourDay: {
      //     type: 'timeGrid',
      //     duration: { days: 4 },
      //   },
      // }}
      events={events}
    />
  );
}
