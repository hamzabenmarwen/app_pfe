import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  PlusCircleIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Badge, Button, Input, LoadingSpinner } from '@/components/ui';
import {
  catalogService,
  type Expense,
  type ExpenseStatus,
} from '@/services/catalog.service';

const statusLabel: Record<ExpenseStatus, string> = {
  DRAFT: 'Brouillon',
  APPROVED: 'Approuvee',
  PAID: 'Payee',
  REJECTED: 'Rejetee',
};

const statusVariant: Record<ExpenseStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  APPROVED: 'info',
  PAID: 'success',
  REJECTED: 'error',
};

const categories = ['Achat matiere', 'Transport', 'Maintenance', 'Salaire', 'Marketing', 'Autre'];

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const refresh = async () => {
    try {
      setIsLoading(true);
      const response = await catalogService.getExpenses();
      setExpenses((response.data || []) as Expense[]);
    } catch {
      toast.error('Erreur chargement des depenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const resetForm = () => {
    setTitle('');
    setCategory(categories[0]);
    setAmount('');
    setExpenseDate('');
    setSupplierName('');
    setPaymentMethod('CASH');
    setNotes('');
  };

  const handleCreateExpense = async () => {
    const amountValue = Number(amount);
    if (!title.trim()) {
      toast.error('Titre obligatoire');
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!expenseDate) {
      toast.error('Date obligatoire');
      return;
    }

    try {
      setIsSubmitting(true);
      await catalogService.createExpense({
        title: title.trim(),
        category,
        amount: amountValue,
        expenseDate,
        supplierName: supplierName.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      resetForm();
      toast.success('Depense ajoutee');
      await refresh();
    } catch {
      toast.error('Erreur creation depense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (expense: Expense, status: ExpenseStatus) => {
    try {
      setIsSubmitting(true);
      await catalogService.updateExpenseStatus(expense.id, status);
      await refresh();
    } catch {
      toast.error('Erreur mise a jour statut');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeExpense = async (expense: Expense) => {
    try {
      setIsSubmitting(true);
      await catalogService.deleteExpense(expense.id);
      toast.success('Depense supprimee');
      await refresh();
    } catch {
      toast.error('Erreur suppression depense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const kpis = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const monthTotal = expenses
      .filter((e) => {
        const d = new Date(e.expenseDate);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    const paid = expenses.filter((e) => e.status === 'PAID').reduce((sum, e) => sum + e.amount, 0);
    const pending = expenses
      .filter((e) => e.status === 'DRAFT' || e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.amount, 0);

    return { total, monthTotal, paid, pending };
  }, [expenses]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Depenses</h1>
          <p className="mt-1 text-sm text-gray-500">Saisie et suivi des depenses operationnelles.</p>
        </div>
        <Button variant="outline" onClick={() => void refresh()}>
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{kpis.total.toFixed(2)} DT</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Ce mois</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{kpis.monthTotal.toFixed(2)} DT</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Paye</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800">{kpis.paid.toFixed(2)} DT</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">En attente</p>
          <p className="mt-2 text-xl font-semibold text-amber-800">{kpis.pending.toFixed(2)} DT</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Nouvelle depense</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Achat legumes" />

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Categorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <Input
            type="number"
            step="0.001"
            label="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          />

          <Input type="date" label="Date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          <Input label="Fournisseur" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Optionnel" />

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Paiement</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="CASH">Especes</option>
              <option value="CARD">Carte</option>
              <option value="TRANSFER">Virement</option>
            </select>
          </div>
        </div>

        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarque interne" />

        <div className="flex justify-end">
          <Button onClick={() => void handleCreateExpense()} isLoading={isSubmitting}>
            <PlusCircleIcon className="h-4 w-4" />
            Ajouter depense
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Categorie</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Aucune depense</td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(expense.expenseDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-semibold text-gray-900">{expense.title}</p>
                      <p className="text-gray-500">{expense.supplierName || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{expense.category}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{expense.amount.toFixed(2)} DT</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[expense.status]}>{statusLabel[expense.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {expense.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" onClick={() => void setStatus(expense, 'APPROVED')} disabled={isSubmitting}>
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {expense.status === 'APPROVED' && (
                          <Button size="sm" onClick={() => void setStatus(expense, 'PAID')} disabled={isSubmitting}>
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {expense.status !== 'REJECTED' && expense.status !== 'PAID' && (
                          <Button size="sm" variant="outline" onClick={() => void setStatus(expense, 'REJECTED')} disabled={isSubmitting}>
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {expense.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" onClick={() => void removeExpense(expense)} disabled={isSubmitting}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
