import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  QrCode, 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Calculator,
  User,
  MapPin,
  TrendingUp,
  Sparkles,
  Scan,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import { StudentDashboardData } from '../../types';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Attendance Calculator local state
  const [simulatedClasses, setSimulatedClasses] = useState<number>(5);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await studentService.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load student dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-attendx-muted">Loading live attendance records...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load dashboard</h2>
          <p className="text-xs text-attendx-muted">{error || 'Server error occurred.'}</p>
          <button onClick={loadDashboard} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { overall_attendance, today_classes, next_class, student } = data;
  const isHealthy = overall_attendance.percentage >= overall_attendance.required_percentage;

  // Real Attendance Calculator: what if student attends next `simulatedClasses` classes?
  const simulatedTotal = overall_attendance.total + simulatedClasses;
  const simulatedPresent = overall_attendance.present + simulatedClasses;
  const simulatedPct = simulatedTotal > 0 ? ((simulatedPresent / simulatedTotal) * 100).toFixed(1) : '100.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
            Student Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            {getGreeting()}, {student.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-attendx-blue border border-blue-200">
              {student.department} ({student.department_code})
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Section {student.section}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Semester {student.semester}
            </span>
            <span className="text-xs font-mono text-attendx-muted ml-1">
              Roll No: {student.roll_number}
            </span>
          </div>
        </div>

        <Link
          to="/verify"
          className="attendx-btn-primary px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg self-start sm:self-auto rounded-xl"
        >
          <Scan className="w-5 h-5 text-attendx-cyan" />
          Face & QR Attendance
        </Link>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Overall Attendance Card */}
        <div className="lg:col-span-2 attendx-card p-6 sm:p-8 bg-gradient-to-br from-white via-white to-blue-50/40 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-attendx-muted uppercase tracking-wider">
                Overall Semester Attendance
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl sm:text-5xl font-black text-attendx-navy tracking-tight">
                  {overall_attendance.percentage}%
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  isHealthy 
                    ? 'bg-emerald-50 text-attendx-success border-emerald-200' 
                    : 'bg-red-50 text-attendx-danger border-red-200'
                }`}>
                  {overall_attendance.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs sm:text-sm">
              <div>
                <span className="text-attendx-muted block text-xs">Present Classes</span>
                <span className="font-extrabold text-attendx-navy text-lg">{overall_attendance.present}</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200"></div>
              <div>
                <span className="text-attendx-muted block text-xs">Total Classes</span>
                <span className="font-extrabold text-attendx-navy text-lg">{overall_attendance.total}</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200"></div>
              <div>
                <span className="text-attendx-muted block text-xs">Required Target</span>
                <span className="font-extrabold text-attendx-blue text-lg">{overall_attendance.required_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-attendx-muted">Attendance Progress</span>
              <span className={isHealthy ? 'text-attendx-success' : 'text-attendx-danger'}>
                {isHealthy ? 'Above Threshold' : `Shortage: Need ${overall_attendance.shortage_classes} classes to reach 75%`}
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHealthy ? 'bg-attendx-success' : 'bg-attendx-danger'
                }`}
                style={{ width: `${Math.min(overall_attendance.percentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-attendx-muted">
              Threshold configured by college administration: <strong className="text-attendx-navy">{overall_attendance.required_percentage}%</strong>
            </span>
            <Link to="/student/attendance" className="font-bold text-attendx-blue hover:underline flex items-center gap-1">
              View Subject Breakdown <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Next Class Widget & Quick Links */}
        <div className="space-y-6">
          {/* Next Class Card */}
          <div className="attendx-card p-6 border-blue-200 bg-white shadow-attendx">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Next Scheduled Class
              </span>
              {next_class?.status === 'Live' && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>

            {next_class ? (
              <div className="space-y-2.5">
                <h3 className="text-lg font-bold text-attendx-navy">
                  {next_class.subject_name}
                </h3>
                <div className="text-xs text-attendx-muted space-y-1">
                  <p className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-attendx-blue" />
                    <span>{next_class.teacher_name}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-attendx-blue" />
                    <span>Room {next_class.room_number}</span>
                  </p>
                  <p className="flex items-center gap-2 font-mono">
                    <Clock className="w-3.5 h-3.5 text-attendx-blue" />
                    <span>{next_class.start_time} - {next_class.end_time}</span>
                  </p>
                </div>

                <div className="pt-2">
                  {next_class.has_marked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-attendx-success bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" /> Marked Present
                    </span>
                  ) : next_class.status === 'Live' ? (
                    <Link
                      to={next_class.current_qr_token ? `/verify?token=${next_class.current_qr_token}` : '/verify'}
                      className="w-full attendx-btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl"
                    >
                      <QrCode className="w-4 h-4" />
                      Class Is Live: Mark Attendance
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-attendx-muted bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                      Status: Upcoming
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-attendx-muted text-xs">
                No more classes scheduled for today.
              </div>
            )}
          </div>

          {/* Interactive Attendance Calculator Card */}
          <div className="attendx-card p-6 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-attendx-blue" />
              <h3 className="text-xs font-bold text-attendx-navy uppercase tracking-wider">Attendance Target Calculator</h3>
            </div>
            <p className="text-[11px] text-attendx-muted mb-3">
              Simulate your percentage if you attend upcoming consecutive classes:
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-attendx-muted">Simulate attending next:</span>
                <span className="font-bold text-attendx-navy bg-white px-2 py-0.5 rounded border border-slate-200">
                  +{simulatedClasses} classes
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={simulatedClasses}
                onChange={(e) => setSimulatedClasses(parseInt(e.target.value))}
                className="w-full accent-attendx-blue cursor-pointer"
              />
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-attendx-muted">Projected Attendance:</span>
                <span className="font-extrabold text-attendx-blue text-sm">
                  {simulatedPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Classes List (Section 10) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-attendx-navy flex items-center gap-2">
            <Calendar className="w-5 h-5 text-attendx-blue" />
            Today's Classes
          </h2>
          <span className="text-xs font-medium text-attendx-muted">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {today_classes.length === 0 ? (
          <div className="attendx-card p-10 text-center text-attendx-muted text-xs">
            No classes scheduled for today. Enjoy your day!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {today_classes.map((cls, idx) => {
              const isClassLive = cls.status === 'Live';
              const isMarked = cls.has_marked;

              return (
                <div 
                  key={idx} 
                  className={`attendx-card p-5 flex flex-col justify-between transition-all ${
                    isClassLive ? 'border-attendx-blue ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {cls.subject_code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isMarked 
                          ? 'bg-emerald-100 text-attendx-success' 
                          : isClassLive 
                          ? 'bg-blue-100 text-attendx-blue animate-pulse' 
                          : cls.status === 'Completed' 
                          ? 'bg-slate-100 text-slate-500' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {cls.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-attendx-navy line-clamp-1 mb-1.5">
                      {cls.subject_name}
                    </h3>

                    <div className="text-xs text-attendx-muted space-y-1">
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{cls.teacher_name}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Room {cls.room_number}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cls.start_time} - {cls.end_time}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {isMarked ? (
                      <span className="text-xs font-semibold text-attendx-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Attendance Marked
                      </span>
                    ) : isClassLive ? (
                      <Link
                        to={cls.current_qr_token ? `/verify?token=${cls.current_qr_token}` : '/verify'}
                        className="attendx-btn-primary text-xs py-2 w-full flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Mark Attendance
                      </Link>
                    ) : (
                      <span className="text-xs text-attendx-muted">
                        {cls.status === 'Completed' ? 'Class ended' : 'Session scheduled'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
