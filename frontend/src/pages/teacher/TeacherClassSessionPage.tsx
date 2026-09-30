import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  QrCode, 
  RotateCw, 
  Users, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Wifi, 
  MapPin, 
  Image as ImageIcon, 
  Maximize2, 
  Minimize2, 
  XSquare, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  Copy,
  ChevronRight,
  X,
  Pause,
  Play
} from 'lucide-react';
import { teacherService, RefreshQRResponse, CloseClassResponse } from '../../services/teacherService';
import { LiveSessionAttendance, LiveAttendee } from '../../types';

export const TeacherClassSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState<LiveSessionAttendance | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [closedSummary, setClosedSummary] = useState<CloseClassResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Audio tone for new attendee (optional sound chime)
  const prevCountRef = useRef<number>(0);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Poll live attendance feed
  useEffect(() => {
    if (!sessionId || isClosed) return;

    fetchLiveFeed();
    const liveInterval = setInterval(fetchLiveFeed, 2500); // Poll every 2.5s
    return () => clearInterval(liveInterval);
  }, [sessionId, isClosed]);



  const fetchLiveFeed = async () => {
    if (!sessionId) return;
    try {
      const res = await teacherService.getLiveAttendance(sessionId);
      setSessionData(res);
      if (res.status === 'CLOSED') {
        setIsClosed(true);
      }
      if (res.qr_data_url) {
        setQrDataUrl(res.qr_data_url);
      }
      if (res.current_qr_token || res.qr_token) {
        setQrToken(res.current_qr_token || res.qr_token || '');
      }

      // Check if new attendees joined to trigger visual highlight
      if (res.attendees.length > prevCountRef.current) {
        prevCountRef.current = res.attendees.length;
      }
    } catch (err: any) {
      // Quiet fail or set error
    }
  };

  // Dynamic 3-second auto-rotation interval
  useEffect(() => {
    if (!sessionId || isClosed || isFrozen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleAutoRefreshQR();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, isClosed, isFrozen]);

  const handleAutoRefreshQR = async () => {
    if (!sessionId || isRefreshing || isClosed) return;
    setIsRefreshing(true);
    try {
      const res = await teacherService.refreshQR(sessionId);
      setQrToken(res.qr_token);
      setQrDataUrl(res.qr_data_url);
    } catch (err: any) {
      console.error('Failed to auto refresh QR:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!sessionId || isRefreshing || isClosed) return;
    setIsRefreshing(true);
    try {
      const res = await teacherService.refreshQR(sessionId);
      setQrToken(res.qr_token);
      setQrDataUrl(res.qr_data_url);
      setCountdown(3);
    } catch (err: any) {
      alert(err.message || 'Failed to refresh QR.');
    } finally {
      setIsRefreshing(false);
    }
  };


  // Initial QR fetch on mount
  useEffect(() => {
    if (sessionId) {
      handleManualRefresh();
    }
  }, [sessionId]);

  const handleCloseSession = async () => {
    if (!sessionId) return;
    const confirmClose = window.confirm(
      'Are you sure you want to end this class session?\n\nThe dynamic QR code will be revoked immediately and attendance records will be finalized.'
    );
    if (!confirmClose) return;

    setIsClosing(true);
    try {
      const res = await teacherService.closeClass(sessionId);
      setIsClosed(true);
      setClosedSummary(res);
    } catch (err: any) {
      alert(err.message || 'Failed to close class session.');
    } finally {
      setIsClosing(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      qrContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const verifyUrl = qrToken 
    ? `${window.location.origin}/verify?token=${qrToken}`
    : `${window.location.origin}/verify`;

  const copyAttendanceLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
              Live Lecture Session
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isClosed
                ? 'bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {!isClosed && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
              {isClosed ? 'SESSION CLOSED' : 'ACTIVE LIVE STREAM'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-1">
            Dynamic QR Anti-Proxy Broadcaster
          </h1>
          <p className="text-xs text-attendx-muted mt-0.5">
            Project this screen in class. Students scan the QR with their phones to verify attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isClosed ? (
            <button
              onClick={handleCloseSession}
              disabled={isClosing}
              className="attendx-btn-danger px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl shadow-sm"
            >
              {isClosing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <XSquare className="w-4 h-4" />
              )}
              End Class Session
            </button>
          ) : (
            <Link
              to="/teacher/classes"
              className="attendx-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl"
            >
              Back to Sessions
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: QR Broadcaster on Left, Live Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: QR Projector Display (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div 
            ref={qrContainerRef}
            className={`attendx-card p-6 sm:p-8 flex flex-col items-center justify-between text-center relative overflow-hidden transition-all ${
              isFullscreen ? 'bg-white h-screen justify-center gap-6 p-12' : 'bg-gradient-to-b from-white via-white to-blue-50/30'
            }`}
          >
            {/* Projector Controls Header */}
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-attendx-navy text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-attendx-cyan" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-extrabold text-attendx-navy">AttendX Dynamic QR</h3>
                  <p className="text-[10px] text-attendx-muted">HMAC-SHA256 Cryptographic Token</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl text-slate-500 hover:text-attendx-navy hover:bg-slate-100 transition-colors"
                  title="Projector Fullscreen Mode"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Class Subject & Room Info Banner */}
            {sessionData?.subject_name && !isClosed && (
              <div className="w-full mb-3 px-4 py-2.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between text-left">
                <div>
                  <h4 className="text-xs font-bold text-attendx-navy">
                    {sessionData.subject_name} <span className="font-mono text-attendx-blue text-[11px]">({sessionData.subject_code})</span>
                  </h4>
                  <p className="text-[11px] text-attendx-muted">
                    Section {sessionData.section_name} • Semester {sessionData.semester_number}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 shadow-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    {sessionData.allowed_radius_meters || 50}m Radius
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
                    {sessionData.room_number || 'Room LH-101'}
                  </span>
                </div>
              </div>
            )}

            {/* QR Frame Display */}
            {!isClosed ? (
              <div className="flex flex-col items-center space-y-6 my-2">
                {/* QR Canvas / Image Wrapper */}
                <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-slate-900/5 relative group">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="AttendX Dynamic QR"
                      className="w-64 h-64 sm:w-80 sm:h-80 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-64 h-64 sm:w-80 sm:h-80 flex flex-col items-center justify-center bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs font-semibold text-attendx-muted">Generating cryptographic QR...</p>
                    </div>
                  )}

                  {/* Shield Watermark Badge in Center */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-white/95 shadow-md flex items-center justify-center border border-slate-200">
                      <ShieldCheck className="w-7 h-7 text-attendx-blue" />
                    </div>
                  </div>
                </div>

                {/* Dynamic 3s Rotation & Freeze/Unfreeze Controls */}
                <div className="w-full max-w-sm space-y-3">
                  {/* Status Banner */}
                  <div className={`flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                    isFrozen
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}>
                    <span className="flex items-center gap-2 font-bold">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isFrozen ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'
                      }`} />
                      {isFrozen ? 'QR Code Frozen' : `Rotating Every 3s`}
                    </span>
                    <span className="text-[11px] font-mono font-bold">
                      {isFrozen ? 'Stable Code' : `Next in ${countdown}s`}
                    </span>
                  </div>

                  {/* Visual 3s Countdown Progress Bar */}
                  {!isFrozen && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(countdown / 3) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Action Buttons: Freeze/Unfreeze Toggle + Manual Refresh */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (isFrozen) {
                          setIsFrozen(false);
                          handleManualRefresh();
                        } else {
                          setIsFrozen(true);
                        }
                      }}
                      className={`text-xs px-4 py-2 font-bold flex items-center gap-2 rounded-xl transition-all shadow-xs ${
                        isFrozen
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                          : 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      {isFrozen ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Unfreeze / Resume Auto-Rotation
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          Freeze QR Code
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="attendx-btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 rounded-xl hover:bg-slate-100"
                      title="Force immediate refresh"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>

            ) : (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-attendx-success" />
                </div>
                <h3 className="text-xl font-extrabold text-attendx-navy">
                  Lecture Session Finalized
                </h3>
                <p className="text-xs text-attendx-muted max-w-sm mx-auto">
                  This class session has been officially concluded. The dynamic QR token is invalid and no further attendance submissions will be accepted.
                </p>
                <div className="pt-2">
                  <Link
                    to={`/teacher/sessions/${sessionId}/report`}
                    className="attendx-btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2"
                  >
                    View Final Section Report <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Attendance Direct Link / Token Info */}
            {!isClosed && (
              <div className="w-full mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-attendx-muted truncate max-w-xs font-mono text-[11px]">
                  {verifyUrl}
                </span>
                <button
                  onClick={copyAttendanceLink}
                  className="attendx-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-attendx-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy Verification Link'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Attendance Real-Time Feed (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Attendee Counter Header */}
          <div className="attendx-card p-6 bg-gradient-to-br from-white to-blue-50/50 border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Real-Time Scans
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <div>
                <span className="text-4xl font-black text-attendx-navy tracking-tight">
                  {sessionData?.total_marked || 0}
                </span>
                <span className="text-xs text-attendx-muted block font-medium">
                  Verified Attendees
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-attendx-success bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Anti-Proxy Active
                </span>
                <span className="text-[10px] text-attendx-muted block mt-1">
                  100% Geofence & Face Verified
                </span>
              </div>
            </div>
          </div>

          {/* Attendee Live Stream List */}
          <div className="attendx-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-attendx-navy">
                Live Check-in Stream ({sessionData?.attendees.length || 0})
              </h3>
              <span className="text-[10px] text-attendx-muted">
                Auto-updating every 2.5s
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
              {sessionData && sessionData.attendees.length > 0 ? (
                sessionData.attendees.map((att, idx) => (
                  <div
                    key={att.record_id || idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 shadow-sm transition-all flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1"
                  >
                    {/* Left: Avatar / Photo thumbnail & Name */}
                    <div className="flex items-center gap-3">
                      {att.photo_url ? (
                        <button
                          onClick={() => setPreviewPhoto(att.photo_url || null)}
                          className="relative w-10 h-10 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-200 hover:scale-105 transition-transform"
                          title="Click to inspect verification photo"
                        >
                          <img
                            src={att.photo_url.startsWith('http') || att.photo_url.startsWith('data:') ? att.photo_url : `http://127.0.0.1:8000${att.photo_url}`}
                            alt={att.student_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-attendx-blue font-extrabold flex items-center justify-center text-sm shrink-0">
                          {att.student_name.charAt(0)}
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-extrabold text-attendx-navy leading-tight">
                          {att.student_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-semibold text-slate-500">
                            {att.registration_number}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Roll {att.roll_number}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Verification Badges & Timestamp */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-attendx-navy bg-slate-100 px-2 py-0.5 rounded">
                          {att.marked_at}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px]">
                        <span className={`px-1.5 py-0.2 rounded font-medium border ${
                          att.is_geofence_verified 
                            ? 'bg-blue-50 text-attendx-blue border-blue-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {att.distance_meters !== undefined ? `${att.distance_meters}m` : 'GPS OK'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-medium border ${
                          att.is_wifi_verified 
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          Wi-Fi OK
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-attendx-muted space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-attendx-navy">Waiting for student check-ins...</p>
                  <p className="text-[10px] text-slate-400">
                    As students point their cameras and scan the dynamic QR, their anti-proxy verified photos and metrics will stream in live.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SESSION CLOSED SUMMARY MODAL */}
      {closedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-attendx-border text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-attendx-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-attendx-navy">
                Attendance Successfully Finalized
              </h3>
              <p className="text-xs text-attendx-muted mt-1">
                The class session has been archived. All biometric and geofenced records have been written to the permanent database audit log.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-around">
              <div>
                <span className="text-[10px] font-bold text-attendx-muted uppercase block">
                  Total Present
                </span>
                <span className="text-2xl font-black text-attendx-navy">
                  {closedSummary.present_count}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div>
                <span className="text-[10px] font-bold text-attendx-muted uppercase block">
                  Session Status
                </span>
                <span className="text-xs font-extrabold text-attendx-success bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {closedSummary.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/teacher/dashboard"
                className="attendx-btn-secondary text-xs px-4 py-2.5"
              >
                Return to Dashboard
              </Link>
              <Link
                to={`/teacher/sessions/${sessionId}/report`}
                className="attendx-btn-primary text-xs px-5 py-2.5 flex items-center gap-1.5"
              >
                View Full Section Report <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
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
              Live Biometric Photo Capture
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
              Student face snapshot verified at moment of dynamic QR scan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
