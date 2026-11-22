import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ReviewerMatchingService } from '../../services/reviewer-matching.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (auth.isSettingsOpen()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="badge-icon">⚙️</div>
            <div class="header-titles">
              <h3>Settings & Data Management</h3>
              <p>Manage account security and dataset state for {{ auth.currentUser()?.email }}</p>
            </div>
            <button class="close-x-btn" (click)="close()">✕</button>
          </div>

          <div class="modal-body">
            <!-- SECTION 1: CHANGE PASSWORD -->
            <section class="settings-section">
              <div class="section-title-line">
                <span class="section-icon">🔑</span>
                <div>
                  <h4>Account Security</h4>
                  <p class="section-desc">Change the password for your managing editor account.</p>
                </div>
              </div>

              @if (passwordError()) {
                <div class="alert-error">
                  <span>⚠️ {{ passwordError() }}</span>
                </div>
              }

              <form (ngSubmit)="onPasswordSubmit()" class="section-form">
                <div class="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    [(ngModel)]="currentPassword"
                    name="currentPassword"
                    placeholder="Enter current password"
                    autocomplete="current-password"
                    class="form-control"
                  />
                </div>

                <div class="form-row-2">
                  <div class="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      [(ngModel)]="newPassword"
                      name="newPassword"
                      placeholder="Min 6 characters"
                      autocomplete="new-password"
                      class="form-control"
                    />
                  </div>

                  <div class="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      [(ngModel)]="confirmPassword"
                      name="confirmPassword"
                      placeholder="Repeat new password"
                      autocomplete="new-password"
                      class="form-control"
                    />
                  </div>
                </div>

                <div class="section-action-row">
                  <button
                    type="submit"
                    class="btn-primary-sm"
                    [disabled]="isUpdatingPassword()"
                  >
                    {{ isUpdatingPassword() ? 'Updating...' : 'Update Password' }}
                  </button>
                </div>
              </form>
            </section>

            <div class="section-divider"></div>

            <!-- SECTION 2: EMAIL NOTIFICATIONS -->
            <section class="settings-section">
              <div class="section-title-line">
                <span class="section-icon">📧</span>
                <div>
                  <h4>Email Notifications on Assignment</h4>
                  <p class="section-desc">
                    Control whether an automated notification email is dispatched when a referee is assigned.
                  </p>
                </div>
              </div>

              <div class="email-toggle-card">
                <div class="email-toggle-meta">
                  <strong>Referee Assignment Dispatch</strong>
                  <p>Send email alerts to referees when new manuscripts are assigned.</p>
                </div>
                <label class="switch-toggle">
                  <input
                    type="checkbox"
                    [checked]="service.emailNotificationsEnabled()"
                    (change)="toggleEmailNotifications($event)"
                  />
                  <span class="slider-toggle"></span>
                </label>
              </div>
            </section>

            <div class="section-divider"></div>

            <!-- SECTION 3: RESTORE DEFAULT MOCK DATA -->
            <section class="settings-section">
              <div class="section-title-line">
                <span class="section-icon text-indigo">🔄</span>
                <div>
                  <h4>Restore Default Mock JSON Data</h4>
                  <p class="section-desc">
                    Reset all articles, reviewers, and reviewer assignments back to the initial <code>mock_openalex_data.json</code> dataset.
                  </p>
                </div>
              </div>

              <div class="restore-box">
                <div class="restore-info">
                  <span class="pill-dataset">Original OpenAlex Mock</span>
                  <p class="restore-text">
                    This will reset <code>articles.json</code>, <code>reviewers.json</code>, and clear <code>assignments.json</code>.
                  </p>
                </div>
                <button
                  type="button"
                  class="btn-restore-data"
                  (click)="onRestoreMockData()"
                  [disabled]="isRestoring()"
                >
                  {{ isRestoring() ? 'Restoring...' : '🔄 Restore Default JSON Data' }}
                </button>
              </div>
            </section>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="close()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(6px);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 25px 50px -12px rgba(108, 71, 255, 0.25);
      border: 1px solid #e0e7ff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }
    .modal-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      position: relative;
    }
    .badge-icon {
      font-size: 1.5rem;
      background: #f5f3ff;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: grid;
      place-items: center;
    }
    .header-titles h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e1b4b;
      margin: 0;
    }
    .header-titles p {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }
    .close-x-btn {
      position: absolute;
      right: 1.25rem;
      top: 1.25rem;
      background: transparent;
      border: none;
      font-size: 1.1rem;
      color: #94a3b8;
      cursor: pointer;
      border-radius: 8px;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
    }
    .close-x-btn:hover {
      background: #f1f5f9;
      color: #334155;
    }
    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      overflow-y: auto;
    }
    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .section-title-line {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .section-icon {
      font-size: 1.2rem;
      margin-top: 2px;
    }
    .section-title-line h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0b1c30;
    }
    .section-desc {
      margin: 2px 0 0 0;
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.4;
    }
    .section-desc code {
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #6c47ff;
    }
    .section-divider {
      height: 1px;
      background: #f1f5f9;
      margin: 0.25rem 0;
    }
    .section-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #334155;
    }
    .form-control {
      padding: 0.6rem 0.8rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.85rem;
      outline: none;
      transition: all 0.15s ease;
    }
    .form-control:focus {
      border-color: #6c47ff;
      box-shadow: 0 0 0 3px rgba(108, 71, 255, 0.15);
    }
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      font-size: 0.8rem;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
    }
    .section-action-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.25rem;
    }
    .btn-primary-sm {
      padding: 0.55rem 1rem;
      background: #6c47ff;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-primary-sm:hover:not(:disabled) {
      background: #5835e5;
    }
    .btn-primary-sm:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .email-toggle-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .email-toggle-meta strong {
      font-size: 0.84rem;
      color: #0b1c30;
      display: block;
    }
    .email-toggle-meta p {
      margin: 2px 0 0 0;
      font-size: 0.74rem;
      color: #64748b;
    }
    .switch-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .switch-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider-toggle {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #cbd5e1;
      transition: 0.2s;
      border-radius: 24px;
    }
    .slider-toggle:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }
    input:checked + .slider-toggle {
      background-color: #6c47ff;
    }
    input:checked + .slider-toggle:before {
      transform: translateX(20px);
    }
    .restore-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .restore-info {
      flex: 1;
      min-width: 200px;
    }
    .pill-dataset {
      display: inline-block;
      background: #eff4ff;
      color: #4f46e5;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 4px;
    }
    .restore-text {
      margin: 0;
      font-size: 0.74rem;
      color: #64748b;
      line-height: 1.35;
    }
    .restore-text code {
      background: #e2e8f0;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .btn-restore-data {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      color: #1e1b4b;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-restore-data:hover:not(:disabled) {
      background: #eff4ff;
      border-color: #6c47ff;
      color: #5835e5;
    }
    .btn-restore-data:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .modal-footer {
      padding: 1rem 1.5rem;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
    }
    .btn-cancel {
      padding: 0.55rem 1.1rem;
      background: #e2e8f0;
      color: #334155;
      border: none;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-cancel:hover {
      background: #cbd5e1;
    }
  `]
})
export class SettingsModalComponent {
  auth = inject(AuthService);
  service = inject(ReviewerMatchingService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = signal<string>('');
  isUpdatingPassword = signal<boolean>(false);
  isRestoring = signal<boolean>(false);

  close(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError.set('');
    this.auth.isSettingsOpen.set(false);
  }

  toggleEmailNotifications(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.service.setEmailNotifications(input.checked);
  }

  onPasswordSubmit(): void {
    this.passwordError.set('');

    if (!this.currentPassword.trim()) {
      this.passwordError.set('Please enter your current password.');
      return;
    }

    if (!this.newPassword || this.newPassword.length < 6) {
      this.passwordError.set('New password must be at least 6 characters.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('New passwords do not match.');
      return;
    }

    this.isUpdatingPassword.set(true);

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe(res => {
      this.isUpdatingPassword.set(false);
      if (res.success) {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      } else {
        this.passwordError.set(res.error || 'Failed to update password.');
      }
    });
  }

  onRestoreMockData(): void {
    if (confirm('Are you sure you want to restore all articles, reviewers, and assignments back to original mock JSON data?')) {
      this.isRestoring.set(true);
      this.service.resetWorkspace().subscribe(() => {
        this.isRestoring.set(false);
      });
    }
  }
}
