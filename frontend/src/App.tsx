import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useEffect } from 'react';
import { useSiteStore } from '@/stores/site.store';

// Layouts
import { MainLayout, DashboardLayout, AdminLayout } from '@/components/layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Public Pages
import {
  HomePage,
  MenuPage,
  CartPage,
  CheckoutPage,
  ContactPage,
  AboutPage,
  TermsPage,
  PrivacyPage,
  FAQPage,
  NotFoundPage,
} from '@/pages';

// Auth Pages
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '@/pages';

// Event Pages
import { CreateEventPage, QuoteViewPage } from '@/pages';

// Dashboard Pages
import {
  DashboardHome,
  OrdersPage,
  OrderDetailPage,
  EventsPage,
  EventDetailPage,
  InvoicesPage,
  AddressesPage,
  ProfilePage,
} from '@/pages';

// Admin Pages
import {
  AdminDashboard,
  AdminCategoriesPage,
  AdminPlatsPage,
  AdminOrdersPage,
  AdminEventsPage,
  AdminQuotesPage,
  AdminUsersPage,
  AdminStatsPage,
  AdminSettingsPage,
  AdminHealthPage,
  AdminCalendarPage,
  AdminStockPage,
  AdminEventDetailsPage,
  AdminModulePlaceholderPage,
  AdminStockMovementsPage,
  AdminStockTakePage,
  AdminSuppliersPage,
  AdminInvoicesPage,
  AdminPurchaseOrdersPage,
  AdminExpensesPage,
  AdminAuditLogsPage,
  AdminCreditNotesPage,
  AdminAIScannerPage,
  AdminReportGeneratorPage,
  AdminAIReportPage,
} from '@/pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const loadConfig = useSiteStore((s) => s.loadConfig);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* === Public Pages (with Navbar + Footer) === */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>

          {/* === Auth Pages (no layout) === */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* === Protected: Checkout & Events (with Navbar + Footer) === */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/events/create" element={<CreateEventPage />} />
              <Route path="/quotes/:quoteNumber" element={<QuoteViewPage />} />
            </Route>
          </Route>

          {/* === Client Dashboard (Protected) === */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/dashboard/orders" element={<OrdersPage />} />
              <Route path="/dashboard/orders/:id" element={<OrderDetailPage />} />
              <Route path="/dashboard/events" element={<EventsPage />} />
              <Route path="/dashboard/events/:id" element={<EventDetailPage />} />
              <Route path="/dashboard/invoices" element={<InvoicesPage />} />
              <Route path="/dashboard/addresses" element={<AddressesPage />} />
              <Route path="/dashboard/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* === Admin Panel (Protected + Admin Required) === */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/plats" element={<AdminPlatsPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/events" element={<AdminEventsPage />} />
              <Route path="/admin/events/:id" element={<AdminEventDetailsPage />} />
              <Route path="/admin/quotes" element={<AdminQuotesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/stats" element={<AdminStatsPage />} />
              <Route path="/admin/calendar" element={<AdminCalendarPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/health" element={<AdminHealthPage />} />
              <Route path="/admin/stock" element={<AdminStockPage />} />
              <Route
                path="/admin/documents/factures"
                element={<AdminInvoicesPage mode="documents" />}
              />
              <Route
                path="/admin/documents/purchase-orders"
                element={<AdminPurchaseOrdersPage />}
              />
              <Route
                path="/admin/documents/credit-notes"
                element={<AdminCreditNotesPage />}
              />
              <Route
                path="/admin/documents/ai-scanner"
                element={<AdminAIScannerPage />}
              />
              <Route
                path="/admin/stock/movements"
                element={<AdminStockMovementsPage />}
              />
              <Route
                path="/admin/stock/take"
                element={<AdminStockTakePage />}
              />
              <Route
                path="/admin/finance/payments-cash"
                element={<AdminInvoicesPage mode="finance" />}
              />
              <Route
                path="/admin/finance/expenses"
                element={<AdminExpensesPage />}
              />
              <Route
                path="/admin/finance/audit-logs"
                element={<AdminAuditLogsPage />}
              />
              <Route
                path="/admin/suppliers"
                element={<AdminSuppliersPage />}
              />
              <Route
                path="/admin/reports/generator"
                element={<AdminReportGeneratorPage />}
              />
              <Route
                path="/admin/reports/ai"
                element={<AdminAIReportPage />}
              />
            </Route>
          </Route>

          {/* === 404 Catch-all === */}
          <Route element={<MainLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 24px -8px rgba(0, 0, 0, 0.08)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
