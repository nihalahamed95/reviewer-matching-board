import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page-wrapper">
      <div class="login-card-container">
        <div class="brand-header">
          <div class="brand-logo-box">
            <span class="brand-symbol">📚</span>
          </div>
          <h1 class="brand-title">Reviewer Matching Board</h1>
          <p class="brand-subtitle">Editorial Peer Review & Institutional Governance System</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form-box">
          <div class="form-group">
            <label for="email">Editorial Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="editor@straive.com"
              required
              autocomplete="email"
              class="login-input"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="••••••••"
              required
              autocomplete="current-password"
              class="login-input"
            />
          </div>

          <button type="submit" class="btn-signin" [disabled]="auth.isLoggingIn()">
            @if (auth.isLoggingIn()) {
              <span class="btn-spinner"></span> Authenticating...
            } @else {
              Sign In to Editorial Workspace
            }
          </button>

          
        </form>

        
      </div>
    </div>
  `,
  styles: [`
    .login-page-wrapper {
      min-height: 100vh;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8f9ff 0%, #edf0ff 50%, #e8ecff 100%);
      padding: 24px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .login-card-container {
      background: #ffffff;
      border-radius: 24px;
      width: 100%;
      max-width: 460px;
      padding: 40px;
      box-shadow: 0 20px 45px -10px rgba(108, 71, 255, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8);
      animation: fadeIn 0.25s ease-out;
    }

    .brand-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .brand-logo-box {
      width: 58px;
      height: 58px;
      background: linear-gradient(135deg, #6c47ff 0%, #5835e5 100%);
      border-radius: 18px;
      margin: 0 auto 16px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 24px -4px rgba(108, 71, 255, 0.4);
    }

    .brand-symbol {
      font-size: 1.75rem;
    }

    .brand-title {
      margin: 0 0 6px 0;
      font-size: 1.45rem;
      font-weight: 800;
      color: #0b1c30;
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      margin: 0;
      font-size: 0.84rem;
      color: #64748b;
      line-height: 1.45;
    }

    .login-form-box {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e1b4b;
    }

    .login-input {
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 0.92rem;
      outline: none;
      transition: all 0.2s ease;
      background: #fafafa;
    }

    .login-input:focus {
      background: #ffffff;
      border-color: #6c47ff;
      box-shadow: 0 0 0 3px rgba(108, 71, 255, 0.15);
    }

    .btn-signin {
      background: linear-gradient(135deg, #6c47ff 0%, #5835e5 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 13px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 8px 20px -4px rgba(108, 71, 255, 0.35);
      transition: all 0.15s ease;
      margin-top: 4px;
    }

    .btn-signin:hover:not(:disabled) {
      background: linear-gradient(135deg, #5835e5 0%, #4726c9 100%);
      transform: translateY(-1px);
      box-shadow: 0 10px 24px -4px rgba(108, 71, 255, 0.45);
    }

    .btn-signin:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .demo-card {
      background: #f8f9ff;
      border: 1.5px dashed #c7d2fe;
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }

    .demo-info {
      text-align: center;
    }

    .demo-badge {
      display: inline-block;
      background: #e0e7ff;
      color: #4338ca;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 4px;
    }

    .demo-info p {
      margin: 0;
      font-size: 0.78rem;
      color: #475569;
    }

    .btn-demo-quick {
      background: #ffffff;
      border: 1.5px solid #a5b4fc;
      color: #4f46e5;
      border-radius: 10px;
      padding: 9px;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-demo-quick:hover:not(:disabled) {
      background: #eef2ff;
      border-color: #6366f1;
    }

    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .login-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      font-size: 0.72rem;
      color: #94a3b8;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LoginPageComponent {
  auth = inject(AuthService);

  email = 'editor@straive.com';
  password = 'admin123';

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.auth.login(this.email, this.password).subscribe();
  }

  fillAndSubmitDemo(): void {
    this.email = 'editor@straive.com';
    this.password = 'admin123';
    this.auth.login(this.email, this.password).subscribe();
  }
}
