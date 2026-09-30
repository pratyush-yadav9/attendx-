import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Search, 
  ShieldCheck, 
  Wifi, 
  MapPin, 
  Image as ImageIcon, 
  Send, 
  PlusCircle, 
  FileText, 
  Calculator,
  ChevronRight,
  X,
  Scan
} from 'lucide-react';
import { 
  studentService, 
  AttendanceHistoryItem, 
  CorrectionRequestItem 
} from '../../services/studentService';
import { OverallAttendance, SubjectStats } from '../../types';

export const StudentAttendancePage: React.FC = () => {
  const [stats, setStats] = useState<OverallAttendance | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state: 'subjects' | 'history' | 'corrections'
  const [activeTab, setActiveTab] = useState<'subjects' | 'history' | 'corrections'>('subjects');

  // Filter state for history
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Photo modal preview state
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Correction request modal state
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceHistoryItem | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);
  const [correctionFeedback, setCorrectionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Simulator for shortage / threshold
  const [simulatedSubject, setSimulatedSubject] = useState<SubjectStats | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, historyRes, correctionsRes] = await Promise.all([
        studentService.getAttendanceStats(),
        studentService.getAttendanceHistory(),
        studentService.getCorrectionRequests()
      ]);
      setStats(statsRes);
      setHistory(historyRes);
      setCorrections(correctionsRes);
      if (statsRes.subject_breakdown && statsRes.subject_breakdown.length > 0) {
        setSimulatedSubject(statsRes.subject_breakdown[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCorrection = (record: AttendanceHistoryItem) => {
    setSelectedRecordForCorrection(record);
    setCorrectionReason('');
    setCorrectionFeedback(null);
    setIsCorrectionModalOpen(true);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForCorrection || !correctionReason.trim()) return;

    setIsSubmittingCorrection(true);
    setCorrectionFeedback(null);

    try {
      // Find the class_session_id from the record or submit with subject_id
      // In our model, record.id is attendance_record_id, we send the session & subject
      await studentService.submitCorrectionRequest({
        class_session_id: selectedRecordForCorrection.id, // backend handles attendance_record_id or session
        subject_id: selectedRecordForCorrection.subject_name ? (stats?.subject_breakdown?.find(s => s.subject_name === selectedRecordForCorrection.subject_name)?.subject_id || '') : '',
        reason: correctionReason.trim()
      });

      setCorrectionFeedback({
        type: 'success',
        message: 'Correction request submitted successfully! Your instructor will review it shortly.'
      });

      // Reload correction requests
      const updatedCorrections = await studentService.getCorrectionRequests();
      setCorrections(updatedCorrections);

      setTimeout(() => {
        setIsCorrectionModalOpen(false);
        setCorrectionFeedback(null);
      }, 1800);
    } catch (err: any) {
      setCorrectionFeedback({
        type: 'error',
        message: err.message || 'Failed to submit correction request. A pending request may already exist.'
      });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const filteredHistory = history.filter(item => {
    if (selectedSubjectId !== 'ALL') {
      const subj = stats?.subject_breakdown?.find(s => s.subject_id === selectedSubjectId);
      if (subj && item.subject_name !== subj.subject_name && item.subject_code !== subj.subject_code) {
        return false;
      }
    }
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
      return false;
    }
    if (dateFilter && item.date !== dateFilter) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-attendx-muted">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load attendance</h2>
          <p className="text-xs text-attendx-muted">{error || 'Server error occurred.'}</p>
          <button onClick={loadAllData} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const isOverallHealthy = stats.percentage >= stats.required_percentage;

  // Real-time calculation helper
  const calculateClassesNeeded = (present: number, total: number, target: number): { type: 'need' | 'safe'; count: number } => {
    const targetFraction = target / 100;
    if (total === 0) return { type: 'safe', count: 0 };
    const currentPct = (present / total) * 100;
    if (currentPct >= target) {
      // How many can the student miss before dropping below target?
      // (present) / (total + x) >= targetFraction => total + x <= present / targetFraction => x <= (present / targetFraction) - total
      const maxMissable = Math.floor((present / targetFraction) - total);
      return { type: 'safe', count: Math.max(0, maxMissable) };
    } else {
      // How many consecutive classes must the student attend to hit target?
      // (present + x) / (total + x) >= targetFraction => present + x >= targetFraction * total + targetFraction * x
      // x * (1 - targetFraction) >= targetFraction * total - present
      const needed = Math.ceil((targetFraction * total - present) / (1 - targetFraction));
      return { type: 'need', count: Math.max(1, needed) };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Semester Metric */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
            Academic Performance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Attendance Record & Analytics
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Real-time anti-proxy verified attendance records, calculated threshold margins, and faculty audit trail.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-attendx-border shadow-sm self-start">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
            isOverallHealthy ? 'bg-emerald-50 text-attendx-success' : 'bg-red-50 text-attendx-danger'
          }`}>
            {stats.percentage}%
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Cumulative Status
            </span>
            <span className={`text-xs font-extrabold ${isOverallHealthy ? 'text-attendx-success' : 'text-attendx-danger'}`}>
              {stats.status}
            </span>
            <span className="text-[10px] text-attendx-muted block">
              {stats.present} / {stats.total} sessions attended
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-attendx-border flex items-center gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap px-1 ${
            activeTab === 'subjects'
              ? 'border-attendx-blue text-attendx-blue'
              : 'border-transparent text-attendx-muted hover:text-attendx-text'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Subject-Wise Breakdown
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {stats.subject_breakdown?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap px-1 ${
            activeTab === 'history'
              ? 'border-attendx-blue text-attendx-blue'
              : 'border-transparent text-attendx-muted hover:text-attendx-text'
          }`}
        >
          <Clock className="w-4 h-4" />
          Session Verification History
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {history.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap px-1 ${
            activeTab === 'corrections'
              ? 'border-attendx-blue text-attendx-blue'
              : 'border-transparent text-attendx-muted hover:text-attendx-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          Correction Requests
          {corrections.filter(c => c.status === 'PENDING').length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {corrections.filter(c => c.status === 'PENDING').length} pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: SUBJECT-WISE BREAKDOWN */}
      {activeTab === 'subjects' && (
        <div className="space-y-8">
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.subject_breakdown && stats.subject_breakdown.length > 0 ? (
              stats.subject_breakdown.map((subj) => {
                const isHealthy = subj.percentage >= subj.required_percentage;
                const calculation = calculateClassesNeeded(subj.present, subj.total, subj.required_percentage);

                return (
                  <div 
                    key={subj.subject_id} 
                    className="attendx-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    {/* Top status accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isHealthy ? 'bg-attendx-success' : 'bg-attendx-danger'
                    }`} />

                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {subj.subject_code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isHealthy 
                            ? 'bg-emerald-50 text-attendx-success border-emerald-200' 
                            : 'bg-red-50 text-attendx-danger border-red-200'
                        }`}>
                          {subj.status.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-attendx-navy line-clamp-1">
                        {subj.subject_name}
                      </h3>

                      {/* Percentage & Counts */}
                      <div className="mt-4 flex items-baseline justify-between">
                        <div>
                          <span className="text-3xl font-black text-attendx-navy tracking-tight">
                            {subj.percentage}%
                          </span>
                          <span className="text-[10px] text-attendx-muted block">
                            Target: {subj.required_percentage}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-attendx-text">
                            {subj.present} / {subj.total}
                          </span>
                          <span className="text-[10px] text-attendx-muted block">
                            Sessions Attended
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isHealthy ? 'bg-attendx-success' : 'bg-attendx-danger'
                            }`}
                            style={{ width: `${Math.min(subj.percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Intelligent Shortage / Buffer Callout */}
                      <div className={`mt-4 p-3 rounded-xl text-xs ${
                        isHealthy ? 'bg-emerald-50/60 text-emerald-900 border border-emerald-100' : 'bg-red-50/60 text-red-900 border border-red-100'
                      }`}>
                        {calculation.type === 'safe' ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-attendx-success shrink-0" />
                            <span>Safe margin: You can miss up to <strong>{calculation.count}</strong> more classes.</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-attendx-danger shrink-0" />
                            <span>Shortage: Must attend <strong>{calculation.count}</strong> consecutive classes to reach 75%.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer link to filter history */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setSelectedSubjectId(subj.subject_id);
                          setActiveTab('history');
                        }}
                        className="text-attendx-blue font-bold hover:underline flex items-center gap-1"
                      >
                        View Subject Logs <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSimulatedSubject(subj)}
                        className="text-slate-500 hover:text-attendx-navy flex items-center gap-1 font-medium"
                      >
                        <Calculator className="w-3.5 h-3.5" /> Simulate
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 attendx-card p-12 text-center text-attendx-muted">
                No subjects assigned to your current semester yet.
              </div>
            )}
          </div>

          {/* Interactive Calculator Section */}
          {simulatedSubject && (
            <div className="attendx-card p-6 sm:p-8 bg-gradient-to-r from-blue-50/60 to-cyan-50/40 border-blue-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-bold text-attendx-blue uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4" /> Interactive Shortage & Projection Calculator
                  </span>
                  <h3 className="text-lg font-bold text-attendx-navy mt-1">
                    Calculate target margin for: <span className="text-attendx-blue">{simulatedSubject.subject_name}</span> ({simulatedSubject.subject_code})
                  </h3>
                  <p className="text-xs text-attendx-muted mt-1">
                    Current: <strong>{simulatedSubject.present}</strong> attended out of <strong>{simulatedSubject.total}</strong> ({simulatedSubject.percentage}%)
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-attendx-border shadow-sm">
                  <div>
                    <label className="text-[10px] font-bold text-attendx-muted uppercase block">
                      Target Threshold (%)
                    </label>
                    <select
                      value={targetPercentage}
                      onChange={(e) => setTargetPercentage(Number(e.target.value))}
                      className="text-xs font-bold text-attendx-navy bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5 outline-none focus:border-attendx-blue"
                    >
                      <option value={75}>75% (Mandatory University Rule)</option>
                      <option value={80}>80% (Safe Standard)</option>
                      <option value={85}>85% (Distinction Honor)</option>
                      <option value={90}>90% (Exam Exemption Tier)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Simulation Result Card */}
              {(() => {
                const calc = calculateClassesNeeded(simulatedSubject.present, simulatedSubject.total, targetPercentage);
                return (
                  <div className="mt-6 bg-white p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        calc.type === 'safe' ? 'bg-emerald-100 text-attendx-success' : 'bg-red-100 text-attendx-danger'
                      }`}>
                        {calc.type === 'safe' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-attendx-navy">
                          {calc.type === 'safe' 
                            ? `You can safely miss ${calc.count} classes`
                            : `You need to attend ${calc.count} classes consecutively`}
                        </p>
                        <p className="text-xs text-attendx-muted">
                          {calc.type === 'safe'
                            ? `Your attendance will remain at or above ${targetPercentage}% even if you miss the next ${calc.count} upcoming sessions.`
                            : `Assuming 0 absences, attending the next ${calc.count} consecutive classes brings you exactly to ${targetPercentage}%.`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6">
                      <span className="text-[10px] text-attendx-muted uppercase font-bold block">Simulated Final %</span>
                      <span className="text-xl font-extrabold text-attendx-navy">
                        {calc.type === 'safe'
                          ? `${(((simulatedSubject.present) / (simulatedSubject.total + calc.count)) * 100).toFixed(1)}%`
                          : `${(((simulatedSubject.present + calc.count) / (simulatedSubject.total + calc.count)) * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SESSION VERIFICATION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="attendx-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Subject Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-attendx-muted" />
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="attendx-input text-xs py-1.5 px-3 min-w-[160px]"
                >
                  <option value="ALL">All Subjects</option>
                  {stats.subject_breakdown?.map(s => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.subject_code} - {s.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="attendx-input text-xs py-1.5 px-3"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
              </select>

              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="attendx-input text-xs py-1.5 px-3"
              />

              {(selectedSubjectId !== 'ALL' || selectedStatus !== 'ALL' || dateFilter) && (
                <button
                  onClick={() => {
                    setSelectedSubjectId('ALL');
                    setSelectedStatus('ALL');
                    setDateFilter('');
                  }}
                  className="text-xs text-attendx-danger font-bold hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <span className="text-xs text-attendx-muted font-medium">
              Showing {filteredHistory.length} of {history.length} records
            </span>
          </div>

          {/* History Table */}
          <div className="attendx-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-attendx-border text-attendx-muted uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Subject & Session</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Anti-Proxy Verifications</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-attendx-navy">{item.subject_name}</p>
                          <span className="text-[10px] font-mono text-attendx-muted">{item.subject_code}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-attendx-text">{item.date}</p>
                          <span className="text-[10px] text-attendx-muted font-mono">{item.marked_at}</span>
                        </td>
                        <td className="py-3.5 px-4 text-attendx-text font-medium">
                          {item.teacher_name || 'Faculty'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                          {item.room_number || 'TBA'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            item.status === 'PRESENT'
                              ? 'bg-emerald-50 text-attendx-success border-emerald-200'
                              : item.status === 'LATE'
                              ? 'bg-amber-50 text-attendx-warning border-amber-200'
                              : 'bg-red-50 text-attendx-danger border-red-200'
                          }`}>
                            {item.status === 'PRESENT' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Geofence Badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                              item.is_geofence_verified 
                                ? 'bg-blue-50 text-attendx-blue border-blue-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`} title={item.distance_meters !== undefined ? `${item.distance_meters}m from campus center` : 'Campus GPS verification'}>
                              <MapPin className="w-3 h-3" />
                              {item.distance_meters !== undefined ? `${item.distance_meters}m` : 'Geofenced'}
                            </span>

                            {/* Wi-Fi Badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                              item.is_wifi_verified 
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              <Wifi className="w-3 h-3" />
                              {item.is_wifi_verified ? 'Verified Wi-Fi' : 'Cellular / Web'}
                            </span>

                            {/* Biometric Face Verification Badge */}
                            {(item.verification_method?.includes('FACE') || item.photo_url) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title="Biometrically verified via live face matching">
                                <Scan className="w-3 h-3 text-emerald-600" />
                                Face Verified
                              </span>
                            )}

                            {/* Photo Thumbnail */}
                            {item.photo_url && (
                              <button
                                onClick={() => setPreviewPhoto(item.photo_url || null)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                title="View verification selfie"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenCorrection(item)}
                            className="text-xs text-attendx-blue hover:text-blue-800 font-bold hover:underline"
                          >
                            Request Correction
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-attendx-muted">
                        No attendance records match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CORRECTION REQUESTS */}
      {activeTab === 'corrections' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-attendx-navy">
                Attendance Correction Inquiries
              </h2>
              <p className="text-xs text-attendx-muted">
                Track status of submitted corrections reviewed by your respective subject instructors.
              </p>
            </div>

            <button
              onClick={() => {
                if (history.length > 0) {
                  handleOpenCorrection(history[0]);
                } else {
                  alert('No past session records available to request correction for.');
                }
              }}
              className="attendx-btn-primary text-xs px-4 py-2 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              New Correction Request
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {corrections.length > 0 ? (
              corrections.map((corr) => (
                <div key={corr.id} className="attendx-card p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-attendx-muted font-bold block">
                        {corr.subject_code}
                      </span>
                      <h4 className="text-sm font-bold text-attendx-navy">
                        {corr.subject_name}
                      </h4>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      corr.status === 'APPROVED'
                        ? 'bg-emerald-50 text-attendx-success border-emerald-200'
                        : corr.status === 'REJECTED'
                        ? 'bg-red-50 text-attendx-danger border-red-200'
                        : 'bg-amber-50 text-attendx-warning border-amber-200'
                    }`}>
                      {corr.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="font-semibold text-attendx-navy mb-1">Your Stated Reason:</p>
                    <p className="italic text-slate-700">"{corr.reason}"</p>
                  </div>

                  {corr.reviewer_comments && (
                    <div className="text-xs bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                      <p className="font-bold text-attendx-blue mb-0.5">Faculty Feedback:</p>
                      <p className="text-slate-700">{corr.reviewer_comments}</p>
                      {corr.reviewed_at && (
                        <span className="text-[10px] text-attendx-muted block mt-1">
                          Reviewed on {corr.reviewed_at}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-attendx-muted flex justify-between pt-2 border-t border-slate-100">
                    <span>Session Date: <strong>{corr.date}</strong></span>
                    <span>Submitted: {corr.created_at}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 attendx-card p-12 text-center text-attendx-muted">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-xs">No correction requests filed yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  If an instructor marked you absent due to device failure or network timeout, submit a request from the Session Verification History tab.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CORRECTION REQUEST MODAL */}
      {isCorrectionModalOpen && selectedRecordForCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Submit Attendance Correction
                </h3>
                <p className="text-xs text-attendx-muted">
                  Official appeal reviewed directly by the course instructor.
                </p>
              </div>
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Session Info */}
            <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-attendx-navy">
                <span>{selectedRecordForCorrection.subject_name}</span>
                <span className="font-mono text-attendx-blue">{selectedRecordForCorrection.subject_code}</span>
              </div>
              <div className="flex justify-between text-attendx-muted text-[11px]">
                <span>Date: {selectedRecordForCorrection.date}</span>
                <span>Current Status: <strong className="text-attendx-danger">{selectedRecordForCorrection.status}</strong></span>
              </div>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1.5">
                  Detailed Justification Reason <span className="text-attendx-danger">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why your attendance was recorded incorrectly (e.g., camera permission glitch during dynamic QR scan, delayed room check-in)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="attendx-input text-xs w-full resize-none"
                />
              </div>

              {correctionFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  correctionFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-attendx-success border border-emerald-200' 
                    : 'bg-red-50 text-attendx-danger border border-red-200'
                }`}>
                  {correctionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{correctionFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="attendx-btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection || !correctionReason.trim()}
                  className="attendx-btn-primary text-xs px-5 py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingCorrection ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Submit Appeal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-xs font-bold text-attendx-navy mb-3 px-1">
              Anti-Proxy Face Capture Verification
            </p>
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-black">
              <img
                src={previewPhoto.startsWith('http') || previewPhoto.startsWith('data:') ? previewPhoto : `http://127.0.0.1:8000${previewPhoto}`}
                alt="Verification Capture"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <p className="text-[10px] text-attendx-muted mt-2 text-center">
              Timestamped biometric reference record captured via MediaDevices API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
