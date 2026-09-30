import { api } from './api';
import { User, Role } from '../types';

export interface LoginResult {
  access_token?: string;
  token_type?: string;
  role?: Role;
  require_otp?: boolean;
  temp_user_id?: string;
  user?: User;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResult> {
    return api.post<LoginResult>('/auth/login', { username, password });
  },

  async verifyOtp(userId: string, otpCode: string): Promise<LoginResult> {
    return api.post<LoginResult>('/auth/verify-otp', {
      user_id: userId,
      otp_code: otpCode,
    });
  },

  async getCurrentUser(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  async getInitialSetupStatus(): Promise<{ is_locked: boolean; message: string }> {
    return api.get('/auth/initial-setup-status');
  },

  logout(): void {
    localStorage.removeItem('attendx_token');
    localStorage.removeItem('attendx_user');
    localStorage.removeItem('attendx_role');
  },
};
