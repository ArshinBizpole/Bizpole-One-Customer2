import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, FileText, User, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// Filled phone icon for call-back events (Event Details title).
const CallIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.0104 15.3798C18.7804 15.3798 17.5904 15.1798 16.4804 14.8198C16.1255 14.6995 15.7331 14.7928 15.4704 15.0598L13.9004 17.0298C11.0704 15.5898 8.75035 13.2798 7.31035 10.4498L9.28035 8.8798C9.56035 8.6098 9.64035 8.2198 9.53035 7.8598C8.99446 6.73752 8.6465 5.53485 8.50035 4.2998C8.50035 3.7498 8.05035 3.2998 7.50035 3.2998H4.11035C3.56035 3.2998 3.11035 3.7498 3.11035 4.2998C3.11035 13.6898 10.7204 21.2998 20.1104 21.2998C20.6604 21.2998 21.1104 20.8498 21.1104 20.2998V16.8798C21.1104 16.3298 20.6604 15.8798 20.1104 15.8798L20.0104 15.3798Z" fill="currentColor"/>
  </svg>
);

// Calendar icon for the Date card in Event Details.
const DateIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.66667 5.83333V2.5M13.3333 5.83333V2.5M5.83333 9.16667H14.1667M4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V5.83333C17.5 4.91286 16.7538 4.16667 15.8333 4.16667H4.16667C3.24619 4.16667 2.5 4.91286 2.5 5.83333V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5L6.66667 5.83333" stroke="#262626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Clock icon for the Time card in Event Details.
const TimeIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.25 4.91667V8.25L10.75 10.75M15.75 8.25C15.75 12.3894 12.3894 15.75 8.25 15.75C4.11064 15.75 0.75 12.3894 0.75 8.25C0.75 4.11064 4.11064 0.75 8.25 0.75C12.3894 0.75 15.75 4.11064 15.75 8.25L8.25 4.91667" stroke="#262626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const EventDetailsModal = ({ selectedEvent, setSelectedEvent, handleDeleteEvent }) => {
  if (!selectedEvent) return null;
  // Call-backs come from the server: show their remarks and status, read-only.
  const readOnly = !!selectedEvent.readOnly;
  // const meetingType = MEETING_TYPES[selectedEvent.meetingType] || MEETING_TYPES.IN_PERSON;

  const getEventIcon = () => {
    switch (selectedEvent.type) {
      case "MEETING": return <Users size={18} />;
      case "PRESENTATION": return <FileText size={18} />;
      case "TEAM": return <User size={18} />;
      case "PERSONAL": return <CalendarIcon size={18} />;
      case "CALL_BACK": return <CallIcon size={18} />;
      default: return <Users size={18} />;
    }
  };

  // const getMeetingTypeIcon = () => {
  //   switch (selectedEvent.meetingType) {
  //     case "IN_PERSON": return <MapPin size={18} />;
  //     case "VIDEO": return <Video size={18} />;
  //     case "PHONE": return <Phone size={18} />;
  //     default: return <MapPin size={18} />;
  //   }
  // };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={() => setSelectedEvent(null)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5">
              {/* Icon + title */}
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-amber-100 text-gray-900 flex items-center justify-center flex-shrink-0">
                  {getEventIcon()}
                </span>
                <h3 className="text-xl font-bold text-gray-900 leading-snug">{selectedEvent.title}</h3>
              </div>
              {/* Date & Time cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-gray-800 flex items-center justify-center flex-shrink-0">
                    <DateIcon size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-500">Date</div>
                    <div className="text-xs font-semibold text-gray-900">{selectedEvent.start ? format(selectedEvent.start, "EEEE, MMMM d, yyyy") : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-gray-800 flex items-center justify-center flex-shrink-0">
                    <TimeIcon size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-500">Time</div>
                    <div className="text-xs font-semibold text-gray-900">
                      {selectedEvent.start ? format(selectedEvent.start, "h:mm a") : ''} - {selectedEvent.end ? format(selectedEvent.end, "h:mm a") : ''}
                    </div>
                  </div>
                </div>
              </div>
              {/* Remarks / Description */}
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">{readOnly ? 'Remarks' : 'Description'}</div>
                <p className="text-sm text-gray-700 bg-amber-50 p-4 rounded-xl whitespace-pre-line leading-relaxed">
                  {selectedEvent.description || <span className="italic text-gray-400">No description</span>}
                </p>
              </div>
              {readOnly && (
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">Status</div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-gray-800 capitalize">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {selectedEvent.status || 'Scheduled'}
                  </span>
                </div>
              )}
              {!readOnly && (<>
              {/* Priority */}
              <div className="flex items-center text-gray-700">
                <span className="font-medium mr-2">Priority:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedEvent.priority === 'High'
                  ? 'bg-red-100 text-red-800'
                  : selectedEvent.priority === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                  }`}>
                  {selectedEvent.priority || 'Medium'}
                </span>
              </div>
              {/* On these days */}
              <div>
                <div className="text-gray-700 font-medium mb-2">On these days</div>
                <div className="flex gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div
                      key={day}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${selectedEvent.days && selectedEvent.days.includes(day)
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                      {day[0]}
                    </div>
                  ))}
                </div>
              </div>
              {/* Repeat every day */}
              <div className="flex items-center text-gray-700">
                <span className="font-medium mr-2">Repeat:</span>
                <span>{selectedEvent.repeat ? 'Every day' : 'No'}</span>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleDeleteEvent}
                  className="px-5 py-2.5 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors"
                >
                  Delete Event
                </button>
              </div>
              </>)}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const AddEventModal = ({ showEventModal, setShowEventModal, newEvent, setNewEvent, handleAddEvent }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Ensure newEvent.days is always an array
  const safeDays = Array.isArray(newEvent.days) ? newEvent.days : [];

  const toggleDay = (day) => {
    if (safeDays.includes(day)) {
      setNewEvent({
        ...newEvent,
        days: safeDays.filter(d => d !== day)
      });
    } else {
      setNewEvent({
        ...newEvent,
        days: [...safeDays, day]
      });
    }
  };

  const toggleRepeat = () => {
    setNewEvent({
      ...newEvent,
      repeat: !newEvent.repeat
    });
  };

  return (
    <AnimatePresence>
      {showEventModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowEventModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Add Event</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
                  <input
                    type="text"
                    value={newEvent.title || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Meeting"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={newEvent.start ? format(newEvent.start, "yyyy-MM-dd") : ''}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        const updatedStart = new Date(date);
                        const updatedEnd = new Date(date);
                        updatedEnd.setHours(updatedEnd.getHours() + 1);

                        setNewEvent({
                          ...newEvent,
                          start: updatedStart,
                          end: updatedEnd
                        });
                      }}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={newEvent.start ? format(newEvent.start, "HH:mm") : ''}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const updatedStart = new Date(newEvent.start);
                        updatedStart.setHours(parseInt(hours), parseInt(minutes));

                        const updatedEnd = new Date(updatedStart);
                        updatedEnd.setHours(updatedEnd.getHours() + 1);

                        setNewEvent({
                          ...newEvent,
                          start: updatedStart,
                          end: updatedEnd
                        });
                      }}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows="3"
                    placeholder="Add some description of the event"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={newEvent.priority || 'Medium'}
                    onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value })}
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">On these days</label>
                  <div className="flex gap-2">
                    {days.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${safeDays.includes(day)
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {day[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={toggleRepeat}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full mr-3 ${newEvent.repeat ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newEvent.repeat ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <span className="text-gray-700 font-medium">Repeat every day</span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleAddEvent}
                  disabled={!newEvent.title}
                  className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-medium text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Request Event
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};