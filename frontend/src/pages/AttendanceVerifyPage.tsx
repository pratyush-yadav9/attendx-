import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  BookOpen, 
  Building2,
  RefreshCw,
  QrCode,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { VerificationSessionData, AttendanceSuccessData, FaceVerificationResult } from '../types';
import { CameraCapture } from '../components/CameraCapture';

export const AttendanceVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const tokenParam = searchParams.get('token') || '';
  const [tokenInput, setTokenInput] = useState<string>(tokenParam);
  const [activeToken, setActiveToken] = useState<string>(tokenParam);

  // Verification session state
  const [sessionData, setSessionData] = useState<VerificationSessionData | null>(null);
  const [isLoadingSession, setIsLoadingLoadingSession] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Student form state - only bind to user if current role is STUDENT
  const isStudent = user?.role === 'STUDENT';
  const [fullName, setFullName] = useState<string>(isStudent ? (user?.full_name || '') : '');
  const [registrationNumber, setRegistrationNumber] = useState<string>(isStudent ? (user?.registration_number || '') : '');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [faceResult, setFaceResult] = useState<FaceVerificationResult | null>(null);

  // Geolocation state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'IDLE' | 'FETCHING' | 'SUCCESS' | 'DENIED'>('IDLE');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<AttendanceSuccessData | null>(null);

  // Synchronize authenticated user profile fields ONLY if role is STUDENT
  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      if (user.full_name) setFullName(user.full_name);
      if (user.registration_number) setRegistrationNumber(user.registration_number);
    } else if (user && user.role !== 'STUDENT') {
      // Do not populate with teacher or admin name
      setFullName('');
      setRegistrationNumber('');
    }
  }, [user]);

  // Load and validate session when activeToken changes
  useEffect(() => {
    if (activeToken) {
      fetchSessionInfo(activeToken);
    }
  }, [activeToken]);

  // Request browser geolocation
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('DENIED');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('FETCHING');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationStatus('SUCCESS');
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setLocationStatus('DENIED');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. Please allow location access to verify campus presence.');
        } else {
          setLocationError('Unable to retrieve location. Please ensure device location is enabled.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const fetchSessionInfo = async (token: string) => {
    setIsLoadingLoadingSession(true);
    setSessionError(null);
    try {
      const data = await attendanceService.verifySessionToken(token);
      setSessionData(data);
    } catch (err: any) {
      setSessionError(err.message || 'The attendance QR code has expired or is invalid.');
      setSessionData(null);
    } finally {
      setIsLoadingLoadingSession(false);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      setActiveToken(tokenInput.trim());
    }
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!activeToken) {
      setSubmissionError('Attendance QR code token is missing.');
      return;
    }

    if (!photoBase64) {
      setSubmissionError('Face verification photo is required. Please capture or select a photo.');
      return;
    }

    if (!faceResult || !faceResult.is_match) {
      setSubmissionError(
        faceResult?.message ||
        'Biometric Facial Recognition match required. The captured photo must match your registered student profile to allow attendance.'
      );
      return;
    }

    if (locationStatus === 'DENIED' || latitude === null || longitude === null) {
      setSubmissionError('Campus location verification is required. Please enable location permissions.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await attendanceService.markAttendance({
        qr_token: activeToken,
        latitude: latitude,
        longitude: longitude,
        photo_base64: photoBase64,
        device_fingerprint: navigator.userAgent,
        face_verified: faceResult.is_match,
        face_confidence: faceResult.confidence_score,
        face_verification_token: faceResult.face_verification_token,
      });

      setSuccessData(result);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#16A34A', '#06B6D4'],
        });
      } catch (e) {
        // Safe fallback if confetti blocked
      }
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // State A: Attendance Marked Successfully (Section 21)
  if (successData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#F5F9FF] to-white">
        <div className="w-full max-w-md attendx-card p-8 text-center space-y-6 shadow-attendx-lg border-emerald-200">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-attendx-success flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-attendx-navy tracking-tight">
              Attendance Marked Successfully
            </h2>
            <p className="text-xs text-attendx-muted mt-1.5">
              Your attendance has been recorded and verified by AttendX.
            </p>
          </div>

          {/* Record summary card */}
          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-attendx-muted">Student:</span>
              <span className="font-bold text-attendx-text">{successData.student_name} ({successData.registration_number})</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-attendx-muted">Subject:</span>
              <span className="font-bold text-attendx-navy">{successData.subject_name} ({successData.subject_code})</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-attendx-muted">Faculty:</span>
              <span className="font-semibold text-attendx-text">{successData.teacher_name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-attendx-muted">Classroom:</span>
              <span className="font-semibold text-attendx-text">{successData.room_number}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-attendx-muted">Timestamp:</span>
              <span className="font-mono text-attendx-text">{successData.marked_at}</span>
            </div>
            {successData.distance_meters !== undefined && (
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                <span className="text-attendx-muted">Campus Distance:</span>
                <span className="text-emerald-700 font-semibold">{successData.distance_meters}m (Inside Geofence)</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="w-full attendx-btn-primary py-3 text-sm font-semibold rounded-xl"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#F5F9FF] to-white">
      <div className="w-full max-w-lg">
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-attendx-navy items-center justify-center text-white mb-2.5 shadow-md">
            <QrCode className="w-6 h-6 text-attendx-cyan" />
          </div>
          <h1 className="text-2xl font-extrabold text-attendx-navy tracking-tight">
            Attendance Verification
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Mobile-first multi-factor anti-proxy check
          </p>
        </div>

        {/* Token Input Bar (if user opens /verify without a scanned URL) */}
        {!activeToken && (
          <div className="attendx-card p-6 mb-6">
            <h3 className="text-sm font-bold text-attendx-navy mb-2">Scan or Enter Dynamic Token</h3>
            <p className="text-xs text-attendx-muted mb-4">
              Scan the dynamic QR code displayed on the instructor's screen, or paste the signed token below:
            </p>
            <form onSubmit={handleManualTokenSubmit} className="flex gap-2">
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. 5b7d9f:1727654:45:9a7f"
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-attendx-border focus:outline-none focus:ring-2 focus:ring-attendx-blue font-mono"
              />
              <button type="submit" className="attendx-btn-primary text-xs px-4 py-2.5">
                Verify
              </button>
            </form>
          </div>
        )}

        {/* Loading Session */}
        {isLoadingSession && (
          <div className="attendx-card p-8 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-medium text-attendx-muted">Verifying class session & dynamic token...</p>
          </div>
        )}

        {/* Session Error */}
        {sessionError && (
          <div className="attendx-card p-6 border-red-200 bg-red-50/50 mb-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-attendx-danger mx-auto" />
            <h3 className="text-sm font-bold text-attendx-danger">QR Verification Failed</h3>
            <p className="text-xs text-attendx-muted max-w-sm mx-auto leading-relaxed">{sessionError}</p>
            <button
              onClick={() => { setActiveToken(''); setSessionError(null); }}
              className="attendx-btn-secondary text-xs px-4 py-2 mt-2"
            >
              Enter Another Token
            </button>
          </div>
        )}

        {/* Active Class Verification Card */}
        {sessionData && !isLoadingSession && (
          <div className="space-y-5">
            {/* Class Information Card */}
            <div className="attendx-card p-5 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-attendx-blue px-2 py-0.5 rounded bg-blue-100">
                    Live Session Active
                  </span>
                  <h2 className="text-lg font-bold text-attendx-navy mt-1">
                    {sessionData.subject_name}
                  </h2>
                  <p className="text-xs text-attendx-muted font-mono">{sessionData.subject_code}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-attendx-text bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm block">
                    {sessionData.room_number}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-attendx-muted block text-[11px]">Instructor:</span>
                  <span className="font-semibold text-attendx-text">{sessionData.teacher_name}</span>
                </div>
                <div>
                  <span className="text-attendx-muted block text-[11px]">Section / Semester:</span>
                  <span className="font-semibold text-attendx-text">Sec {sessionData.section_name} • Sem {sessionData.semester_number}</span>
                </div>
              </div>
            </div>

            {/* Verification Checklist Indicator */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-attendx-success shrink-0" />
                <span className="font-semibold text-[11px]">Dynamic QR Valid</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-attendx-success shrink-0" />
                <span className="font-semibold text-[11px]">Session Live</span>
              </div>
            </div>

            {/* Verification Form */}
            <div className="attendx-card p-6 sm:p-7">
              {submissionError && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-attendx-danger text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{submissionError}</span>
                </div>
              )}

              {/* Faculty Account Warning Notice */}
              {user && user.role !== 'STUDENT' && (
                <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      Signed in as Faculty (<strong>{user.full_name}</strong>). To record attendance, enter a student's registration ID or sign in as a student.
                    </span>
                  </div>
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] self-start sm:self-auto shrink-0 transition-colors"
                  >
                    Student Login
                  </Link>
                </div>
              )}

              <form onSubmit={handleMarkAttendance} className="space-y-5">
                {/* Full Name Field */}
                <div>
                  <label className="block text-xs font-semibold text-attendx-text mb-1">
                    Student Full Name <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={isStudent && !!user?.full_name}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter Student Full Name (e.g. Aarav Sharma)"
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border border-attendx-border focus:outline-none focus:ring-2 focus:ring-attendx-blue ${isStudent && user?.full_name ? 'bg-slate-50 text-slate-700 cursor-not-allowed' : 'bg-white'}`}
                  />
                  {isStudent && user?.full_name && (
                    <span className="text-[10px] text-attendx-muted mt-1 block">Verified from authenticated student account</span>
                  )}
                </div>

                {/* Registration Number Field */}
                <div>
                  <label className="block text-xs font-semibold text-attendx-text mb-1">
                    Registration Number <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={isStudent && !!user?.registration_number}
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Enter Student Reg No (e.g. 2024CSE001)"
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border border-attendx-border focus:outline-none focus:ring-2 focus:ring-attendx-blue ${isStudent && user?.registration_number ? 'bg-slate-50 text-slate-700 cursor-not-allowed font-mono' : 'bg-white'}`}
                  />
                  {isStudent && user?.registration_number && (
                    <span className="text-[10px] text-attendx-muted mt-1 block font-mono">Enrolled ID: {user.registration_number}</span>
                  )}
                </div>

                {/* Campus Geolocation Verification Indicator */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-attendx-text">
                      Campus Geolocation Check <span className="text-attendx-danger">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={requestLocation}
                      className="text-[11px] text-attendx-blue hover:underline flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh GPS
                    </button>
                  </div>

                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    locationStatus === 'SUCCESS' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : locationStatus === 'DENIED' 
                      ? 'bg-red-50 border-red-200 text-attendx-danger' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>
                        {locationStatus === 'SUCCESS' && 'GPS Coordinates Acquired (Ready for Geofence validation)'}
                        {locationStatus === 'FETCHING' && 'Acquiring high-accuracy campus location...'}
                        {locationStatus === 'DENIED' && (locationError || 'Location permission required')}
                        {locationStatus === 'IDLE' && 'Waiting for location check...'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Facial Recognition in Photo Section */}
                <CameraCapture
                  selectedPhoto={photoBase64}
                  onPhotoSelected={(base64, res) => {
                    setPhotoBase64(base64);
                    if (res) {
                      setFaceResult(res);
                      if (res.is_match && res.student) {
                        if (!fullName) setFullName(res.student.student_name);
                        if (!registrationNumber) setRegistrationNumber(res.student.registration_number);
                      }
                    }
                  }}
                  onClearPhoto={() => {
                    setPhotoBase64(null);
                    setFaceResult(null);
                  }}
                  registrationNumber={registrationNumber}
                  sessionId={sessionData.session_id}
                  qrToken={activeToken}
                  onFaceVerified={(res) => {
                    setFaceResult(res);
                    if (res?.is_match && res.student) {
                      if (!fullName) setFullName(res.student.student_name);
                      if (!registrationNumber) setRegistrationNumber(res.student.registration_number);
                    }
                  }}
                />

                {/* Action Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !photoBase64 || !faceResult?.is_match || locationStatus !== 'SUCCESS'}
                  className={`w-full py-3.5 text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                    faceResult?.is_match
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 ring-2 ring-emerald-500/30 active:scale-[0.99]'
                      : 'attendx-btn-primary opacity-60 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying & Recording Attendance...</span>
                    </>
                  ) : faceResult?.is_match ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Confirm Attendance (Face Verified: {faceResult.confidence_score}%)</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5" />
                      <span>Face Match Required to Allow Attendance</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            to={isAuthenticated ? '/student/dashboard' : '/'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-attendx-muted hover:text-attendx-text"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
