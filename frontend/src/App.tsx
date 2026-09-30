import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AttendanceVerifyPage } from './pages/AttendanceVerifyPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentAttendancePage } from './pages/student/StudentAttendancePage';
import { StudentTimetablePage } from './pages/student/StudentTimetablePage';
import { StudentAcademicHistoryPage } from './pages/student/StudentAcademicHistoryPage';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherClassSessionPage } from './pages/teacher/TeacherClassSessionPage';
import { TeacherSessionsPage } from './pages/teacher/TeacherSessionsPage';
import { TeacherCorrectionReviewPage } from './pages/teacher/TeacherCorrectionReviewPage';
import { TeacherAttendanceManagementPage } from './pages/teacher/TeacherAttendanceManagementPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminFacultyPage } from './pages/admin/AdminFacultyPage';
import { AdminTimetablePage } from './pages/admin/AdminTimetablePage';
import { AdminConfigPage } from './pages/admin/AdminConfigPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminAttendanceControlPage } from './pages/admin/AdminAttendanceControlPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify" element={<AttendanceVerifyPage />} />

              {/* Student Protected Routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/attendance"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentAttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/timetable"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentTimetablePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/academic-history"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentAcademicHistoryPage />
                  </ProtectedRoute>
                }
              />

              {/* Teacher Protected Routes */}
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/session/:sessionId"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherClassSessionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/classes"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherSessionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/sessions/:sessionId/report"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherSessionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/corrections"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherCorrectionReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/attendance-management"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherAttendanceManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* HOD / Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/attendance-control"
                element={
                  <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                    <AdminAttendanceControlPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                    <AdminStudentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/teachers"
                element={
                  <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                    <AdminFacultyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/timetable"
                element={
                  <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                    <AdminTimetablePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                    <AdminConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                    <AdminAuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
