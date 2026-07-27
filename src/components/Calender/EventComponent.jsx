// src/components/Calender/EventComponent.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { differenceInMinutes } from 'date-fns';

const palette = [
  { bar: 'bg-violet-400', bg: 'bg-violet-50' },
  { bar: 'bg-orange-400', bg: 'bg-orange-50' },
  { bar: 'bg-cyan-400', bg: 'bg-cyan-50' },
  { bar: 'bg-rose-400', bg: 'bg-rose-50' },
  { bar: 'bg-emerald-400', bg: 'bg-emerald-50' },
];

const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const getEventStyle = (event) => {
  if (event.priority === "High") return { bar: 'bg-rose-400', bg: 'bg-rose-50' };
  if (event.priority === "Low") return { bar: 'bg-emerald-400', bg: 'bg-emerald-50' };
  return palette[Math.abs(hashCode(String(event.id))) % palette.length];
};

const formatDuration = (start, end) => {
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
};

const EventComponent = ({ event }) => {
  const { bar, bg } = getEventStyle(event);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative pl-3 pr-2 py-1.5 rounded-lg text-xs ${bg} mb-1 overflow-hidden`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
      <div className="font-semibold text-gray-800 truncate">{event.title}</div>
      <div className="text-gray-500 mt-0.5">{formatDuration(event.start, event.end)}</div>
    </motion.div>
  );
};

export default EventComponent;