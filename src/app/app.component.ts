import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewerMatchingService } from './services/reviewer-matching.service';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/toast/toast.component';
import { LoginPageComponent } from './components/login/login-page.component';
import { SettingsModalComponent } from './components/settings/settings-modal.component';
import { Article, Reviewer } from './models/reviewer-matching.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastComponent,
    LoginPageComponent,
    SettingsModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  service = inject(ReviewerMatchingService);
  auth = inject(AuthService);

  activeTab = signal<'dashboard' | 'articles' | 'reviewers'>('dashboard');
  searchQuery = signal<string>('');
  isProfileDropdownOpen = signal<boolean>(false);

  isAddArticleModalOpen = signal<boolean>(false);
  articleTitle = '';
  articleAuthorName = '';
  articleAuthorInst = '';
  isSavingArticle = signal<boolean>(false);

  isAddReviewerModalOpen = signal<boolean>(false);
  reviewerName = '';
  reviewerInst = '';
  reviewerKeywords = '';
  isSavingReviewer = signal<boolean>(false);

  displayArticles = computed(() => {
    const articles = this.service.articles();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) return articles;

    return articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.author.name.toLowerCase().includes(query) ||
      a.author.institution.toLowerCase().includes(query)
    );
  });

  displayReviewers = computed(() => {
    const reviewers = this.service.reviewers();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) return reviewers;

    return reviewers.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.institution.toLowerCase().includes(query) ||
      r.keywords.some(k => k.toLowerCase().includes(query))
    );
  });

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.loadData();
      }
    });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.loadData();
    }
  }

  loadData(): void {
    this.service.fetchArticles().subscribe();
    this.service.fetchReviewers().subscribe();
    this.service.fetchStats().subscribe();
  }

  onLogout(): void {
    this.isProfileDropdownOpen.set(false);
    this.auth.logout();
  }

  selectArticle(article: Article): void {
    this.service.selectArticle(article);
  }

  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen.update(v => !v);
  }

  openSettings(): void {
    this.isProfileDropdownOpen.set(false);
    this.auth.isSettingsOpen.set(true);
  }

  onAssign(reviewer: Reviewer): void {
    const selected = this.service.selectedArticle();
    if (!selected) return;

    this.service.assignReviewer(selected.id, reviewer.id).subscribe();
  }

  getReviewerName(id: string | null | undefined): string | null {
    if (!id) return null;
    const r = this.service.reviewers().find(rev => rev.id === id);
    return r ? r.name : id;
  }

  openAddArticleModal(): void {
    this.articleTitle = '';
    this.articleAuthorName = '';
    this.articleAuthorInst = '';
    this.isAddArticleModalOpen.set(true);
  }

  closeAddArticleModal(): void {
    this.isAddArticleModalOpen.set(false);
  }

  saveArticle(): void {
    if (!this.articleTitle.trim() || !this.articleAuthorName.trim() || !this.articleAuthorInst.trim()) {
      return;
    }
    this.isSavingArticle.set(true);
    this.service.createArticle({
      title: this.articleTitle.trim(),
      author: {
        name: this.articleAuthorName.trim(),
        institution: this.articleAuthorInst.trim()
      }
    }).subscribe(() => {
      this.isSavingArticle.set(false);
      this.closeAddArticleModal();
    });
  }

  deleteArticle(id: string): void {
    if (confirm(`Are you sure you want to delete article ${id}?`)) {
      this.service.deleteArticle(id).subscribe();
    }
  }

  openAddReviewerModal(): void {
    this.reviewerName = '';
    this.reviewerInst = '';
    this.reviewerKeywords = '';
    this.isAddReviewerModalOpen.set(true);
  }

  closeAddReviewerModal(): void {
    this.isAddReviewerModalOpen.set(false);
  }

  saveReviewer(): void {
    if (!this.reviewerName.trim() || !this.reviewerInst.trim()) {
      return;
    }
    this.isSavingReviewer.set(true);
    const keywords = this.reviewerKeywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    this.service.createReviewer({
      name: this.reviewerName.trim(),
      institution: this.reviewerInst.trim(),
      keywords
    }).subscribe(() => {
      this.isSavingReviewer.set(false);
      this.closeAddReviewerModal();
    });
  }

  deleteReviewer(id: string): void {
    if (confirm(`Are you sure you want to delete reviewer ${id}?`)) {
      this.service.deleteReviewer(id).subscribe();
    }
  }
}
