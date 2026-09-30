import React from 'react';
import { Link } from 'react-router-dom';
import { 
  QrCode, 
  MapPin, 
  Wifi, 
  ShieldCheck, 
  BarChart3, 
  Bell, 
  GraduationCap, 
  UserCheck, 
  Building2, 
  ArrowRight,
  Camera,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with subtle AttendX gradient background */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-[#F5F9FF] via-white to-[#F5F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Live Security Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-attendx-blue text-xs font-semibold mb-6 shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-attendx-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-attendx-blue"></span>
              </span>
              Next-Gen Academic Security Platform
            </div>

            {/* Main Hero Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-attendx-navy tracking-tight leading-[1.15]">
              Attend<span className="text-attendx-blue">X</span>
              <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-attendx-text mt-3">
                Intelligent Attendance & Anti-Proxy System
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-attendx-muted max-w-2xl mx-auto leading-relaxed">
              Smart, secure and automated attendance management for modern colleges. 
              Eliminate proxy attendance with cryptographic dynamic QR codes, campus geofencing, and automated compliance tracking.
            </p>

            {/* 3 Dedicated Role Login Buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              <Link
                to="/login?role=student"
                className="attendx-btn-primary px-6 py-3 text-sm font-semibold flex items-center gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <GraduationCap className="w-5 h-5" />
                Student Login
              </Link>
              <Link
                to="/login?role=teacher"
                className="attendx-btn-navy px-6 py-3 text-sm font-semibold flex items-center gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <UserCheck className="w-5 h-5" />
                Teacher Login
              </Link>
              <Link
                to="/login?role=hod"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-sm text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm"
              >
                <Building2 className="w-5 h-5" />
                HOD / Admin Login
              </Link>
            </div>

            {/* Verification Link Shortcut */}
            <div className="mt-6">
              <Link 
                to="/verify" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-attendx-blue hover:underline"
              >
                <QrCode className="w-4 h-4" />
                Scanned a Dynamic QR? Click here to open Verification Page
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Feature Cards Section */}
      <section className="py-16 bg-white border-y border-attendx-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs uppercase tracking-widest font-bold text-attendx-blue">
              Engineered For Academic Integrity
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-attendx-navy tracking-tight">
              Six Layers of Attendance Intelligence
            </p>
            <p className="mt-3 text-sm text-attendx-muted">
              Built from the ground up to prevent proxy submissions, protect faculty time, and automate university compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Dynamic QR Attendance */}
            <div className="attendx-card p-6 border-slate-200 hover:border-attendx-blue/30 transition-all hover:shadow-attendx-lg group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-attendx-blue flex items-center justify-center mb-5 group-hover:bg-attendx-blue group-hover:text-white transition-colors">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-attendx-navy mb-2">Dynamic QR Attendance</h3>
              <p className="text-sm text-attendx-muted leading-relaxed">
                Teachers start live class sessions generating cryptographically signed QR codes that rotate every 45 seconds, instantly expiring upon session closure to prevent image forwarding.
              </p>
            </div>

            {/* Card 2: Location Verification */}
            <div className="attendx-card p-6 border-slate-200 hover:border-attendx-blue/30 transition-all hover:shadow-attendx-lg group">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-attendx-cyan flex items-center justify-center mb-5 group-hover:bg-attendx-cyan group-hover:text-white transition-colors">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-attendx-navy mb-2">Location Verification</h3>
              <p className="text-sm text-attendx-muted leading-relaxed">
                Haversine geofencing validates that the student is physically present inside the designated college perimeter during the class window. Submissions outside the boundary are rejected.
              </p>
            </div>

            {/* Card 3: College Wi-Fi Verification */}
            <div className="attendx-card p-6 border-slate-200 hover:border-attendx-blue/30 transition-all hover:shadow-attendx-lg group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Wifi className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-attendx-navy mb-2">College Wi-Fi Verification</h3>
              <p className="text-sm text-attendx-muted leading-relaxed">
                Centralized campus network registry with transparent platform integration. Adheres strictly to browser security standards while integrating campus network identifiers.
              </p>
            </div>

            {/* Card 4: Anti-Proxy Biometric Protection */}
            <div className="attendx-card p-6 border-slate-200 hover:border-attendx-blue/30 transition-all hover:shadow-attendx-lg group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-attendx-success flex items-center justify-center mb-5 group-hover:bg-attendx-success group-hover:text-white transition-colors">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-attendx-navy mb-2">Anti-Proxy Protection</h3>
              <p className="text-sm text-attendx-muted leading-relaxed">
                Real-time photo verification captures the student's live face at the moment of submission using the browser MediaDevices API with automatic image compression and audit logging.
              </p>
            </div>

            {/* Card 5: Smart Attendance Analytics */}
            <div className="attendx-card p-6 border-slate-200 hover:border-attendx-blue/30 transition-all hover:shadow-attendx-lg group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-attendx-warning flex items-center justify-center mb-5 group-hover:bg-attendx-warning group-hover:text-white transition-colors">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-attendx-navy mb-2">Smart Attendance Analytics</h3>
              <p className="text-sm text-attendx-muted leading-relaxed">
                Mathematically exact attendance calculations with shortage calculators. Know precisely how many consecutive classes are required to recover to the 75% eligibility threshold.
              </p>
            </div>

            {/* Card 6: Automatic Notifications */}
            <div className="attendx-card p-6 border-slate-200 hover:border-attendx-blue/30 transition-all hover:shadow-attendx-lg group">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-attendx-danger flex items-center justify-center mb-5 group-hover:bg-attendx-danger group-hover:text-white transition-colors">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-attendx-navy mb-2">Automatic Notifications</h3>
              <p className="text-sm text-attendx-muted leading-relaxed">
                Background automated threshold monitoring alerts students immediately when subject attendance drops below policy limits, preventing unexpected examination debarment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture Highlight Section */}
      <section className="py-16 bg-attendx-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-attendx-border p-8 sm:p-12 shadow-attendx">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 text-attendx-success text-xs font-semibold mb-3">
                  <Lock className="w-3.5 h-3.5" />
                  Enterprise Anti-Proxy Protocol
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight">
                  How AttendX Prevents Fraudulent Attendance
                </h3>
                <p className="text-sm text-attendx-muted mt-3 leading-relaxed">
                  Traditional attendance systems suffer from screenshot sharing and proxy clicks. AttendX validates multiple independent physical and cryptographic signals before marking any student present:
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-attendx-blue flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-attendx-text">Short-Lived Cryptographic Tokens</p>
                      <p className="text-xs text-attendx-muted">Screenshots sent to friends expire in 45 seconds and fail signature verification.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-attendx-blue flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-attendx-text">Strict Classroom Geofence</p>
                      <p className="text-xs text-attendx-muted">GPS coordinates are validated via the Haversine formula against authorized campus bounds.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-attendx-blue flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-attendx-text">Live Photo Verification</p>
                      <p className="text-xs text-attendx-muted">Browser camera capture validates student identity and creates a verifiable attendance record.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-attendx-blue flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      4
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-attendx-text">Immediate Database De-duplication</p>
                      <p className="text-xs text-attendx-muted">Database composite keys ensure each student can only mark attendance once per session.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Card Representation */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-attendx-navy uppercase tracking-wider">Live Anti-Proxy Pipeline</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Active Enforcement</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-attendx-success" />
                      <span className="text-xs font-medium text-attendx-text">Dynamic QR Signature Verified</span>
                    </div>
                    <span className="text-[10px] font-mono text-attendx-muted">&lt; 45s HMAC</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-attendx-success" />
                      <span className="text-xs font-medium text-attendx-text">Campus Geofence Verified</span>
                    </div>
                    <span className="text-[10px] font-mono text-attendx-muted">24.5m &le; 150m</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-attendx-success" />
                      <span className="text-xs font-medium text-attendx-text">Live Photo Captured & Stored</span>
                    </div>
                    <span className="text-[10px] font-mono text-attendx-muted">JPEG Verified</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-attendx-success" />
                      <span className="text-xs font-medium text-attendx-text">De-duplication Check Passed</span>
                    </div>
                    <span className="text-[10px] font-mono text-attendx-muted">Unique Record</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                  <span className="text-xs font-bold text-attendx-success">Status: Attendance Validated & Logged</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
