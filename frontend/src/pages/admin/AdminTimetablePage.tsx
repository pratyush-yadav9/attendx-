import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  MapPin, 
  User as UserIcon, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Filter,
  X
} from 'lucide-react';
import { 
  adminService, 
  AdminTimetableSlot, 
  AcademicOverview, 
  AdminTeacherItem 
} from '../../services/adminService';

export const AdminTimetablePage: React.FC = () => {
  const [slots, setSlots] = useState<AdminTimetableSlot[]>([]);
  const [academic, setAcademic] = useState<AcademicOverview | null>(null);
  const [teachers, setTeachers] = useState<AdminTeacherItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Day filter
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Schedule Slot Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [slotForm, setSlotForm] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    slot_period: 'Period 1 (Morning)',
    subject_id: '',
    teacher_id: '',
    classroom_id: '',
    section_id: '',
    semester_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [clashError, setClashError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [slotsRes, acadRes, tchRes] = await Promise.all([
        adminService.getTimetableSlots(),
        adminService.getAcademicOverview(),
        adminService.getTeachers()
      ]);
      setSlots(slotsRes);
      setAcademic(acadRes);
      setTeachers(tchRes);

      if (acadRes.subjects.length > 0 && tchRes.length > 0 && acadRes.classrooms.length > 0) {
        setSlotForm(prev => ({
          ...prev,
          subject_id: acadRes.subjects[0].id,
          teacher_id: tchRes[0].id,
          classroom_id: acadRes.classrooms[0].id,
          section_id: acadRes.sections[0]?.id || '',
          semester_id: acadRes.semesters[0]?.id || ''
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load timetable slots.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setClashError(null);
    setSuccessMsg(null);

    try {
      await adminService.createTimetableSlot(slotForm);
      setSuccessMsg('Lecture slot scheduled with zero clashes verified!');
      const updatedSlots = await adminService.getTimetableSlots();
      setSlots(updatedSlots);

      setTimeout(() => {
        setIsScheduleModalOpen(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setClashError(err.message || 'Scheduling conflict detected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to remove this timetable slot?')) return;
    try {
      await adminService.deleteTimetableSlot(slotId);
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete slot.');
    }
  };

  const daySlots = slots.filter(s => s.day_of_week === selectedDay);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading timetable clash detection engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load timetable</h2>
          <p className="text-xs text-attendx-muted">{error}</p>
          <button onClick={loadAllData} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
            Academic Scheduling
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Timetable Scheduler & Clash Detection
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Automated conflict resolution ensuring room, instructor, and student section schedules never collide.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setClashError(null);
              setSuccessMsg(null);
              setIsScheduleModalOpen(true);
            }}
            className="attendx-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl shadow-sm bg-purple-700 hover:bg-purple-800"
          >
            <Plus className="w-4 h-4 text-attendx-cyan" />
            Schedule Lecture Slot
          </button>
          <Link
            to="/admin/dashboard"
            className="attendx-btn-secondary px-4 py-2.5 text-xs font-bold rounded-xl"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Day Selector Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const isSelected = day === selectedDay;
          const count = slots.filter(s => s.day_of_week === day).length;

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
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slots List */}
      <div className="space-y-4">
        {daySlots.length > 0 ? (
          daySlots.map((slot) => (
            <div
              key={slot.id}
              className="attendx-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Left: Time & Period */}
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex flex-col items-center justify-center font-bold text-xs shrink-0">
                  <Clock className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px]">{slot.slot_period.substring(0, 8)}</span>
                </div>
                <div>
                  <span className="text-base font-extrabold text-attendx-navy font-mono">
                    {slot.start_time} - {slot.end_time}
                  </span>
                  <span className="text-[11px] text-attendx-muted block font-medium">
                    {slot.day_of_week} ({slot.slot_period})
                  </span>
                </div>
              </div>

              {/* Middle: Course, Faculty, Room, Section */}
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
                  <span className="text-purple-700 font-semibold">
                    Sec {slot.section_name} • Sem {slot.semester_number}
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center justify-end gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-attendx-danger hover:bg-red-50 transition-colors"
                  title="Remove Slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="attendx-card p-12 text-center text-attendx-muted space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-attendx-navy">No lecture slots on {selectedDay}</h4>
            <p className="text-xs text-slate-400">
              Click "Schedule Lecture Slot" to add periods with automated clash detection.
            </p>
          </div>
        )}
      </div>

      {/* SCHEDULE LECTURE SLOT MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Schedule Class Lecture Slot
                </h3>
                <p className="text-xs text-attendx-muted">
                  Backend will detect and block room, teacher, or section clashes.
                </p>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Day of Week
                  </label>
                  <select
                    value={slotForm.day_of_week}
                    onChange={(e) => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    className="attendx-input text-xs w-full font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    className="attendx-input text-xs w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1">
                  Subject Course
                </label>
                <select
                  value={slotForm.subject_id}
                  onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })}
                  className="attendx-input text-xs w-full"
                  required
                >
                  {academic?.subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Faculty Instructor
                  </label>
                  <select
                    value={slotForm.teacher_id}
                    onChange={(e) => setSlotForm({ ...slotForm, teacher_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Classroom / Lecture Hall
                  </label>
                  <select
                    value={slotForm.classroom_id}
                    onChange={(e) => setSlotForm({ ...slotForm, classroom_id: e.target.value })}
                    className="attendx-input text-xs w-full font-bold"
                    required
                  >
                    {academic?.classrooms.map(c => (
                      <option key={c.id} value={c.id}>{c.room_number} ({c.building}, cap: {c.capacity})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Semester
                  </label>
                  <select
                    value={slotForm.semester_id}
                    onChange={(e) => setSlotForm({ ...slotForm, semester_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {academic?.semesters.map(s => (
                      <option key={s.id} value={s.id}>Semester {s.semester_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Section
                  </label>
                  <select
                    value={slotForm.section_id}
                    onChange={(e) => setSlotForm({ ...slotForm, section_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {academic?.sections.map(sec => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {clashError && (
                <div className="p-3.5 rounded-2xl bg-red-50 text-attendx-danger border border-red-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Collision Detected (Clash Blocked)</p>
                    <p className="mt-0.5 leading-relaxed">{clashError}</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-attendx-success border border-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="attendx-btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="attendx-btn-primary text-xs px-5 py-2 flex items-center gap-2 bg-purple-700 hover:bg-purple-800"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
