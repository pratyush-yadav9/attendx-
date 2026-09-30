import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RefreshCw, 
  Check, 
  Upload, 
  AlertCircle, 
  Eye, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Scan, 
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import { FaceVerificationResult, StudentMatchDetails } from '../types';

interface CameraCaptureProps {
  onPhotoSelected: (base64Photo: string, faceResult?: FaceVerificationResult | null) => void;
  selectedPhoto: string | null;
  onClearPhoto: () => void;
  registrationNumber?: string;
  sessionId?: string;
  qrToken?: string;
  onFaceVerified?: (result: FaceVerificationResult | null) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoSelected,
  selectedPhoto,
  onClearPhoto,
  registrationNumber,
  sessionId,
  qrToken,
  onFaceVerified,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Facial Recognition State
  const [isVerifyingFace, setIsVerifyingFace] = useState<boolean>(false);
  const [faceResult, setFaceResult] = useState<FaceVerificationResult | null>(null);
  const [showDemoSelector, setShowDemoSelector] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const startCamera = async () => {
    setErrorMessage(null);
    setCapturedPreview(null);
    setIsProcessing(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        'Camera API is not supported in this browser. Please use the Upload Photo option.'
      );
      setIsProcessing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);
      setIsProcessing(false);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error('Video play error:', err);
          });
        }
      }, 100);
    } catch (err: any) {
      setIsProcessing(false);
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Camera permission is required for face verification. You can also upload a photo below.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device detected. Please use the Upload Photo option.');
      } else {
        setErrorMessage('Could not initialize camera. Please try the Upload Photo fallback.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Export as compressed base64 JPEG
    const base64Data = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPreview(base64Data);

    // Stop camera stream once captured
    stopCamera();

    // Automatically trigger instant biometric facial recognition
    triggerFaceVerification(base64Data);
  };

  const handleUsePhoto = () => {
    if (capturedPreview) {
      onPhotoSelected(capturedPreview, faceResult);
      setCapturedPreview(null);
    }
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setFaceResult(null);
    onFaceVerified?.(null);
    startCamera();
  };

  const handleClear = () => {
    setFaceResult(null);
    onFaceVerified?.(null);
    onClearPhoto();
  };

  const triggerFaceVerification = async (photoBase64: string) => {
    setIsVerifyingFace(true);
    setErrorMessage(null);

    try {
      const result = await attendanceService.verifyFace({
        photo_base64: photoBase64,
        registration_number: registrationNumber,
        session_id: sessionId,
        qr_token: qrToken,
      });

      setFaceResult(result);
      onFaceVerified?.(result);
      onPhotoSelected(photoBase64, result);
    } catch (err: any) {
      console.error('Facial verification error:', err);
      const fallbackResult: FaceVerificationResult = {
        is_match: false,
        match_status: 'NO_MATCH',
        confidence_score: 0,
        threshold: 65.0,
        message: err.message || 'Facial recognition service was unable to verify the photo.',
      };
      setFaceResult(fallbackResult);
      onFaceVerified?.(fallbackResult);
      onPhotoSelected(photoBase64, fallbackResult);
    } finally {
      setIsVerifyingFace(false);
    }
  };

  // Automatically re-verify when registration number is entered if a photo is already selected but not yet matched
  useEffect(() => {
    const photoToVerify = capturedPreview || selectedPhoto;
    if (photoToVerify && registrationNumber && registrationNumber.trim().length >= 3 && !faceResult?.is_match && !isVerifyingFace) {
      triggerFaceVerification(photoToVerify);
    }
  }, [registrationNumber]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCapturedPreview(base64);
      triggerFaceVerification(base64);
    };
    reader.readAsDataURL(file);
  };

  // Helper to load sample student portraits for instant demonstration
  const handleLoadSampleStudent = async (sampleReg: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const url = `/uploads/student_profiles/${sampleReg}.jpg`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not load sample portrait for ${sampleReg}`);
      }
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setCapturedPreview(b64);
        triggerFaceVerification(b64);
        setIsProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to load sample portrait.');
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-attendx-navy flex items-center gap-1.5">
          <Scan className="w-4 h-4 text-attendx-blue" />
          <span>Biometric Facial Recognition Photo Section</span>
          <span className="text-attendx-danger">*</span>
        </label>
        {selectedPhoto && (
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${
            faceResult?.is_match ? 'text-attendx-success' : 'text-attendx-danger'
          }`}>
            {faceResult?.is_match ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> Face Match Verified
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" /> Verification Required
              </>
            )}
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-attendx-danger text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* State 1: Active Live Camera Stream with Biometric Guidance */}
      {isCameraOpen && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-attendx-blue aspect-[4/3] flex items-center justify-center shadow-lg">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover transform scale-x-[-1]"
          />

          {/* Biometric Oval Face Guide & Scanning Reticle */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Corner Alignment Markers */}
            <div className="relative w-52 h-64 border-2 border-white/40 rounded-[3rem] shadow-[0_0_30px_rgba(37,99,235,0.3)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-attendx-cyan rounded-tl-xl"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-attendx-cyan rounded-tr-xl"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-attendx-cyan rounded-bl-xl"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-attendx-cyan rounded-br-xl"></div>
              
              {/* Scanning animated pulse bar */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-attendx-cyan to-transparent animate-pulse absolute top-1/2 -translate-y-1/2"></div>
            </div>

            <span className="mt-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white/90 border border-white/10 tracking-wide">
              Align Face Inside Biometric Reticle
            </span>
          </div>

          {/* Bottom Live Controls */}
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 z-10 px-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-2.5 rounded-full bg-attendx-blue text-white text-xs font-extrabold shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2 ring-4 ring-blue-500/20 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Capture & Verify Face
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors"
              title="Close camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* State 2: Captured Photo Preview for Biometric Review */}
      {capturedPreview && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-attendx-border aspect-[4/3] flex items-center justify-center shadow-md">
            <img
              src={capturedPreview}
              alt="Captured biometric preview"
              className="w-full h-full object-cover"
            />

            {/* In-progress analysis overlay */}
            {isVerifyingFace && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 text-white z-20">
                <div className="w-9 h-9 border-3 border-attendx-cyan border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-attendx-cyan tracking-wide">
                  Extracting Biometric Vector...
                </p>
                <p className="text-[10px] text-slate-300">
                  Comparing live face with institutional student database
                </p>
              </div>
            )}

            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 z-10 px-4">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isVerifyingFace}
                className="px-4 py-2 rounded-full bg-white/90 text-attendx-text hover:bg-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                disabled={isVerifyingFace}
                className="px-5 py-2 rounded-full bg-attendx-success text-white text-xs font-bold shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Face Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Confirmed Photo Selected */}
      {selectedPhoto && !isCameraOpen && !capturedPreview && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-3 flex items-center gap-3 shadow-sm">
          <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-inner">
            <img
              src={selectedPhoto}
              alt="Selected biometric face"
              className="w-full h-full object-cover"
            />
            {faceResult?.is_match && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {!faceResult ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-attendx-blue">
                  <Clock className="w-3 h-3" /> Waiting for face verification...
                </span>
              ) : faceResult.is_match ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> Face Verified ✓ ({faceResult.confidence_score}%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">
                  <ShieldAlert className="w-3 h-3" /> {faceResult.message || 'Face Not Matched. Try Again.'}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-attendx-text truncate mt-1">
              {faceResult?.student?.student_name || 'Biometric Snapshot Prepared'}
            </p>
            <p className="text-[11px] text-attendx-muted truncate">
              {faceResult?.student 
                ? `${faceResult.student.registration_number} • Roll ${faceResult.student.roll_number}`
                : 'Encrypted face vector submitted for attendance check.'}
            </p>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => triggerFaceVerification(selectedPhoto)}
              disabled={isVerifyingFace}
              className="p-1.5 rounded-lg text-attendx-blue hover:bg-blue-50 transition-colors"
              title="Re-verify face"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifyingFace ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-attendx-muted hover:text-attendx-danger hover:bg-red-50 transition-colors"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* State 4: Default Initial Action Buttons */}
      {!isCameraOpen && !capturedPreview && !selectedPhoto && (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={startCamera}
            disabled={isProcessing}
            className="p-4 rounded-xl border border-dashed border-attendx-blue/50 bg-blue-50/60 hover:bg-blue-50 text-attendx-blue text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all hover:shadow-sm group"
          >
            <div className="w-10 h-10 rounded-full bg-attendx-blue/10 flex items-center justify-center text-attendx-blue group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <span>Take Photo (Camera)</span>
            <span className="text-[10px] text-attendx-muted font-normal">Real-time facial scan</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-attendx-text text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all hover:shadow-sm group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <span>Upload Photo Fallback</span>
            <span className="text-[10px] text-attendx-muted font-normal">JPG, PNG, or WEBP</span>
          </button>
        </div>
      )}

      {/* Quick Testing Demo Helper: Instant Enrolled Student Profile Loader */}
      {!isCameraOpen && (
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] text-attendx-muted mb-1.5">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Face Recognition Demo
            </span>
            <button
              type="button"
              onClick={() => setShowDemoSelector(!showDemoSelector)}
              className="text-attendx-blue hover:underline font-medium text-[11px]"
            >
              {showDemoSelector ? 'Hide Profiles' : 'Test Enrolled Faces'}
            </button>
          </div>

          {showDemoSelector && (
            <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs space-y-2">
              <p className="text-[11px] text-slate-600">
                Click any enrolled student below to simulate their live biometric face scan:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { reg: '2024CSE001', name: 'Aarav Kumar (Roll 01)' },
                  { reg: '2024CSE002', name: 'Priya Patel (Roll 02)' },
                  { reg: '2024CSE003', name: 'Rohan Sharma (Roll 03)' },
                  { reg: '2024CSE004', name: 'Ananya Singh (Roll 04)' },
                ].map((s) => (
                  <button
                    key={s.reg}
                    type="button"
                    onClick={() => handleLoadSampleStudent(s.reg)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:border-attendx-blue hover:text-attendx-blue text-left transition-colors truncate"
                    title={s.name}
                  >
                    👤 {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLEAR MATCH / NO MATCH RESULT CARD (All 6 Required Student Details)       */}
      {/* ========================================================================= */}
      {faceResult && (
        <div className={`rounded-2xl border-2 p-4 transition-all shadow-sm ${
          faceResult.is_match 
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' 
            : 'bg-red-50/70 border-red-300 text-red-950'
        }`}>
          {/* Header Banner: MATCH / NO MATCH */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                faceResult.is_match 
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-200' 
                  : 'bg-red-500 text-white ring-4 ring-red-200'
              }`}>
                {faceResult.is_match ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  faceResult.is_match 
                    ? 'bg-emerald-200/80 text-emerald-900' 
                    : 'bg-red-200/80 text-red-900'
                }`}>
                  {faceResult.match_status === 'MATCH' ? 'BIOMETRIC MATCH CONFIRMED' : 'FACE VERIFICATION FAILED'}
                </span>
                <h4 className="text-sm font-extrabold mt-0.5 tracking-tight">
                  {faceResult.is_match ? 'Student Identity Confirmed' : 'No Match Detected'}
                </h4>
              </div>
            </div>

            {/* Confidence Score Pill */}
            <div className="text-right shrink-0">
              <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-lg shadow-sm border ${
                faceResult.is_match 
                  ? 'bg-white text-emerald-700 border-emerald-200' 
                  : 'bg-white text-red-700 border-red-200'
              }`}>
                {faceResult.confidence_score}% Match
              </span>
              <span className="block text-[9px] text-slate-500 mt-0.5 font-medium">
                Threshold: {faceResult.threshold}%
              </span>
            </div>
          </div>

          {/* Confidence Progress Bar */}
          <div className="mt-3 w-full bg-white/80 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                faceResult.is_match ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(5, Math.min(100, faceResult.confidence_score))}%` }}
            ></div>
          </div>

          <p className="text-xs text-slate-700 mt-2.5 leading-relaxed font-medium">
            {faceResult.message}
          </p>

          {/* Student Profile Details Card (Displaying all 6 requested fields on Match) */}
          {faceResult.student && (
            <div className="mt-3.5 bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-attendx-blue" />
                  Verified Student Profile
                </span>
                {faceResult.student.registered_photo_url && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Profile Linked
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                {/* 1. Student Name */}
                <div>
                  <span className="text-[10px] text-slate-500 block">Student Name</span>
                  <span className="font-extrabold text-attendx-navy text-sm">
                    {faceResult.student.student_name}
                  </span>
                </div>

                {/* 2. Roll Number */}
                <div>
                  <span className="text-[10px] text-slate-500 block">Roll Number</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {faceResult.student.roll_number}
                  </span>
                </div>

                {/* 3. Registration/Student ID */}
                <div>
                  <span className="text-[10px] text-slate-500 block">Registration / Student ID</span>
                  <span className="font-mono font-bold text-attendx-blue">
                    {faceResult.student.registration_number}
                  </span>
                </div>

                {/* 4. Class / Section */}
                <div>
                  <span className="text-[10px] text-slate-500 block">Class / Section</span>
                  <span className="font-semibold text-slate-800">
                    {faceResult.student.class_section}
                  </span>
                </div>

                {/* 5. Department */}
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">Department</span>
                  <span className="font-semibold text-slate-800">
                    {faceResult.student.department}
                  </span>
                </div>

                {/* 6. Attendance Status */}
                <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Attendance Status</span>
                    <span className={`font-bold ${
                      faceResult.is_match ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {faceResult.student.attendance_status}
                    </span>
                  </div>
                  {faceResult.student.attendance_percentage !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-attendx-blue font-bold text-xs">
                      {faceResult.student.attendance_percentage}% Overall
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action on Match / No Match */}
          {faceResult.is_match ? (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">
                Match verified. You may proceed to mark attendance.
              </span>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="p-2.5 rounded-xl bg-red-100/70 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold">
                  Face Not Matched ✕. Captured face does not match your enrolled student profile. Attendance disabled. Please retake photo.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Biometric Privacy Safeguard Notice */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span className="leading-tight">
          <strong>Biometric Security:</strong> Facial recognition data is strictly utilized for student identification and attendance authentication. Raw biometric vectors are cryptographically salted and protected under campus access controls.
        </span>
      </div>

      {/* Hidden file input and canvas */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
