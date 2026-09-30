import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { studentService, AcademicHistoryItem } from '../../services/studentService';

export const StudentAcademicHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<AcademicHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAcademicHistory();
  }, []);

  const loadAcademicHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await studentService.getAcademicHistory();
      setHistory(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load academic history.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Retrieving preserved semester records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load academic history</h2>
          <p className="text-xs text-attendx-muted">{error}</p>
          <button onClick={loadAcademicHistory} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
          Degree Progression
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
          Academic History & Semester Archives
        </h1>
        <p className="text-xs text-attendx-muted mt-1">
          Historical record of past semesters, finalized attendance ratios, and promotion audit records.
        </p>
      </div>

      {/* Info Callout */}
      <div className="attendx-card p-5 bg-gradient-to-r from-blue-50/60 to-cyan-50/40 border-blue-200 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-attendx-navy text-white flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-attendx-cyan" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-attendx-navy">
            Permanent Data Preservation Guarantee
          </h4>
          <p className="text-xs text-attendx-muted leading-relaxed mt-0.5">
            AttendX utilizes an immutable semester archive architecture. When your department HOD authorizes a semester promotion, your completed semester attendance logs, percentages, and biometric signatures are frozen permanently for regulatory and accreditation audits.
          </p>
        </div>
      </div>

      {/* Progression Timeline / Cards */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-attendx-navy flex items-center gap-2">
          <Layers className="w-4 h-4 text-attendx-blue" />
          Semester Progression History
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.length > 0 ? (
            history.map((sem, index) => {
              const isCurrent = sem.status === 'Current';
              const isHealthy = sem.percentage >= 75.0;

              return (
                <div
                  key={index}
                  className={`attendx-card p-6 relative overflow-hidden transition-shadow hover:shadow-md flex flex-col justify-between ${
                    isCurrent ? 'border-2 border-attendx-blue shadow-attendx' : ''
                  }`}
                >
                  {/* Top accent badge */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isCurrent ? 'bg-attendx-blue' : isHealthy ? 'bg-attendx-success' : 'bg-attendx-danger'
                  }`} />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                        Semester {sem.semester_number}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isCurrent
                          ? 'bg-blue-50 text-attendx-blue border-blue-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isCurrent ? 'IN PROGRESS' : 'ARCHIVED'}
                      </span>
                    </div>

                    <h4 className="text-lg font-extrabold text-attendx-navy">
                      Semester {sem.semester_number} Overall
                    </h4>

                    {/* Percentage */}
                    <div className="mt-4 flex items-baseline justify-between">
                      <div>
                        <span className="text-4xl font-black text-attendx-navy tracking-tight">
                          {sem.percentage}%
                        </span>
                        <span className="text-[10px] text-attendx-muted block">
                          Final Attendance Ratio
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                          isHealthy 
                            ? 'bg-emerald-50 text-attendx-success border-emerald-200' 
                            : 'bg-red-50 text-attendx-danger border-red-200'
                        }`}>
                          {isHealthy ? 'Eligible' : 'Detained'}
                        </span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="mt-3">
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isHealthy ? 'bg-attendx-success' : 'bg-attendx-danger'
                          }`}
                          style={{ width: `${Math.min(sem.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {sem.notes && (
                      <p className="text-xs text-slate-600 mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <strong>Notes:</strong> {sem.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-attendx-muted">
                    {sem.promotion_date ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Promoted: {sem.promotion_date}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-attendx-blue">
                        <Clock className="w-3.5 h-3.5" />
                        Current Ongoing Term
                      </span>
                    )}

                    <span className="font-mono text-slate-400">
                      Req: 75.0%
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 attendx-card p-12 text-center text-attendx-muted">
              No historical semester records available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
