'use client';

import Timetable from 'react-timetable-events';
import { format } from 'date-fns';
import clsx from 'clsx';

const DayHeaderPreview = ({ day, rowHeight, ...otherProperties }: any) => {
  return (
    <div
      {...otherProperties}
      style={{ ...(otherProperties?.style || {}), height: `${rowHeight}px` }}
    >
      {day}
    </div>
  );
};

const HourPreview = ({ hour, ...otherProperties }: any) => {
  return (
    <div
      {...otherProperties}
      className={`flex items-center justify-center ${otherProperties.className}`}
      key={hour}
    >
      {hour}
    </div>
  );
};

const EventPreview = ({ event, defaultAttributes, classNames }: any) => {
  return (
    <div
      {...defaultAttributes}
      style={{
        ...defaultAttributes.style,
        background: event.type === 'error' ? '#720000' : '#66B266',
      }}
      title={event.name}
      key={event.id}
      className={clsx('mx-2', classNames.event)}
    >
      <span className={classNames.event_info}>[ {event.name} ]</span>
      <span className={classNames.event_info}>
        {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
      </span>
    </div>
  );
};

type TableProps = {
  events: any;
};
const Table: React.FC<TableProps> = ({ events }) => {
  return (
    <Timetable
      events={events}
      hoursInterval={{
        from: 9,
        to: 20,
      }}
      // renderDayHeader={DayHeaderPreview}
      renderHour={HourPreview}
      renderEvent={EventPreview}
      getDayLabel={(day) => {
        return 1;
      }}
      style={{ height: '500px' }}
    />
  );
};

export default Table;
