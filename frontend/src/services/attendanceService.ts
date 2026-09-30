import { api } from './api';
import { VerificationSessionData, AttendanceSuccessData, FaceVerificationResult } from '../types';

export interface MarkAttendancePayload {
  qr_token: string;
  latitude?: number;
  longitude?: number;
  photo_base64?: string;
  device_fingerprint?: string;
  wifi_ssid?: string;
  face_verified?: boolean;
  face_confidence?: number;
  face_verification_token?: string;
}

export interface VerifyFacePayload {
  photo_base64: string;
  registration_number?: string;
  session_id?: string;
  qr_token?: string;
}

export const attendanceService = {
  async verifySessionToken(token: string): Promise<VerificationSessionData> {
    return api.get<VerificationSessionData>(`/attendance/verify/${encodeURIComponent(token)}`);
  },

  async verifyFace(payload: VerifyFacePayload): Promise<FaceVerificationResult> {
    return api.post<FaceVerificationResult>('/attendance/verify-face', payload);
  },

  async registerFace(payload: { photo_base64: string; registration_number?: string }): Promise<{ registration_number: string; photo_url: string }> {
    return api.post('/attendance/register-face', payload);
  },

  async markAttendance(payload: MarkAttendancePayload): Promise<AttendanceSuccessData> {
    return api.post<AttendanceSuccessData>('/attendance/mark', payload);
  },
};
