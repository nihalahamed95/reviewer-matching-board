import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError, of } from 'rxjs';
import { Article, Reviewer, ApiResponse, Assignment, DashboardStats } from '../models/reviewer-matching.models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewerMatchingService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly baseUrl = 'http://localhost/straive_task/api';

  articles = signal<Article[]>([]);
  reviewers = signal<Reviewer[]>([]);
  selectedArticle = signal<Article | null>(null);
  emailNotificationsEnabled = signal<boolean>(localStorage.getItem('straive_email_notifications') !== 'false');

  stats = signal<DashboardStats>({
    total_articles: 0,
    total_reviewers: 0,
    assigned_articles: 0,
    conflicts_count: 0
  });

  isLoading = signal<boolean>(false);
  isAssigning = signal<boolean>(false);

  setEmailNotifications(enabled: boolean): void {
    this.emailNotificationsEnabled.set(enabled);
    localStorage.setItem('straive_email_notifications', String(enabled));
  }

  fetchArticles(): Observable<Article[]> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<Article[]>>(`${this.baseUrl}/articles`).pipe(
      map(res => res.data || []),
      tap(articles => {
        this.articles.set(articles);
        this.isLoading.set(false);

        if (!this.selectedArticle() && articles.length > 0) {
          this.selectedArticle.set(articles[0]);
        }
      }),
      catchError(err => {
        this.isLoading.set(false);
        this.toast.error('Unable to connect to API: ' + this.baseUrl);
        return throwError(() => err);
      })
    );
  }

  fetchReviewers(): Observable<Reviewer[]> {
    return this.http.get<ApiResponse<Reviewer[]>>(`${this.baseUrl}/reviewers`).pipe(
      map(res => res.data || []),
      tap(reviewers => this.reviewers.set(reviewers)),
      catchError(err => throwError(() => err))
    );
  }

  fetchStats(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/stats`).pipe(
      tap(res => {
        if (res.stats) {
          this.stats.set(res.stats);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  createArticle(payload: { title: string; author: { name: string; institution: string }; id?: string }): Observable<ApiResponse<Article>> {
    return this.http.post<ApiResponse<Article>>(`${this.baseUrl}/articles`, payload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.articles.update(list => [...list, res.data!]);
          this.toast.success(res.message || 'Article added successfully.');
          this.fetchStats().subscribe();
        }
      }),
      catchError(err => {
        const msg = err.error?.error || 'Failed to add article.';
        this.toast.error(msg);
        return of({ success: false, error: msg });
      })
    );
  }

  deleteArticle(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/articles/delete`, { id }).pipe(
      tap(res => {
        if (res.success) {
          this.articles.update(list => list.filter(a => a.id !== id));
          if (this.selectedArticle()?.id === id) {
            const remaining = this.articles();
            this.selectedArticle.set(remaining.length > 0 ? remaining[0] : null);
          }
          this.toast.success(res.message || 'Article removed.');
          this.fetchStats().subscribe();
        }
      }),
      catchError(err => {
        const msg = err.error?.error || 'Failed to remove article.';
        this.toast.error(msg);
        return of({ success: false, error: msg });
      })
    );
  }

  createReviewer(payload: { name: string; institution: string; keywords: string[]; id?: string }): Observable<ApiResponse<Reviewer>> {
    return this.http.post<ApiResponse<Reviewer>>(`${this.baseUrl}/reviewers`, payload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.reviewers.update(list => [...list, res.data!]);
          this.toast.success(res.message || 'Reviewer added successfully.');
          this.fetchStats().subscribe();
        }
      }),
      catchError(err => {
        const msg = err.error?.error || 'Failed to add reviewer.';
        this.toast.error(msg);
        return of({ success: false, error: msg });
      })
    );
  }

  deleteReviewer(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/reviewers/delete`, { id }).pipe(
      tap(res => {
        if (res.success) {
          this.reviewers.update(list => list.filter(r => r.id !== id));
          this.articles.update(list => list.map(a => a.assigned_reviewer_id === id ? { ...a, assigned_reviewer_id: null } : a));
          const sel = this.selectedArticle();
          if (sel && sel.assigned_reviewer_id === id) {
            this.selectedArticle.set({ ...sel, assigned_reviewer_id: null });
          }
          this.toast.success(res.message || 'Reviewer removed.');
          this.fetchStats().subscribe();
        }
      }),
      catchError(err => {
        const msg = err.error?.error || 'Failed to remove reviewer.';
        this.toast.error(msg);
        return of({ success: false, error: msg });
      })
    );
  }

  assignReviewer(articleId: string, reviewerId: string): Observable<ApiResponse<Assignment>> {
    this.isAssigning.set(true);
    const payload = { article_id: articleId, reviewer_id: reviewerId };

    return this.http.post<ApiResponse<Assignment>>(`${this.baseUrl}/assign`, payload).pipe(
      tap(response => {
        this.isAssigning.set(false);
        const emailNotice = this.emailNotificationsEnabled() ? ' 📧 Email notification sent to reviewer.' : '';
        this.toast.success((response.message || 'Reviewer successfully assigned.') + emailNotice);

        this.articles.update(list =>
          list.map(art => art.id === articleId ? { ...art, assigned_reviewer_id: reviewerId } : art)
        );

        const current = this.selectedArticle();
        if (current && current.id === articleId) {
          this.selectedArticle.set({ ...current, assigned_reviewer_id: reviewerId });
        }

        this.fetchStats().subscribe();
      }),
      catchError((error: HttpErrorResponse) => {
        this.isAssigning.set(false);
        const errMsg = error.error?.error || error.message || 'Assignment failed.';

        if (error.status === 409) {
          this.toast.error(`🚫 ${errMsg}`);
        } else {
          this.toast.error(`Error (${error.status}): ${errMsg}`);
        }

        return throwError(() => error);
      })
    );
  }

  resetWorkspace(): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset`, {}).pipe(
      tap(() => {
        this.fetchArticles().subscribe();
        this.fetchReviewers().subscribe();
        this.fetchStats().subscribe();
        this.toast.success('Default mock JSON data restored.');
      }),
      catchError(err => {
        this.toast.error('Failed to reset mock data.');
        return throwError(() => err);
      })
    );
  }

  hasConflictOfInterest(article: Article | null, reviewer: Reviewer): boolean {
    if (!article || !article.author?.institution || !reviewer?.institution) {
      return false;
    }
    const authorInst = article.author.institution.trim().toLowerCase();
    const reviewerInst = reviewer.institution.trim().toLowerCase();
    return authorInst.length > 0 && authorInst === reviewerInst;
  }

  selectArticle(article: Article): void {
    this.selectedArticle.set(article);
  }
}
