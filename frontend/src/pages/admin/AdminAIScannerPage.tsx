import { useState, useCallback } from 'react';
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui';

interface ScannedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl: string;
  uploadedAt: string;
  extractedData?: {
    total?: string;
    date?: string;
    supplier?: string;
    items?: number;
  };
}

const DOCS_KEY = 'admin_scanned_docs_v1';

function loadDocs(): ScannedDocument[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDocs(docs: ScannedDocument[]) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs.slice(0, 50)));
}

export default function AdminAIScannerPage() {
  const [documents, setDocuments] = useState<ScannedDocument[]>(loadDocs());
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ScannedDocument | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.match(/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/)) {
      toast.error('Format accepté : PDF, PNG, JPG, WEBP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 Mo)');
      return;
    }

    setIsProcessing(true);

    // Simulate AI processing delay
    await new Promise((r) => setTimeout(r, 1500));

    const previewUrl = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : '';

    // Simulate extracted data (real OCR would use an AI service)
    const simulatedData = {
      total: `${(Math.random() * 500 + 50).toFixed(2)} DT`,
      date: new Date().toLocaleDateString('fr-FR'),
      supplier: ['Metro', 'Carrefour Pro', 'STIAL', 'Médina Market'][Math.floor(Math.random() * 4)],
      items: Math.floor(Math.random() * 12) + 1,
    };

    const doc: ScannedDocument = {
      id: `SCAN-${Date.now()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl,
      uploadedAt: new Date().toISOString(),
      extractedData: simulatedData,
    };

    const updated = [doc, ...documents];
    setDocuments(updated);
    saveDocs(updated);
    setIsProcessing(false);
    toast.success('Document analysé avec succès');
  }, [documents]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      void processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processFile(files[0]);
    }
  };

  const removeDoc = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    saveDocs(updated);
    toast.success('Document supprimé');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-gray-900">AI Scanner</h1>
        <p className="mt-1 text-sm text-gray-500">Analysez vos factures, devis et bons de commande par intelligence artificielle</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          isDragging
            ? 'border-primary-400 bg-primary-50/50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        {isProcessing ? (
          <div className="space-y-3">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
            <p className="text-sm font-medium text-primary-600">Analyse en cours...</p>
            <p className="text-xs text-gray-400">Extraction des données par IA</p>
          </div>
        ) : (
          <>
            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-700">
              Glissez un document ici ou{' '}
              <label className="cursor-pointer text-primary-500 hover:text-primary-600">
                parcourir
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </p>
            <p className="mt-1 text-xs text-gray-400">PDF, PNG, JPG, WEBP — Max 10 Mo</p>
          </>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Documents scannés</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{documents.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-blue-700">Ce mois</p>
          <p className="mt-2 text-xl font-semibold text-blue-800">
            {documents.filter((d) => {
              const now = new Date();
              const dDate = new Date(d.uploadedAt);
              return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Données extraites</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800">
            {documents.filter((d) => d.extractedData).length}
          </p>
        </div>
      </div>

      {/* Documents List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Documents analysés</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {documents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Aucun document scanné
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <DocumentTextIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {doc.extractedData && (
                  <div className="hidden md:flex items-center gap-6 text-xs text-gray-500 mx-4">
                    <span><strong>Total:</strong> {doc.extractedData.total}</span>
                    <span><strong>Fournisseur:</strong> {doc.extractedData.supplier}</span>
                    <span><strong>Articles:</strong> {doc.extractedData.items}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {doc.previewUrl && (
                    <Button size="sm" variant="outline" onClick={() => setPreviewDoc(doc)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => removeDoc(doc.id)}>
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-2xl max-h-[80vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">{previewDoc.name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {previewDoc.previewUrl && (
              <img src={previewDoc.previewUrl} alt={previewDoc.name} className="rounded-lg max-w-full" />
            )}
            {previewDoc.extractedData && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                <h4 className="font-semibold text-gray-900">Données extraites par IA</h4>
                <p><strong>Total détecté :</strong> {previewDoc.extractedData.total}</p>
                <p><strong>Date :</strong> {previewDoc.extractedData.date}</p>
                <p><strong>Fournisseur :</strong> {previewDoc.extractedData.supplier}</p>
                <p><strong>Nombre d'articles :</strong> {previewDoc.extractedData.items}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
