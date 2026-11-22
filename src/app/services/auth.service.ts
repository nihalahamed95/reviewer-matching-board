// src/app/services/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { User, ApiResponse } from '../models/reviewer-matching.models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  private readonly API_BASE = 'http://localhost/straive_task/api';

  currentUser = signal<User | null>(this.getStoredUser());
  token = signal<string | null>(localStorage.getItem('straive_jwt_token'));
  isAuthenticated = computed(() => this.currentUser() !== null && !!this.token());
  isLoggingIn = signal<boolean>(false);
  isSettingsOpen = signal<boolean>(false);

  private getStoredUser(): User | null {
    const token = localStorage.getItem('straive_jwt_token');
    const raw = localStorage.getItem('straive_editor_user');
    if (!token || !raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  login(email: string, password: string): Observable<ApiResponse<any>> {
    this.isLoggingIn.set(true);

    return this.http.post<ApiResponse<any>>(`${this.API_BASE}/login`, { email, password }).pipe(
      tap(res => {
        this.isLoggingIn.set(false);
        if (res.success && res.user && res.token) {
          this.currentUser.set(res.user);
          this.token.set(res.token);
          localStorage.setItem('straive_jwt_token', res.token);
          localStorage.setItem('straive_editor_user', JSON.stringify(res.user));
          this.toast.success(`Welcome, ${res.user.name}`);
        }
      }),
      catchError(err => {
        this.isLoggingIn.set(false);
        const msg = err.error?.error || 'Invalid credentials. Demo: editor@straive.com / admin123';
        this.toast.error(msg);
        return of({ success: false, error: msg });
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse<any>> {
    const email = this.currentUser()?.email || 'editor@straive.com';
    return this.http.post<ApiResponse<any>>(`${this.API_BASE}/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
      email
    }).pipe(
      tap(res => {
        if (res.success) {
          this.toast.success(res.message || 'Password updated successfully.');
        }
      }),
      catchError(err => {
        const msg = err.error?.error || 'Failed to update password.';
        this.toast.error(msg);
        return of({ success: false, error: msg });
      })
    );
  }

  logout(): void {
    localStorage.removeItem('straive_jwt_token');
    localStorage.removeItem('straive_editor_user');
    this.currentUser.set(null);
    this.token.set(null);
    this.isSettingsOpen.set(false);
    this.toast.show('Signed out successfully.', 'info');
  }
}
