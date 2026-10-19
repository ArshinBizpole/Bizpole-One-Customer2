// Event types with different colors
export const EVENT_TYPES = {
  MEETING: {
    name: "Meeting",
    color: "bg-amber-100",
    border: "border-l-amber-400",
    text: "text-amber-800",
    icon: "MEETING"
  },
  PRESENTATION: {
    name: "Presentation",
    color: "bg-blue-100",
    border: "border-l-blue-400",
    text: "text-blue-800",
    icon: "PRESENTATION"
  },
  TEAM: {
    name: "Team Event",
    color: "bg-purple-100",
    border: "border-l-purple-400",
    text: "text-purple-800",
    icon: "TEAM"
  },
  PERSONAL: {
    name: "Personal",
    color: "bg-green-100",
    border: "border-l-green-400",
    text: "text-green-800",
    icon: "PERSONAL"
  },
  // A call-back the customer requested (Request a Call / Talk to an Advisor /
  // Customer support), loaded from the server — read-only on the calendar.
  CALL_BACK: {
    name: "Call Back",
    color: "bg-sky-100",
    border: "border-l-sky-400",
    text: "text-sky-800",
    icon: "CALL_BACK"
  }
};

// Meeting types
export const MEETING_TYPES = {
  IN_PERSON: { name: "In Person", icon: "IN_PERSON" },
  VIDEO: { name: "Video Call", icon: "VIDEO" },
  PHONE: { name: "Phone Call", icon: "PHONE" }
};
