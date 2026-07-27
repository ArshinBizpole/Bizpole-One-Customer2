import React from 'react';

const dayHeaderStyles = {
  0: 'bg-rose-50 text-rose-400',
  1: 'bg-gray-100 text-gray-500',
  2: 'bg-cyan-50 text-cyan-600',
  3: 'bg-purple-50 text-purple-500',
  4: 'bg-emerald-50 text-emerald-600',
  5: 'bg-rose-50 text-rose-500',
  6: 'bg-gray-100 text-gray-400',
};

const CalendarDayHeader = ({ date, label }) => {
  const style = dayHeaderStyles[date.getDay()] || dayHeaderStyles[1];
  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md ${style}`}>
      {label.slice(0, 3)}
    </span>
  );
};

export default CalendarDayHeader;