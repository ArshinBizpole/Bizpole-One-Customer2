import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { motion } from "framer-motion";

// Import components
import CalendarHeader from "../components/Calender/CalendarHeader";
import CalendarSidebar from "../components/Calender/CalendarSidebar";
import EventComponent from "../components/Calender/EventComponent";
import CalendarToolbar from "../components/Calender/CalendarToolbar";
import CalendarDayHeader from "../components/Calender/CalendarDayHeader";
import { EventDetailsModal, AddEventModal } from "../components/Calender/EventModals";
import { initialEvents, EVENT_TYPES } from "../components/Calender/constants";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarPage = () => {
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState(initialEvents);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: new Date(),
    end: new Date(Date.now() + 60 * 60 * 1000),
    type: "MEETING",
    meetingType: "IN_PERSON",
    description: "",
    location: "",
    attendees: ""
  });
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Handle date navigation
  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  // Handle event selection
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  // Handle slot selection for new events
  const handleSelectSlot = ({ start, end }) => {
    setNewEvent({
      ...newEvent,
      start,
      end: new Date(end.getTime() + 60 * 60 * 1000),
    });
    setShowEventModal(true);
    setSelectedEvent(null);
  };

  // Add a new event
  const handleAddEvent = () => {
    const attendeesArray = newEvent.attendees
      ? newEvent.attendees.split(",").map(item => item.trim())
      : [];

    const eventType = EVENT_TYPES[newEvent.type] || EVENT_TYPES.MEETING;

    const event = {
      id: Date.now(),
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      type: newEvent.type,
      meetingType: newEvent.meetingType,
      description: newEvent.description,
      location: newEvent.location,
      attendees: attendeesArray,
      color: eventType.color,
      priority: newEvent.priority || 'Medium',
      days: newEvent.days || [],
      repeat: newEvent.repeat || false,
    };

    setEvents([...events, event]);
    setActiveFilter("ALL");
    setShowEventModal(false);
    setNewEvent({
      title: "",
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000),
      type: "MEETING",
      meetingType: "IN_PERSON",
      description: "",
      location: "",
      attendees: "",
      priority: "Medium",
      days: [],
      repeat: false,
    });
  };

  // Delete an event
  const handleDeleteEvent = () => {
    if (selectedEvent) {
      setEvents(events.filter(event => event.id !== selectedEvent.id));
      setSelectedEvent(null);
    }
  };

  // Update an event
  const handleUpdateEvent = (updatedEvent) => {
    setEvents(events.map(event => (event.id === updatedEvent.id ? updatedEvent : event)));
    setSelectedEvent(null);
  };

  // Filter events by type
  const filteredEvents =
    activeFilter === "ALL"
      ? events
      : events.filter(event => event.type === activeFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      <CalendarHeader />

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <CalendarSidebar
            handleSelectSlot={handleSelectSlot}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            events={events}
            setSelectedEvent={setSelectedEvent}
          />

          {/* Main Calendar */}
          <div className="lg:w-3/4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl overflow-hidden border-2 border-amber-300 shadow-sm"
            >
              <Calendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                date={date}
                onNavigate={handleNavigate}
                view={view}
                onView={setView}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                style={{ height: 700 }}
                views={["month", "week", "day"]}
                components={{
                  event: EventComponent,
                  header: CalendarDayHeader,
                  toolbar: (props) => (
                    <CalendarToolbar {...props} view={view} setView={setView} />
                  ),
                }}
                className="rounded-xl"
              />
            </motion.div>
          </div>
        </div>

        {/* Modals */}
        {selectedEvent && (
          <EventDetailsModal
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            handleDeleteEvent={handleDeleteEvent}
            handleUpdateEvent={handleUpdateEvent}
          />
        )}

        {showEventModal && (
          <AddEventModal
            showEventModal={showEventModal}
            setShowEventModal={setShowEventModal}
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            handleAddEvent={handleAddEvent}
          />
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
