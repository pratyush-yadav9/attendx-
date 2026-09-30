import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Menu, 
  X,
  ChevronDown,
  Scan
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { NotificationItem } from '../types';

export const Navbar: React.FC = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get<{ unread_count: number; data: NotificationItem[] }>('/notifications');
      setNotifications(res.data || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      // Quiet fail for notifications
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (role === 'STUDENT') return '/student/dashboard';
    if (role === 'TEACHER') return '/teacher/dashboard';
    if (role === 'HOD_ADMIN') return '/admin/dashboard';
    return '/';
  };

  const getRoleBadge = () => {
    if (role === 'STUDENT') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-attendx-blue border border-blue-200">
          Student
        </span>
      );
    }
    if (role === 'TEACHER') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-attendx-success border border-emerald-200">
          Faculty
        </span>
      );
    }
    if (role === 'HOD_ADMIN') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
          HOD / Admin
        </span>
      );
    }
    return null;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-attendx-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Name */}
          <Link to={isAuthenticated ? getDashboardLink() : "/"} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-attendx-navy flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-attendx-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-attendx-navy">Attend<span className="text-attendx-blue">X</span></span>
              </div>
              <p className="text-[10px] font-medium text-attendx-muted uppercase tracking-wider hidden sm:block">
                Anti-Proxy Attendance System
              </p>
            </div>
          </Link>

          {/* Navigation Links / Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link 
                  to={getDashboardLink()}
                  className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  Dashboard
                </Link>

                {role === 'STUDENT' && (
                  <>
                    <Link 
                      to="/student/attendance"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      My Attendance
                    </Link>
                    <Link 
                      to="/verify"
                      className="text-sm font-semibold text-attendx-blue hover:bg-blue-50 transition-colors px-3 py-2 rounded-lg flex items-center gap-1.5"
                    >
                      <Scan className="w-4 h-4 text-attendx-blue" />
                      Face & QR Attendance
                    </Link>
                    <Link 
                      to="/student/timetable"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Timetable
                    </Link>
                    <Link 
                      to="/student/academic-history"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Academic History
                    </Link>
                  </>
                )}

                {role === 'TEACHER' && (
                  <>
                    <Link 
                      to="/teacher/attendance-management"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Attendance Register
                    </Link>
                    <Link 
                      to="/teacher/classes"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Sessions & Reports
                    </Link>
                    <Link 
                      to="/teacher/corrections"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Correction Requests
                    </Link>
                  </>
                )}

                {role === 'HOD_ADMIN' && (
                  <>
                    <Link 
                      to="/admin/attendance-control"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Attendance Control
                    </Link>
                    <Link 
                      to="/admin/students"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Students
                    </Link>
                    <Link 
                      to="/admin/teachers"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Faculty
                    </Link>
                    <Link 
                      to="/admin/timetable"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Timetable
                    </Link>
                    <Link 
                      to="/admin/settings"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Campus Settings
                    </Link>
                    <Link 
                      to="/admin/audit-logs"
                      className="text-sm font-medium text-attendx-text hover:text-attendx-blue transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Audit Logs
                    </Link>
                  </>
                )}

                <div className="h-5 w-[1px] bg-attendx-border mx-1"></div>

                {/* Notifications Bell Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-xl text-attendx-muted hover:text-attendx-text hover:bg-slate-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-attendx-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-attendx-lg border border-attendx-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-attendx-border flex items-center justify-between">
                        <span className="font-semibold text-sm text-attendx-navy">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs font-medium text-attendx-blue hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-attendx-muted">
                            You're all caught up. No new notifications.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              className={`p-3.5 hover:bg-slate-50 transition-colors flex gap-3 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                            >
                              <div className="mt-0.5">
                                {notif.category === 'ATTENDANCE_ALERT' ? (
                                  <AlertTriangle className="w-4 h-4 text-attendx-warning" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-attendx-success" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-attendx-text">{notif.title}</p>
                                <p className="text-xs text-attendx-muted mt-0.5 leading-relaxed">{notif.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1 block">{notif.created_at}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Pill Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-attendx-border"
                  >
                    <div className="w-8 h-8 rounded-full bg-attendx-navy text-white flex items-center justify-center font-bold text-xs">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-xs font-semibold text-attendx-text leading-tight">{user?.full_name}</p>
                      <p className="text-[10px] text-attendx-muted">{getRoleBadge()}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-attendx-muted" />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-attendx-lg border border-attendx-border py-2 z-50">
                      <div className="px-4 py-2 border-b border-attendx-border">
                        <p className="text-xs font-semibold text-attendx-text">{user?.full_name}</p>
                        <p className="text-xs text-attendx-muted truncate">{user?.email}</p>
                        <div className="mt-1.5">{getRoleBadge()}</div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-attendx-danger hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="attendx-btn-secondary text-xs px-3.5 py-2"
                >
                  Log In
                </Link>
                <Link
                  to="/verify"
                  className="attendx-btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  Scan QR
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-attendx-muted hover:text-attendx-text"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-attendx-danger rounded-full ring-2 ring-white"></span>
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-attendx-text hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-attendx-border bg-white px-4 py-4 space-y-2">
          {isAuthenticated ? (
            <>
              <div className="pb-3 border-b border-attendx-border mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-attendx-navy">{user?.full_name}</p>
                  <p className="text-xs text-attendx-muted">{user?.email}</p>
                </div>
                {getRoleBadge()}
              </div>

              <Link
                to={getDashboardLink()}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
              >
                Dashboard
              </Link>

              {role === 'STUDENT' && (
                <>
                  <Link
                    to="/student/attendance"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    My Attendance
                  </Link>
                  <Link
                    to="/student/timetable"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Timetable
                  </Link>
                  <Link
                    to="/student/academic-history"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Academic History
                  </Link>
                  <Link
                    to="/verify"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-attendx-blue font-bold hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Scan className="w-4 h-4 text-attendx-blue" />
                    Face & QR Attendance
                  </Link>
                </>
              )}

              {role === 'TEACHER' && (
                <>
                  <Link
                    to="/teacher/attendance-management"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Attendance Register & Edit
                  </Link>
                  <Link
                    to="/teacher/classes"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Sessions & Reports
                  </Link>
                  <Link
                    to="/teacher/corrections"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Correction Requests
                  </Link>
                </>
              )}

              {role === 'HOD_ADMIN' && (
                <>
                  <Link
                    to="/admin/attendance-control"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Attendance Control & Audit
                  </Link>
                  <Link
                    to="/admin/students"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Manage Students & Promotion
                  </Link>
                  <Link
                    to="/admin/teachers"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Faculty & Load
                  </Link>
                  <Link
                    to="/admin/timetable"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Timetable & Clash Scheduler
                  </Link>
                  <Link
                    to="/admin/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Geofence & Wi-Fi Policy
                  </Link>
                  <Link
                    to="/admin/audit-logs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-attendx-text hover:bg-slate-50"
                  >
                    Audit Logs
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-attendx-danger hover:bg-red-50 flex items-center gap-2 pt-3 border-t border-slate-100"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full attendx-btn-secondary text-sm py-2.5"
              >
                Log In
              </Link>
              <Link
                to="/verify"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full attendx-btn-primary text-sm py-2.5"
              >
                Scan Attendance QR
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
