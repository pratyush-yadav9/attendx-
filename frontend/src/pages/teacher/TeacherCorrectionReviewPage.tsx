import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Filter, 
  MessageSquare, 
  User, 
  Calendar,
  X,
  Send
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';
import { TeacherCorrectionRequest } from '../../types';

export const TeacherCorrectionReviewPage: React.FC = () => {
  const [requests, setRequests] = useState<TeacherCorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review Modal state
  const [activeRequest, setActiveRequest] = useState<TeacherCorrectionRequest | null>(null);
  const [reviewComments, setReviewComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await teacherService.getCorrectionRequests();
      setRequests(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load correction appeals.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReview = (req: TeacherCorrectionRequest) => {
    setActiveRequest(req);
    setReviewComments('');
    setFeedback(null);
  };

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!activeRequest) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await teacherService.reviewCorrectionRequest(activeRequest.id, {
        status: decision,
        reviewer_comments: reviewComments.trim() || (decision === 'APPROVED' ? 'Approved by faculty.' : 'Rejected by faculty.')
      });

      setFeedback({
        type: 'success',
        message: `Appeal successfully ${decision.toLowerCase()}!`
      });

      // Reload list
      const updated = await teacherService.getCorrectionRequests();
      setRequests(updated);

      setTimeout(() => {
        setActiveRequest(null);
        setFeedback(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to ${decision.toLowerCase()} request.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading attendance correction inquiries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load appeals</h2>
          <p className="text-xs text-attendx-muted">{error}</p>
          <button onClick={loadRequests} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
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
          <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
            Faculty Inquiries
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Attendance Correction Appeals
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Review student-submitted discrepancy appeals, examine justifications, and approve manual adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              {pendingCount} Pending Review
            </span>
          )}
          <Link
            to="/teacher/dashboard"
            className="attendx-btn-secondary px-4 py-2 text-xs font-bold"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="attendx-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-attendx-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="attendx-input text-xs py-1.5 px-3"
          >
            <option value="ALL">All Statuses ({requests.length})</option>
            <option value="PENDING">Pending Only ({pendingCount})</option>
            <option value="APPROVED">Approved ({requests.filter(r => r.status === 'APPROVED').length})</option>
            <option value="REJECTED">Rejected ({requests.filter(r => r.status === 'REJECTED').length})</option>
          </select>
        </div>

        <span className="text-xs text-attendx-muted font-medium">
          Showing {filteredRequests.length} requests
        </span>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div 
                key={req.id}
                className="attendx-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Top status accent */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isApproved ? 'bg-attendx-success' : isRejected ? 'bg-attendx-danger' : 'bg-attendx-warning'
                }`} />

                <div className="space-y-4">
                  {/* Top: Student Info & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-attendx-blue font-black flex items-center justify-center text-sm shrink-0">
                        {req.student_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-attendx-navy">
                          {req.student_name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-attendx-muted mt-0.5 font-mono">
                          <span>{req.registration_number}</span>
                          <span>•</span>
                          <span>Roll {req.roll_number}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      isApproved
                        ? 'bg-emerald-50 text-attendx-success border-emerald-200'
                        : isRejected
                        ? 'bg-red-50 text-attendx-danger border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {/* Subject & Lecture Date */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-attendx-blue text-[11px] block">
                        {req.subject_code}
                      </span>
                      <span className="font-semibold text-attendx-navy">
                        {req.subject_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-attendx-muted block">Session Date</span>
                      <span className="font-bold text-slate-700">{req.class_date}</span>
                    </div>
                  </div>

                  {/* Student's Stated Reason */}
                  <div className="text-xs space-y-1">
                    <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
                      Student's Written Justification:
                    </span>
                    <p className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 text-slate-700 italic leading-relaxed">
                      "{req.reason}"
                    </p>
                  </div>

                  {/* Faculty Comments if already reviewed */}
                  {req.reviewer_comments && (
                    <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-attendx-navy block">
                        Faculty Feedback Record:
                      </span>
                      <p className="text-slate-600">{req.reviewer_comments}</p>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-attendx-muted">
                    Filed on {req.created_at}
                  </span>

                  {isPending ? (
                    <button
                      onClick={() => handleOpenReview(req)}
                      className="attendx-btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Review Appeal
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">
                      Decision Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 attendx-card p-12 text-center text-attendx-muted space-y-2">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-attendx-navy">No correction appeals found</h4>
            <p className="text-xs text-slate-400">
              There are no pending or archived correction inquiries matching the filter.
            </p>
          </div>
        )}
      </div>

      {/* REVIEW DECISION MODAL */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Review Correction Appeal
                </h3>
                <p className="text-xs text-attendx-muted">
                  Official evaluation by assigned course instructor.
                </p>
              </div>
              <button
                onClick={() => setActiveRequest(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student & Session Info */}
            <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-attendx-navy">
                <span>{activeRequest.student_name} ({activeRequest.registration_number})</span>
                <span className="font-mono text-attendx-blue">{activeRequest.subject_code}</span>
              </div>
              <p className="text-slate-600 italic bg-white p-2 rounded-lg border border-blue-100">
                "{activeRequest.reason}"
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-attendx-navy mb-1.5">
                Faculty Remarks / Justification Note
              </label>
              <textarea
                rows={3}
                placeholder="Optional explanation for audit records (e.g. Validated network outage during session)..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                className="attendx-input text-xs w-full resize-none"
              />
            </div>

            {feedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 text-attendx-success border border-emerald-200' 
                  : 'bg-red-50 text-attendx-danger border border-red-200'
              }`}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="attendx-btn-secondary text-xs px-4 py-2.5 w-full sm:w-auto"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDecision('REJECTED')}
                  className="attendx-btn-danger text-xs px-4 py-2.5 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Appeal
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDecision('APPROVED')}
                  className="attendx-btn-primary text-xs px-5 py-2.5 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve (Mark Present)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
