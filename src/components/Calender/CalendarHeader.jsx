import React from 'react';
// import { Calendar as CalendarIcon } from 'lucide-react';
// import { Calendar as CalendarIcon } from "lucide-react";
const CalendarHeader = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="ml-2 text-xl font-bold text-gray-800">Calendar</span>
            </div>
          </div>
{/*           
          <div className="flex items-center">
            <div className="relative mr-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search events..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              />
            </div>
            
            <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 mr-2">
              <Bell size={18} />
            </button>
            
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
              <User size={16} className="text-amber-600" />
            </div>
          </div> */}
        </div>
      </div>
    </header>
  );
};

export default CalendarHeader;