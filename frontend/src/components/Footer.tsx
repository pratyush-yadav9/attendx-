import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-attendx-border py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-attendx-navy flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4 text-attendx-cyan" />
            </div>
            <span className="font-bold text-attendx-navy text-sm tracking-tight">Attend<span className="text-attendx-blue">X</span></span>
            <span className="text-xs text-attendx-muted ml-2">Intelligent Attendance & Anti-Proxy System</span>
          </div>

          <p className="text-xs text-attendx-muted">
            &copy; {new Date().getFullYear()} AttendX. Designed for modern engineering institutions.
          </p>
        </div>
      </div>
    </footer>
  );
};
