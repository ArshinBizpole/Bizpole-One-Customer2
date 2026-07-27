import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';

const CalendarToolbar = (toolbar) => {
  const [showMenu, setShowMenu] = useState(false);

  const view = toolbar?.view || 'month';
  
  let date;
  if (toolbar?.date && !isNaN(new Date(toolbar.date).getTime())) {
    date = new Date(toolbar.date);
  } else {
    date = new Date();
    console.warn('Invalid date provided to CalendarToolbar, using current date');
  }

  const onView = toolbar?.onView || (() => {});
  const onNavigate = toolbar?.onNavigate || (() => {});

  const label = generateLabel(date, view);

  function generateLabel(currentDate, viewType) {
    try {
      if (isNaN(currentDate.getTime())) {
        currentDate = new Date();
      }

      if (viewType === 'month') {
        return currentDate.toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'long' 
        });
      } else if (viewType === 'week') {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startOfWeek.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })}`;
        } else {
          return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      } else if (viewType === 'day') {
        return currentDate.toLocaleDateString(undefined, { 
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
      } else {
        return currentDate.toLocaleDateString(undefined, { 
          year: 'numeric', month: 'long', day: 'numeric' 
        });
      }
    } catch (error) {
      console.error('Error generating calendar label:', error);
      return new Date().toLocaleDateString(undefined, { 
        year: 'numeric', month: 'long' 
      });
    }
  }

  const navigate = (action) => {
    if (typeof onNavigate === 'function') onNavigate(action);
  };

  const changeView = (viewName) => {
    if (typeof onView === 'function') onView(viewName);
    setShowMenu(false); // close menu after selecting
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
    {/* Today pill */}
    <button
      onClick={() => navigate('TODAY')}
      className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
    >
      Today
    </button>

    {/* Center nav group */}
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('PREV')}
        className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft size={16} className="text-gray-500" />
      </button>
      <h2 className="text-sm font-medium text-violet-600 whitespace-nowrap">
        {label}
      </h2>
      <button
        onClick={() => navigate('NEXT')}
        className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Next"
      >
        <ChevronRight size={16} className="text-gray-500" />
      </button>
    </div>

      {/* Right View Controls */}
      <div className="relative">
        {/* Desktop View Buttons */}
        <div className="hidden sm:flex items-center space-x-1 bg-gray-100 rounded-full p-1">
  {['month', 'week', 'day', 'agenda'].map((viewName) => (
    <button
      key={viewName}
      onClick={() => changeView(viewName)}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        view === viewName
          ? 'bg-white text-violet-600 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
    </button>
  ))}
</div>

        {/* Mobile 3-dot Menu */}
        <div className="sm:hidden">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              {['month', 'week', 'day', 'agenda'].map((viewName) => (
                <button
                  key={viewName}
                  onClick={() => changeView(viewName)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    view === viewName
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarToolbar;
