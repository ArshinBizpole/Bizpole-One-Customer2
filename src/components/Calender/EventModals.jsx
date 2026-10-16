import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Users, FileText, User, Phone, Calendar as CalendarIcon } from 'lucide-react';
import { EVENT_TYPES } from './constants';
import { format } from 'date-fns';

export const EventDetailsModal = ({ selectedEvent, setSelectedEvent, handleDeleteEvent }) => {
  if (!selectedEvent) return null;
  const eventType = EVENT_TYPES[selectedEvent.type] || EVENT_TYPES.MEETING;
  // Call-backs come from the server: show their remarks and status, read-only.
  const readOnly = !!selectedEvent.readOnly;
  // const meetingType = MEETING_TYPES[selectedEvent.meetingType] || MEETING_TYPES.IN_PERSON;

  const getEventIcon = () => {
    switch (selectedEvent.type) {
      case "MEETING": return <Users size={14} />;
      case "PRESENTATION": return <FileText size={14} />;
      case "TEAM": return <User size={14} />;
      case "PERSONAL": return <CalendarIcon size={14} />;
      case "CALL_BACK": return <Phone size={14} />;
      default: return <Users size={14} />;
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
          className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-gray-800">Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5">
              {/* Event Name */}
              <div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${eventType.color} ${eventType.text} mb-2`}>
                  {getEventIcon()}
                  <span className="ml-1.5">{eventType.name}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h3>
              </div>
              {/* Date & Time */}
              <div className="flex items-start text-gray-700">
                <Clock size={20} className="mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">{selectedEvent.start ? format(selectedEvent.start, "EEEE, MMMM d, yyyy") : ''}</div>
                  <div className="text-gray-600">{selectedEvent.start ? format(selectedEvent.start, "h:mm a") : ''} - {selectedEvent.end ? format(selectedEvent.end, "h:mm a") : ''}</div>
                </div>
              </div>
              {/* Description */}
              <div>
                <div className="text-gray-700 font-medium mb-2">{readOnly ? 'Remarks' : 'Description'}</div>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-line">
                  {selectedEvent.description || <span className="italic text-gray-400">No description</span>}
                </p>
              </div>
              {readOnly && (
                <div className="flex items-center text-gray-700">
                  <span className="font-medium mr-2">Status:</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 capitalize">
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
              </>)}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {!readOnly && (
              <button
                onClick={handleDeleteEvent}
                className="px-5 py-2.5 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors"
              >
                Delete Event
              </button>
              )}
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