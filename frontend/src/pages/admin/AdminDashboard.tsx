import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  Wifi, 
  Clock, 
  Sliders, 
  FileText, 
  Bell, 
  Layers, 
  ArrowRight,
  CheckCircle2,
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { AdminDashboardStats } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [thresholdInput, setThresholdInput] = useState<number>(75);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState<boolean>(false);
  const [thresholdSuccessMsg, setThresholdSuccessMsg] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminService.getDashboardStats();
      setStats(res);
      setThresholdInput(res.configured_threshold);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingThreshold(true);
    setThresholdSuccessMsg(null);
    try {
      await adminService.setThreshold(thresholdInput);
      setThresholdSuccessMsg(`Attendance policy threshold updated to ${thresholdInput}%.`);
      const updated = await adminService.getDashboardStats();
      setStats(updated);
      setTimeout(() => setThresholdSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update threshold.');
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Compiling college attendance analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load admin analytics</h2>
          <p className="text-xs text-attendx-muted">{error}</p>
          <button onClick={loadDashboard} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
            HOD & Administrative Control Suite
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            College Overview & Compliance
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            System Administrator: <strong className="text-attendx-navy">{user?.full_name}</strong> ({user?.email}) • Role: HOD / Admin
          </p>
        </div>

        {/* Security Lock Badge */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-attendx-border shadow-sm self-start sm:self-auto">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Security Status</span>
            <span className="text-xs font-extrabold text-attendx-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Initial Setup Locked • 2FA Enforced
            </span>
          </div>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="attendx-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-attendx-blue flex items-center justify-center font-bold text-lg shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Enrolled Students
            </span>
            <span className="text-3xl font-black text-attendx-navy">
              {stats.total_students}
            </span>
            <span className="text-[10px] text-attendx-muted block mt-0.5">
              Active across sections
            </span>
          </div>
        </div>

        {/* Total Faculty */}
        <div className="attendx-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-attendx-success flex items-center justify-center font-bold text-lg shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Faculty Members
            </span>
            <span className="text-3xl font-black text-attendx-navy">
              {stats.total_teachers}
            </span>
            <span className="text-[10px] text-attendx-muted block mt-0.5">
              Subject instructors
            </span>
          </div>
        </div>

        {/* College Average Attendance */}
        <div className="attendx-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-lg shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Average Attendance
            </span>
            <span className="text-3xl font-black text-attendx-navy">
              {stats.average_attendance}%
            </span>
            <span className="text-[10px] text-attendx-muted block mt-0.5">
              Calculated real average
            </span>
          </div>
        </div>

        {/* Shortage / Below Threshold */}
        <div className="attendx-card p-6 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
            stats.students_below_threshold > 0 ? 'bg-red-50 text-attendx-danger' : 'bg-emerald-50 text-attendx-success'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Below Threshold ({stats.configured_threshold}%)
            </span>
            <span className={`text-3xl font-black ${
              stats.students_below_threshold > 0 ? 'text-attendx-danger' : 'text-attendx-navy'
            }`}>
              {stats.students_below_threshold}
            </span>
            <span className="text-[10px] text-attendx-muted block mt-0.5">
              Require academic alert
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Management Modules & Threshold Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Core Administrative Modules (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-base font-bold text-attendx-navy flex items-center gap-2">
            <Layers className="w-4 h-4 text-attendx-blue" />
            Core Administrative Modules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department Attendance Control */}
            <Link
              to="/admin/attendance-control"
              className="attendx-card p-5 hover:shadow-md transition-all group border-l-4 border-l-purple-600 flex flex-col justify-between sm:col-span-2 bg-gradient-to-r from-purple-50/30 via-white to-white"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-attendx-navy">
                    Department Attendance Control & Digital Register
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700">
                    HOD Override & Audit
                  </span>
                </div>
                <p className="text-xs text-attendx-muted mt-1 leading-relaxed">
                  Date-wise attendance editing for any calendar date, digital roll-call registers without QR codes, and transparent department modification audit trail.
                </p>
              </div>
              <span className="text-[11px] font-bold text-purple-700 mt-3 inline-block">
                Open Attendance Control & Register →
              </span>
            </Link>

            {/* Student Management */}
            <Link
              to="/admin/students"
              className="attendx-card p-5 hover:shadow-md transition-all group border-l-4 border-l-attendx-blue flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-attendx-blue flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-attendx-navy">
                  Student Directory & Promotion
                </h3>
                <p className="text-xs text-attendx-muted mt-1 leading-relaxed">
                  Manage student enrollment, inspect real-time calculated attendance, and execute semester promotions with immutable records.
                </p>
              </div>
              <span className="text-[11px] font-bold text-attendx-blue mt-4 inline-block">
                Manage {stats.total_students} Students →
              </span>
            </Link>

            {/* Faculty & Assignments */}
            <Link
              to="/admin/teachers"
              className="attendx-card p-5 hover:shadow-md transition-all group border-l-4 border-l-emerald-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-attendx-success flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-attendx-navy">
                  Faculty & Subject Assignments
                </h3>
                <p className="text-xs text-attendx-muted mt-1 leading-relaxed">
                  Register faculty accounts, allocate subjects and sections, and supervise teacher permissions.
                </p>
              </div>
              <span className="text-[11px] font-bold text-attendx-success mt-4 inline-block">
                Manage {stats.total_teachers} Teachers →
              </span>
            </Link>

            {/* Timetable Clash Scheduler */}
            <Link
              to="/admin/timetable"
              className="attendx-card p-5 hover:shadow-md transition-all group border-l-4 border-l-purple-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-attendx-navy">
                  Timetable & Clash Detection
                </h3>
                <p className="text-xs text-attendx-muted mt-1 leading-relaxed">
                  Schedule period slots with strict collision detection against room, teacher, and section schedules.
                </p>
              </div>
              <span className="text-[11px] font-bold text-purple-700 mt-4 inline-block">
                Open Clash Scheduler →
              </span>
            </Link>

            {/* Geofence & Wi-Fi Settings */}
            <Link
              to="/admin/settings"
              className="attendx-card p-5 hover:shadow-md transition-all group border-l-4 border-l-cyan-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-attendx-navy">
                  Geofence & Wi-Fi Configuration
                </h3>
                <p className="text-xs text-attendx-muted mt-1 leading-relaxed">
                  Define campus GPS coordinates, geofence radius in meters, approved SSIDs, and broadcast notices.
                </p>
              </div>
              <span className="text-[11px] font-bold text-cyan-700 mt-4 inline-block">
                Campus Policy Settings →
              </span>
            </Link>
          </div>
        </div>

        {/* Right Column: Attendance Policy Threshold & Audit Shortcut (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Threshold Configurator */}
          <div className="attendx-card p-6 bg-gradient-to-br from-white to-blue-50/50 border-blue-200 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-attendx-blue" />
              <h3 className="text-sm font-bold text-attendx-navy">
                Attendance Policy Rule
              </h3>
            </div>

            <p className="text-xs text-attendx-muted leading-relaxed">
              Minimum semester percentage required for academic exam eligibility. Changing this updates student status calculations instantly across all portals.
            </p>

            <form onSubmit={handleUpdateThreshold} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-attendx-muted uppercase mb-1">
                  Required Minimum Threshold (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    step={1}
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(Number(e.target.value))}
                    className="attendx-input text-sm font-bold text-attendx-navy w-28 text-center"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingThreshold}
                    className="attendx-btn-primary text-xs px-4 py-2 rounded-xl flex-1 flex items-center justify-center"
                  >
                    {isUpdatingThreshold ? 'Updating...' : 'Save Policy'}
                  </button>
                </div>
              </div>

              {thresholdSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-attendx-success border border-emerald-200 text-xs flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{thresholdSuccessMsg}</span>
                </div>
              )}
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-attendx-muted">
              <span>Active Threshold:</span>
              <strong className="text-attendx-navy font-bold">{stats.configured_threshold}%</strong>
            </div>
          </div>

          {/* Audit Logs Quick Shortcut */}
          <div className="attendx-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-700" />
              <h3 className="text-sm font-bold text-attendx-navy">
                System Audit Trail
              </h3>
            </div>
            <p className="text-xs text-attendx-muted leading-relaxed">
              Every critical action (attendance scan, geofence check, promotion, timetable change) is recorded with IP and user metadata.
            </p>
            <Link
              to="/admin/audit-logs"
              className="attendx-btn-secondary text-xs px-4 py-2 w-full flex items-center justify-center gap-1.5 rounded-xl"
            >
              Inspect Audit Logs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
