import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  UserX,
  Sparkles,
  Check,
  Image as ImageIcon
} from 'lucide-react';
import { StudentRosterItem } from '../services/attendanceManagementService';
import { attendanceService } from '../services/attendanceService';
import { FaceVerificationResult } from '../types';

interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRosterItem | null;
  onVerified: (studentId: string) => void;
  subjectName?: string;
  sectionName?: string;
}

type VerificationState = 
  | 'WAITING' 
  | 'VERIFYING' 
  | 'VERIFIED' 
  | 'MISMATCH' 
  | 'NO_FACE' 
  | 'MULTIPLE_FACES' 
  | 'NO_REGISTERED_FACE';

export const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({
  isOpen,
  onClose,
  student,
  onVerified,
  subjectName,
  sectionName,
}) => {
  // Mode: 'CAMERA' | 'UPLOAD'
  const [activeMode, setActiveMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');

  // Verification state
  const [verificationState, setVerificationState] = useState<VerificationState>('WAITING');
  const [statusMessage, setStatusMessage] = useState<string>('Waiting for face verification...');
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

  // Captured / Selected Image
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Registered Photo URL state (allows refreshing if newly registered)
  const [registeredPhotoUrl, setRegisteredPhotoUrl] = useState<string | null>(null);
  const [hasRegisteredPhoto, setHasRegisteredPhoto] = useState<boolean>(true);

  // Update Photo Mode (teacher/HOD uploading a new official portrait)
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState<boolean>(false);
  const [isSavingNewPhoto, setIsSavingNewPhoto] = useState<boolean>(false);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);

  // Camera references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Reset state when modal opens or student changes
  useEffect(() => {
    if (isOpen && student) {
      // Determine initial registered photo
      const defaultPhoto = student.photo_url || `/uploads/student_profiles/${student.registration_number}.jpg`;
      setRegisteredPhotoUrl(defaultPhoto);
      setHasRegisteredPhoto(true);

      // Check if image actually exists
      checkImageExists(defaultPhoto);

      // Reset verification state to WAITING (do NOT show Unmatched!)
      setVerificationState('WAITING');
      setStatusMessage('Waiting for face verification...');
      setConfidenceScore(null);
      setCapturedPhoto(null);
      setCameraError(null);
      setIsUpdatingPhoto(false);
      setNewPhotoPreview(null);
      setActiveMode('CAMERA');

      // Start camera automatically
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, student]);

  const checkImageExists = (url: string) => {
    const img = new Image();
    img.onload = () => setHasRegisteredPhoto(true);
    img.onerror = () => setHasRegisteredPhoto(false);
    img.src = url;
  };

  // Camera Management
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Play error:', e));
          setIsCameraActive(true);
        };
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. You can upload a photo using the Upload tab.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device. Please use the Upload tab.');
      } else {
        setCameraError('Unable to access camera. Please use the photo upload option.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture Photo from Camera
  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.88);

    setCapturedPhoto(photoBase64);
    stopCamera();

    // Trigger face verification
    performFaceVerification(photoBase64);
  };

  // Upload Photo from File Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCapturedPhoto(base64);
      stopCamera();
      performFaceVerification(base64);
    };
    reader.readAsDataURL(file);
  };

  // Main Biometric Verification Call
  const performFaceVerification = async (photoBase64: string) => {
    if (!student) return;

    setVerificationState('VERIFYING');
    setStatusMessage('Analyzing facial features...');
    setConfidenceScore(null);

    try {
      const result: FaceVerificationResult = await attendanceService.verifyFace({
        photo_base64: photoBase64,
        registration_number: student.registration_number,
      });

      setConfidenceScore(result.confidence_score);

      if (result.is_match) {
        setVerificationState('VERIFIED');
        setStatusMessage('Face Verified ✓');
        // Automatically mark the student as present in the register
        onVerified(student.student_id);
      } else {
        const matchStatus = result.match_status;
        if (matchStatus === 'NO_FACE_DETECTED') {
          setVerificationState('NO_FACE');
          setStatusMessage('No face detected. Please try again.');
        } else if (matchStatus === 'MULTIPLE_FACES') {
          setVerificationState('MULTIPLE_FACES');
          setStatusMessage('Please ensure only one face is visible.');
        } else if (matchStatus === 'NO_REGISTERED_FACE') {
          setVerificationState('NO_REGISTERED_FACE');
          setStatusMessage('Face not registered.');
          setHasRegisteredPhoto(false);
        } else {
          setVerificationState('MISMATCH');
          setStatusMessage('Face Not Matched. Try Again.');
        }
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const errMsg = err.message || '';
      if (errMsg.includes('No face detected')) {
        setVerificationState('NO_FACE');
        setStatusMessage('No face detected. Please try again.');
      } else if (errMsg.includes('multiple') || errMsg.includes('Multiple')) {
        setVerificationState('MULTIPLE_FACES');
        setStatusMessage('Please ensure only one face is visible.');
      } else if (errMsg.includes('not registered') || errMsg.includes('registered')) {
        setVerificationState('NO_REGISTERED_FACE');
        setStatusMessage('Face not registered.');
        setHasRegisteredPhoto(false);
      } else {
        setVerificationState('MISMATCH');
        setStatusMessage('Face Not Matched. Try Again.');
      }
    }
  };

  // Retry Verification
  const handleRetry = () => {
    setCapturedPhoto(null);
    setVerificationState('WAITING');
    setStatusMessage('Waiting for face verification...');
    setConfidenceScore(null);

    if (activeMode === 'CAMERA') {
      startCamera();
    }
  };

  // Teacher / HOD Uploads a New Registered Profile Photo for Student
  const handleNewProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNewProfilePhoto = async () => {
    if (!student || !newPhotoPreview) return;

    setIsSavingNewPhoto(true);
    try {
      const res = await attendanceService.registerFace({
        photo_base64: newPhotoPreview,
        registration_number: student.registration_number,
      });

      // Refresh registered photo URL with timestamp cachebuster
      const updatedUrl = `${res?.photo_url || `/uploads/student_profiles/${student.registration_number}.jpg`}?t=${Date.now()}`;
      setRegisteredPhotoUrl(updatedUrl);
      setHasRegisteredPhoto(true);
      setIsUpdatingPhoto(false);
      setNewPhotoPreview(null);
      alert(`Biometric reference photo successfully registered for ${student.full_name}!`);
    } catch (err: any) {
      alert(`Failed to register photo: ${err.message}`);
    } finally {
      setIsSavingNewPhoto(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full overflow-hidden flex flex-col my-auto transition-all">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-attendx-blue/20 text-attendx-cyan flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-attendx-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Face Verification & Attendance Check
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Biometric Core
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                1-to-1 facial recognition comparison against official student profile
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Side-by-Side Comparison */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: Registered Student Profile & Reference Photo */}
          {/* ========================================================= */}
          <div className="attendx-card p-5 flex flex-col justify-between bg-white border border-slate-200">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-attendx-muted">
                  Official Student Profile
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                  Roll #{student.roll_number || '-'}
                </span>
              </div>

              {/* Student Identity Information */}
              <div className="space-y-1 mb-4">
                <h3 className="text-base font-black text-attendx-navy truncate">
                  {student.full_name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="font-mono bg-blue-50 text-attendx-blue px-2 py-0.5 rounded-md border border-blue-100">
                    {student.registration_number}
                  </span>
                  {sectionName && (
                    <span className="text-slate-500">
                      Section {sectionName}
                    </span>
                  )}
                  {subjectName && (
                    <span className="text-slate-400">• {subjectName}</span>
                  )}
                </div>
              </div>

              {/* Registered Reference Photo Frame */}
              <div className="relative aspect-[3/4] max-h-64 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-inner flex items-center justify-center">
                {hasRegisteredPhoto && registeredPhotoUrl ? (
                  <img
                    src={registeredPhotoUrl}
                    alt={student.full_name}
                    className="w-full h-full object-cover object-center"
                    onError={() => setHasRegisteredPhoto(false)}
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <UserX className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Face not registered</p>
                    <p className="text-[10px] text-slate-400">
                      No official portrait is currently on record for this student.
                    </p>
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute bottom-2 inset-x-2 bg-slate-900/80 backdrop-blur-md rounded-xl p-2 text-white text-[11px] flex items-center justify-between">
                  <span className="font-bold truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Reference Photo
                  </span>
                  <span className="text-[10px] font-mono text-slate-300">
                    {student.registration_number}
                  </span>
                </div>
              </div>
            </div>

            {/* Option to Upload / Register New Photo */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              {!isUpdatingPhoto ? (
                <button
                  type="button"
                  onClick={() => setIsUpdatingPhoto(true)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-attendx-blue hover:bg-blue-50/50 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload New Reference Photo
                </button>
              ) : (
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-attendx-navy">
                    <span>Select New Official Portrait</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUpdatingPhoto(false);
                        setNewPhotoPreview(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleNewProfilePhotoSelect}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-attendx-blue file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />

                  {newPhotoPreview && (
                    <div className="flex items-center gap-2 pt-1">
                      <img
                        src={newPhotoPreview}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewProfilePhoto}
                        disabled={isSavingNewPhoto}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {isSavingNewPhoto ? 'Saving...' : 'Confirm & Save Photo'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Face Verification Area (Camera / Upload)    */}
          {/* ========================================================= */}
          <div className="attendx-card p-5 flex flex-col justify-between bg-white border border-slate-200">
            <div>
              {/* Mode Switcher Tabs */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-attendx-muted">
                  Face Verification Area
                </span>
                
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('CAMERA');
                      if (!capturedPhoto) startCamera();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeMode === 'CAMERA'
                        ? 'bg-white text-attendx-navy shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Live Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('UPLOAD');
                      stopCamera();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeMode === 'UPLOAD'
                        ? 'bg-white text-attendx-navy shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Photo
                  </button>
                </div>
              </div>

              {/* Viewport Area: Live Camera, File Upload, or Captured Preview */}
              <div className="relative aspect-[3/4] max-h-64 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-inner flex items-center justify-center">
                
                {/* 1. Captured Photo Preview */}
                {capturedPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedPhoto}
                      alt="Captured verification candidate"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[10px] font-bold">
                      Captured Candidate
                    </div>
                  </div>
                ) : activeMode === 'CAMERA' ? (
                  /* 2. Live Camera View */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* Oval Face Framing Guide */}
                    {isCameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-44 h-56 rounded-[50%] border-2 border-dashed border-attendx-cyan/80 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white bg-slate-900/60 px-2 py-0.5 rounded-full mt-36">
                            Position Face Inside Frame
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Camera Loading or Error */}
                    {!isCameraActive && (
                      <div className="text-center p-4 space-y-2">
                        {cameraError ? (
                          <>
                            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                            <p className="text-xs text-white font-medium">{cameraError}</p>
                            <button
                              type="button"
                              onClick={startCamera}
                              className="px-3 py-1.5 rounded-lg bg-attendx-blue text-white text-xs font-bold"
                            >
                              Retry Camera
                            </button>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-8 h-8 border-2 border-attendx-cyan border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-xs text-slate-400">Starting device camera...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 3. Upload Photo Area */
                  <label className="flex flex-col items-center justify-center w-full h-full p-6 text-center cursor-pointer hover:bg-slate-800/80 transition-colors">
                    <Upload className="w-10 h-10 text-attendx-cyan mb-2" />
                    <span className="text-xs font-bold text-white mb-1">
                      Click or Drag to Upload Student Photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Supports JPEG, PNG, WEBP (Max 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Camera Trigger Button (when camera is active and no photo taken yet) */}
              {activeMode === 'CAMERA' && !capturedPhoto && isCameraActive && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    className="py-2 px-6 rounded-xl bg-attendx-blue hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Capture & Verify Face
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* REAL-TIME VERIFICATION STATUS BOX                         */}
            {/* ========================================================= */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              
              {/* STATE 1: WAITING (Do NOT show Unmatched!) */}
              {verificationState === 'WAITING' && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3 text-attendx-navy">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-attendx-blue shrink-0 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-attendx-navy">
                        Waiting for face verification...
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Capture with live camera or upload photo to compare.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 2: VERIFYING */}
              {verificationState === 'VERIFYING' && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center gap-2.5 text-indigo-900">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-xs font-bold">{statusMessage}</p>
                    <p className="text-[10px] text-indigo-600">Matching biometric vector with student record...</p>
                  </div>
                </div>
              )}

              {/* STATE 3: VERIFIED MATCH */}
              {verificationState === 'VERIFIED' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3 text-emerald-900 shadow-sm animate-scale-up">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-emerald-900">Face Verified ✓</span>
                        {confidenceScore !== null && (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-200/80 text-emerald-800 text-[10px] font-extrabold">
                            {confidenceScore}% Match
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-emerald-700">
                        Biometric identity matched! Student marked as Present.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* STATE 4: MISMATCH */}
              {verificationState === 'MISMATCH' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-3 text-rose-900 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <X className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-rose-900">Face Not Matched ✕</span>
                        {confidenceScore !== null && (
                          <span className="px-1.5 py-0.2 rounded-md bg-rose-200/80 text-rose-800 text-[10px] font-extrabold">
                            {confidenceScore}% Similarity
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-rose-700">
                        Photo does not match {student.full_name}'s registered face.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}

              {/* STATE 5: NO FACE DETECTED */}
              {verificationState === 'NO_FACE' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-amber-900 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">No face detected. Please try again.</p>
                      <p className="text-[10px] text-amber-700">
                        Ensure proper lighting and keep face clearly in the frame.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}

              {/* STATE 6: MULTIPLE FACES DETECTED */}
              {verificationState === 'MULTIPLE_FACES' && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-300 flex items-center justify-between gap-3 text-purple-900 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-6 h-6 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-purple-900">Please ensure only one face is visible.</p>
                      <p className="text-[10px] text-purple-700">
                        Multiple people were detected. Position only the student in view.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}

              {/* STATE 7: NO REGISTERED FACE */}
              {verificationState === 'NO_REGISTERED_FACE' && (
                <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-300 flex items-center justify-between gap-3 text-orange-900 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <UserX className="w-6 h-6 text-orange-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-orange-900">Face not registered.</p>
                      <p className="text-[10px] text-orange-700">
                        Student needs an official photo uploaded before biometric match.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUpdatingPhoto(true)}
                    className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Comparing live capture against registration #{student.registration_number}
          </div>

          <div className="flex items-center gap-2">
            {verificationState === 'VERIFIED' && (
              <button
                type="button"
                onClick={() => {
                  onVerified(student.student_id);
                  stopCamera();
                  onClose();
                }}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Marked Present
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="py-2 px-4 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
