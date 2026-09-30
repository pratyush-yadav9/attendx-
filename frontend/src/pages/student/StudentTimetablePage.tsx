import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  BookOpen, 
  CheckCircle2, 
  QrCode, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { TimetableGrouped } from '../../types';

export const StudentTimetablePage: React.FC = () => {
  const [timetable, setTimetable] = useState<TimetableGrouped | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Day tabs
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedDay, setSelectedDay] = useState<string>(
    days.includes(todayDayName) ? todayDayName : 'Monday'
  );

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await studentService.getTimetable();
      setTimetable(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load timetable.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentSlotTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const currentTime = currentSlotTime();
  const isViewingToday = selectedDay === todayDayName;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading weekly academic schedule...</p>
        </div>
      </div>
    );
  }

  if (error || !timetable) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load timetable</h2>
          <p className="text-xs text-attendx-muted">{error || 'Server error occurred.'}</p>
          <button onClick={loadTimetable} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const daySlots = timetable[selectedDay] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
            Academic Schedule
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Weekly Class Timetable
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Department-assigned lecture slots, designated rooms, and faculty schedules.
          </p>
        </div>

        <Link
          to="/verify"
          className="attendx-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 self-start sm:self-auto rounded-xl shadow-sm"
        >
          <QrCode className="w-4 h-4 text-attendx-cyan" />
          Scan Class QR
        </Link>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const isToday = day === todayDayName;
          const isSelected = day === selectedDay;
          const count = (timetable[day] || []).length;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-attendx-navy text-white border-attendx-navy shadow-sm'
                  : 'bg-white text-attendx-muted border-attendx-border hover:bg-slate-50 hover:text-attendx-text'
              }`}
            >
              <span>{day}</span>
              {isToday && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold ${
                  isSelected ? 'bg-attendx-cyan text-slate-900' : 'bg-blue-100 text-attendx-blue'
                }`}>
                  Today
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slot Timeline List */}
      <div className="space-y-4">
        {daySlots.length > 0 ? (
          daySlots.map((slot, index) => {
            const isCurrentSlot = isViewingToday && slot.start_time <= currentTime && currentTime <= slot.end_time;
            const isPastSlot = isViewingToday && currentTime > slot.end_time;
            const isUpcomingSlot = isViewingToday && currentTime < slot.start_time;

            return (
              <div
                key={slot.id || index}
                className={`attendx-card p-6 transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  isCurrentSlot 
                    ? 'border-2 border-emerald-400 bg-gradient-to-r from-emerald-50/50 to-white shadow-md' 
                    : 'hover:shadow-md'
                }`}
              >
                {/* Active Indicator Strip */}
                {isCurrentSlot && (
                  <div className="absolute top-0 left-0 bottom-0 w-2 bg-emerald-500" />
                )}

                {/* Left: Timing & Period */}
                <div className="flex items-start sm:items-center gap-4 min-w-[200px]">
                  <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-xs shrink-0 ${
                    isCurrentSlot 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    <Clock className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px]">P{slot.slot_period || index + 1}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-attendx-navy font-mono">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>
                    <span className="text-[11px] text-attendx-muted font-medium">
                      Period {slot.slot_period || index + 1} (60 min)
                    </span>
                  </div>
                </div>

                {/* Middle: Subject, Instructor & Room */}
                <div className="flex-1 space-y-1 sm:border-l sm:border-slate-100 sm:pl-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-blue-50 text-attendx-blue px-2 py-0.5 rounded border border-blue-200">
                      {slot.subject_code}
                    </span>
                    <h3 className="text-base font-bold text-attendx-navy">
                      {slot.subject_name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-attendx-muted pt-1">
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-attendx-blue" />
                      <strong className="text-slate-700">{slot.teacher_name}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-attendx-blue" />
                      Room <strong>{slot.room_number}</strong>
                    </span>
                  </div>
                </div>

                {/* Right: Real-time Status Badge & Action */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {isViewingToday ? (
                    isCurrentSlot ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Live Now
                        </span>
                        <Link
                          to="/verify"
                          className="attendx-btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Mark Attendance
                        </Link>
                      </div>
                    ) : isPastSlot ? (
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        Completed
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-attendx-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        Upcoming Today
                      </span>
                    )
                  ) : (
                    <span className="text-xs font-medium text-attendx-muted">
                      Scheduled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="attendx-card p-12 text-center text-attendx-muted space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-attendx-navy">No lectures scheduled for {selectedDay}</h4>
            <p className="text-xs text-slate-400">
              There are no classes scheduled for your section on this day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
