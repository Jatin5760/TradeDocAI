'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, authHeaders, clearSession } from '../../lib/api';

// Types & Utils
import { Schema, SchemaSection, SchemaField, RecentDoc, AppPage, ModalType, SettingsTab } from './types';

// Components
import DashboardSidebar from './components/DashboardSidebar';
import '../landingpage/styles/landing.css'; // Import glass styles
import RecentDocuments from './components/RecentDocuments';
import AIExtractPanel from './components/AIExtractPanel';
import ValidationReport from './components/ValidationReport';
import { SelectionStep, SectionStep, FieldsStep } from './components/WizardComponents';
import ChatCopilot from './components/ChatCopilot';
import ChatSidebar from './components/ChatSidebar';

// Replicated Components
import DocumentOverviewCards, { TimeSavedCard } from './components/DocumentOverviewCards';
import MoneySavedCard from './components/MoneySavedCard';
import RecentActivitySection from './components/RecentActivitySection';
import ActivityChart from './components/ActivityChart';
import DocumentTypeBreakdown from './components/DocumentTypeBreakdown';
import ExtractionEfficiencyChart from './components/ExtractionEfficiencyChart';
import SettingsUI from './components/SettingsUI';
import MyDocumentsUI from './components/MyDocumentsUI';
import WorkflowBuilderPanel from './components/WorkflowBuilderPanel';
import dynamic from 'next/dynamic';

const CustomPDFViewer = dynamic(() => import('./components/CustomPDFViewer'), { 
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initializing Editor...</p>
    </div>
  )
});



// ── API Base ──────────────────────────────────
const API = API_BASE;

const validPages: AppPage[] = ['landing', 'analytics', 'ai', 'form', 'pdf', 'settings', 'my-documents', 'workflow-builder'];

function getInitialPage(): AppPage {
  return 'landing';
}

function getInitialSettingsTab(): SettingsTab {
  return 'edit-profile';
}

function getStoredUserName(): string {
  return 'User';
}

function readPageFromURL(): AppPage {
  if (typeof window === 'undefined') return 'landing';
  const urlPage = new URLSearchParams(window.location.search).get('page') as AppPage | null;
  return urlPage && validPages.includes(urlPage) ? urlPage : 'landing';
}

function readSettingsTabFromURL(): SettingsTab {
  if (typeof window === 'undefined') return 'edit-profile';
  const urlSub = new URLSearchParams(window.location.search).get('sub') as SettingsTab | null;
  return urlSub && ['edit-profile', 'security'].includes(urlSub) ? urlSub : 'edit-profile';
}

function readStoredUserName(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}') as { name?: string; email?: string };
    return user.name || user.email || 'User';
  } catch {
    return 'User';
  }
}

// ── Schema Registry ───────────────────────────
const SCHEMA_REGISTRY = [
  { id: 'fx_ndf', file: '/schemas/fx_schema.json' },
  { id: 'irs', file: '/schemas/irs_schema.json' },
  { id: 'cds', file: '/schemas/cds_schema.json' },
  { id: 'equity_trs', file: '/schemas/equity_trs_schema.json' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // ── State ────────────────────────────────
  const [schemas, setSchemas] = useState<Record<string, Schema>>({});
  const [page, setPage] = useState<AppPage>(getInitialPage);
  const [modal, setModal] = useState<ModalType>('none');
  const [activeSchema, setActiveSchema] = useState<Schema | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<string, unknown>>({});
  const [irsSelections, setIrsSelections] = useState<Record<string, string>>({});
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState(false);
  const [aiEmailText, setAiEmailText] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [validationReport, setValidationReport] = useState('');
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);
  const [hasExistingValidationReport, setHasExistingValidationReport] = useState(false);
  const [currentPdfBlobUrl, setCurrentPdfBlobUrl] = useState<string | null>(null);
  const [currentPdfFilename, setCurrentPdfFilename] = useState('confirmation.pdf');
  const [currentPdfFileId, setCurrentPdfFileId] = useState('');
  const [currentGcsObjectPath, setCurrentGcsObjectPath] = useState('');
  const [showValidateOnPdf, setShowValidateOnPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [loadingSub, setLoadingSub] = useState('Please wait');
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userName, setUserName] = useState('User');
  const [backendDown, setBackendDown] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [settingsSub, setSettingsSub] = useState<SettingsTab>(getInitialSettingsTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const previousPageRef = useRef<AppPage | null>(null);
  const currentPageRef = useRef<AppPage>('landing');
  const stepperRef = useRef<HTMLDivElement>(null);

  // ── URL Sync & Init ───────────────────────
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    // Read page/settings from URL on client-side only (avoids hydration mismatch)
    setPage(readPageFromURL());
    setSettingsSub(readSettingsTabFromURL());
    const timer = window.setTimeout(() => setUserName(readStoredUserName()), 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  // Keep ref in sync with page state (avoids stale closure in callbacks)
  useEffect(() => {
    currentPageRef.current = page;
  }, [page]);

  // 2. Sync State to URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', page);
      
      if (page === 'settings') {
        url.searchParams.set('sub', settingsSub);
      } else {
        url.searchParams.delete('sub');
      }

      if (page === 'form' && activeSchema) {
        url.searchParams.set('type', activeSchema.id);
      } else {
        url.searchParams.delete('type');
      }

      window.history.pushState({}, '', url.toString());
    }
  }, [page, settingsSub, activeSchema]);

  // ── Data Fetching ─────────────────────────
  const fetchRecentDocs = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/documents`, { headers: authHeaders() });
      if (r.status === 401) {
        clearSession();
        router.push('/');
        return;
      }
      if (r.ok) {
        setRecentDocs(await r.json());
        setBackendDown(false);
        setBackendError('');
      } else {
        let message = `Request failed with status ${r.status}`;
        try {
          const body = await r.json();
          message = body.error || message;
        } catch { }
        setBackendDown(true);
        setBackendError(message);
      }
    } catch (e) {
      console.error('Failed to load docs:', e);
      setBackendDown(true);
      setBackendError('Please ensure python server.py is running on port 5055.');
    }
  }, [router]);

  useEffect(() => {
    async function loadSchemas() {
      const loaded: Record<string, Schema> = {};
      for (const entry of SCHEMA_REGISTRY) {
        try {
          const r = await fetch(entry.file);
          if (r.ok) loaded[entry.id] = await r.json();
        } catch (e) { console.error('Schema load fail:', entry.file, e); }
      }
      setSchemas(loaded);
    }
    loadSchemas();
    const timer = window.setTimeout(() => {
      void fetchRecentDocs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRecentDocs]);

  // ── Notifications ─────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800);
  }, []);

  const showLoading = (text: string, sub: string) => {
    setLoadingText(text); setLoadingSub(sub); setLoading(true);
  };
  const hideLoading = () => setLoading(false);

  // ── Navigation Logic ──────────────────────
  const goHome = useCallback(() => {
    setSidebarOpen(false);
    setPage('landing');
    setActiveSchema(null);
    setCurrentStep(0);
    setStepData({});
    setIrsSelections({});
    setAiMode(false);
    setAiEmailText('');
    setEditingDocId(null);
    fetchRecentDocs();
    setModal('none');
  }, [fetchRecentDocs]);

  const handleBack = useCallback(() => {
    // If we came to form/pdf from my-documents, go back to my-documents
    if ((page === 'form' || page === 'pdf') && previousPageRef.current === 'my-documents') {
      setPage('my-documents');
      setActiveSchema(null);
      setCurrentStep(0);
      setStepData({});
      setIrsSelections({});
      setAiMode(false);
      setAiEmailText('');
      setEditingDocId(null);
      setModal('none');
    } else {
      // From any other source, go home
      goHome();
    }
  }, [page, goHome]);

  // ── Core Operations ───────────────────────
  const assembleJSON = useCallback((): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    if (activeSchema?.id === 'irs') Object.assign(data, irsSelections);
    if (activeSchema?.id === 'equity_trs' && irsSelections.model_type) data.model_type = irsSelections.model_type;
    for (const [k, v] of Object.entries(stepData)) {
      if (!k.startsWith('__rep_')) data[k] = v;
    }
    for (const [k, v] of Object.entries(stepData)) {
      if (!k.startsWith('__rep_')) continue;
      const realKey = k.replace('__rep_', '');
      if (Array.isArray(v) && v.length > 0) {
        if (typeof v[0] === 'string') {
          data[realKey] = (v as string[]).filter(s => s.trim());
        } else {
          data[realKey] = (v as Array<{ title: string; description: string }>)
            .filter(p => p.title.trim() || p.description.trim());
        }
      } else { data[realKey] = []; }
    }
    return data;
  }, [activeSchema, stepData, irsSelections]);

  const saveDocument = useCallback(async (data: Record<string, unknown>, isDraft: boolean = true, pdfFileId: string = ''): Promise<string | null> => {
    if (!activeSchema) return null;
    let summary = '';
    if (activeSchema.id === 'fx_ndf') summary = `${data.reference_currency || '?'}/${data.settlement_currency || '?'} — ${data.notional_amount || ''}`;
    else if (activeSchema.id === 'cds') summary = `${data.reference_entity || '?'} — ${data.notional_amount || ''} @ ${data.fixed_rate || '?'}bps`;
    else if (activeSchema.id === 'equity_trs') summary = `Model ${data.model_type || '?'} — ${data.party_a_name || ''} vs ${data.party_b_name || ''}`;
    else summary = `Exhibit ${(data.exhibit as string) || '?'} — ${data.party_a_name || ''} vs ${data.party_b_name || ''}`;

    try {
      const payload: Record<string, unknown> = {
        doc_type: activeSchema.id,
        name: activeSchema.name,
        icon: activeSchema.icon || '📄',
        summary,
        ai_created: aiMode,
        data,
        is_draft: isDraft
      };
      if (pdfFileId) { payload.pdf_file_id = pdfFileId; }
      if (aiMode && aiEmailText) { payload.source_email = aiEmailText; }

      if (editingDocId) {
        const r = await fetch(`${API}/api/documents/${editingDocId}`, {
          method: 'PUT',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        if (r.ok) { 
          showToast(isDraft ? '📝 Draft updated' : '✅ Document finalized'); 
          fetchRecentDocs(); 
          return editingDocId; 
        }
      } else {
        const r = await fetch(`${API}/api/documents`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        if (r.ok) {
          const saved = await r.json();
          setEditingDocId(saved._id);
          showToast(isDraft ? '📝 Draft saved' : '✅ Document saved');
          fetchRecentDocs();
          return saved._id;
        }
      }
    } catch { showToast('❌ Save failed'); }
    return null;
  }, [activeSchema, aiMode, editingDocId, showToast, fetchRecentDocs]);

  const checkExistingValidationReport = useCallback(async (docId: string) => {
    try {
      const r = await fetch(`${API}/api/documents/${docId}/validation`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        if (data.has_report) {
          setValidationReport(data.validation_report);
          setHasExistingValidationReport(true);
          return;
        }
      }
      setHasExistingValidationReport(false);
    } catch {
      setHasExistingValidationReport(false);
    }
  }, []);

  const generatePDF = useCallback(async () => {
    if (!activeSchema) return;
    const data = assembleJSON();
    const endpoint = activeSchema.id === 'fx_ndf' ? '/generate/fx_ndf'
      : activeSchema.id === 'cds' ? '/generate/cds'
      : activeSchema.id === 'equity_trs' ? '/generate/equity_trs'
      : '/generate/irs';
    showLoading('Compiling PDF...', 'Running LaTeX pipeline');
    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(data),
      });
      if (!response.ok) {
        let errMsg = 'PDF generation failed';
        try { const d = await response.json(); errMsg = d.error || errMsg; } catch { }
        hideLoading(); showToast('❌ ' + errMsg); return;
      }
      const blob = await response.blob();
      const contentDisp = response.headers.get('Content-Disposition') || '';
      let filename = 'confirmation.pdf';
      const match = contentDisp.match(/filename=([^;]+)/);
      if (match) filename = match[1].replace(/"/g, '').trim();
      const fileId = response.headers.get('X-TradeDoc-File-Id') || '';
      setCurrentPdfFileId(fileId);
      setCurrentGcsObjectPath('');
      if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setCurrentPdfBlobUrl(url);
      setCurrentPdfFilename(filename);
      
      // Finalize the document when PDF is generated (pass pdf_file_id)
      await saveDocument(data, false, fileId);
      
      hideLoading();
      setShowValidateOnPdf(aiMode);
      setPage('pdf');
      // Check for existing validation report on this document
      if (editingDocId && aiMode) {
        checkExistingValidationReport(editingDocId);
      } else {
        setHasExistingValidationReport(false);
      }
      showToast('✅ PDF ready — review below');
    } catch {
      hideLoading(); showToast('❌ Server error');
    }
  }, [activeSchema, assembleJSON, currentPdfBlobUrl, aiMode, saveDocument, showToast, editingDocId, checkExistingValidationReport]);

  const downloadWord = useCallback(async () => {
    if (!currentPdfFilename) { showToast('❌ No PDF to convert'); return; }
    showLoading('Converting to Word...', 'Generating .docx from PDF');
    try {
      const response = await fetch(`${API}/convert/word`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pdf_filename: currentPdfFilename, pdf_file_id: currentPdfFileId }),
      });
      if (!response.ok) {
        let errMsg = 'Word conversion failed';
        try { const d = await response.json(); errMsg = d.error || errMsg; } catch { }
        hideLoading(); showToast('❌ ' + errMsg); return;
      }
      const blob = await response.blob();
      const wordFilename = currentPdfFilename.replace('.pdf', '.docx');
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = wordFilename; a.click();
      URL.revokeObjectURL(a.href);
      hideLoading();
      showToast('⬇ Downloaded: ' + wordFilename);
    } catch {
      hideLoading(); showToast('❌ Server error');
    }
  }, [currentPdfFilename, currentPdfFileId, showToast]);

  const requestValidation = useCallback(async () => {
    if (!aiEmailText) { showToast('⚠️ Validation requires an email source'); return; }
    if (!currentPdfFilename) { showToast('⚠️ Generate PDF first'); return; }
    showLoading('Running validation...', 'Comparing PDF against email with AI');
    try {
      const preferredModel = localStorage.getItem('preferredModel') || 'gemini-flash-latest';
      const body: Record<string, string> = {
        email_text: aiEmailText,
        pdf_filename: currentPdfFilename,
        pdf_file_id: currentPdfFileId,
        model: preferredModel,
        doc_id: editingDocId || ''
      };
      // For stored documents from GCS (e.g., from Validity Pending), pass the GCS path
      if (currentGcsObjectPath) {
        body.gcs_object_path = currentGcsObjectPath;
      }
      const response = await fetch(`${API}/validate`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let errMsg = 'Validation failed';
        try { const d = await response.json(); errMsg = d.error || errMsg; } catch { }
        hideLoading(); showToast('❌ ' + errMsg); return;
      }
      const result = await response.json();
      hideLoading();
      setValidationReport(result.validation_report || 'No report generated');
      setHasExistingValidationReport(true);
      setValidationPanelOpen(true);
      setShowValidateOnPdf(false); // successfully validated — hide the button
      showToast('✅ Validation complete');
    } catch {
      hideLoading(); showToast('❌ Server error');
    }
  }, [aiEmailText, currentPdfFilename, currentPdfFileId, currentGcsObjectPath, editingDocId, showToast]);

  const submitAIExtract = useCallback(async (modelChoice?: string) => {
    if (!aiEmailText.trim()) { showToast('Please paste text first'); return; }
    showLoading('Analyzing email...', 'Classifying document type');
    try {
      const preferredModel = modelChoice || localStorage.getItem('preferredModel') || 'gemini-flash-latest';
      const response = await fetch(`${API}/ai/extract`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
          email_text: aiEmailText,
          model: preferredModel
        }),
      });
      if (!response.ok) {
        let errMsg = 'AI extraction failed';
        try { const d = await response.json(); errMsg = d.error || errMsg; } catch { }
        hideLoading(); showToast('❌ ' + errMsg); return;
      }
      const result = await response.json();
      hideLoading();
      const docType: string = result.doc_type;
      const extracted: Record<string, unknown> = result.extracted_json || {};
      const schema = schemas[docType];
      if (!schema) { showToast('❌ Unknown document type: ' + docType); return; }
      setActiveSchema(schema);
      setAiMode(true);
      const newStepData: Record<string, unknown> = {};
      const newIrsSelections: Record<string, string> = {};
      for (const [key, value] of Object.entries(extracted)) {
        if ((docType === 'irs' || docType === 'equity_trs') && (key === 'exhibit' || key === 'termination_type' || key === 'model_type')) {
          newIrsSelections[key] = value as string;
        } else if (Array.isArray(value)) {
          newStepData['__rep_' + key] = value;
        } else { newStepData[key] = value; }
      }
      setStepData(newStepData);
      setIrsSelections(newIrsSelections);
      setCurrentStep(0);
      setPage('form');
      showToast(`✅ AI extracted ${Object.keys(extracted).length} fields`);
    } catch {
      hideLoading(); showToast('❌ Server error');
    }
  }, [aiEmailText, schemas, showToast]);

  const selectType = useCallback((id: string) => {
    const schema = schemas[id];
    if (!schema) return;
    setActiveSchema(schema);
    setStepData({});
    setIrsSelections({});
    setAiMode(false);
    setAiEmailText('');
    setCurrentStep(0);
    setEditingDocId(null);
    setPage('form');
  }, [schemas]);

  const handleDeleteDocument = useCallback(async (docId: string) => {
    try {
      const response = await fetch(`${API}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) {
        showToast('❌ Failed to delete document');
        return;
      }
      setRecentDocs(prev => prev.filter(d => d._id !== docId));
      showToast('🗑️ Document deleted successfully');
    } catch {
      showToast('❌ Error deleting document');
    }
  }, [showToast, setRecentDocs]);

  // Track that we entered form from my-documents
  const navigateToMyDocuments = useCallback(() => {
    previousPageRef.current = 'my-documents';
    setPage('my-documents');
  }, []);

  const openDocInForm = useCallback(async (doc: RecentDoc) => {
    // Track source page before navigating to form so back button returns correctly
    // Use ref (not state) to avoid stale closure — 'page' is not a dep of this callback
    if (currentPageRef.current === 'my-documents') {
      previousPageRef.current = 'my-documents';
    } else {
      previousPageRef.current = null; // coming from dashboard/landing → back goes home
    }
    const schema = schemas[doc.doc_type];
    if (!schema) { showToast('❌ Unknown document type'); return; }
    showLoading('Loading document...', 'Fetching from database');
    try {
      const r = await fetch(`${API}/api/documents/${doc._id}`, { headers: authHeaders() });
      if (!r.ok) { hideLoading(); showToast('❌ Failed to load'); return; }
      const full = await r.json();
      const data: Record<string, unknown> = full.data || {};
      setActiveSchema(schema);
      setAiMode(full.ai_created || false);
      setAiEmailText(full.source_email || '');
      setEditingDocId(full._id);
      const newStepData: Record<string, unknown> = {};
      const newIrsSelections: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if ((doc.doc_type === 'irs' || doc.doc_type === 'equity_trs') && (key === 'exhibit' || key === 'termination_type' || key === 'model_type')) {
          newIrsSelections[key] = value as string;
        } else if (Array.isArray(value)) {
          newStepData['__rep_' + key] = value;
        } else { newStepData[key] = value; }
      }
      setStepData(newStepData);
      setIrsSelections(newIrsSelections);
      setCurrentStep(0);
      hideLoading();
      setPage('form');
      showToast('📂 Document loaded');
    } catch {
      hideLoading(); showToast('❌ Failed to load');
    }
  }, [schemas, showToast]);

  // View a finalized document's stored PDF
  const viewPdfFromDoc = useCallback(async (doc: RecentDoc) => {
    // Track source page before navigating to PDF so back button returns correctly
    if (currentPageRef.current === 'my-documents') {
      previousPageRef.current = 'my-documents';
    } else {
      previousPageRef.current = null; // coming from dashboard/landing → back goes home
    }
    showLoading('Opening PDF...', 'Loading document');
    try {
      const r = await fetch(`${API}/api/documents/${doc._id}/pdf`, { headers: authHeaders() });
      if (!r.ok) {
        let errMsg = 'PDF not found';
        try { const d = await r.json(); errMsg = d.error || errMsg; } catch {}
        hideLoading(); showToast('❌ ' + errMsg); return;
      }

      const contentType = r.headers.get('Content-Type') || '';

      // GCS signed URL response — server returns JSON with a redirect URL
      if (contentType.includes('application/json')) {
        const data = await r.json();
        const signedUrl: string | undefined = data.signed_url;
        const filename: string = data.filename || 'confirmation.pdf';

        if (!signedUrl) {
          hideLoading(); showToast('❌ No signed URL returned'); return;
        }

        // Fetch the actual PDF bytes from the signed GCS URL
        const pdfResp = await fetch(signedUrl);
        if (!pdfResp.ok) {
          hideLoading(); showToast('❌ Failed to fetch PDF from cloud storage'); return;
        }
        const pdfBlob = await pdfResp.blob();

        if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
        const url = URL.createObjectURL(pdfBlob);
        setCurrentPdfBlobUrl(url);
        setCurrentPdfFilename(filename);
        setCurrentPdfFileId('');
        setEditingDocId(doc._id);
        setAiMode(doc.ai_created || false);
        setAiEmailText(doc.source_email || '');
        setCurrentGcsObjectPath(doc.gcs_object_path || '');
        hideLoading();
        setShowValidateOnPdf(doc.ai_created && doc.validation_status === 'pending');
        // Check if a validation report already exists for this document
        checkExistingValidationReport(doc._id);
        setPage('pdf');
        showToast('✅ PDF loaded from cloud');
        return;
      }

      // Direct PDF blob response (temp disk or GCS download bytes)
      const blob = await r.blob();
      const contentDisp = r.headers.get('Content-Disposition') || '';
      let fname = 'confirmation.pdf';
      const match = contentDisp.match(/filename=([^;]+)/);
      if (match) fname = match[1].replace(/"/g, '').trim();
      setCurrentPdfFileId(r.headers.get('X-TradeDoc-File-Id') || '');
      if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setCurrentPdfBlobUrl(url);
      setCurrentPdfFilename(fname);
      setEditingDocId(doc._id);
      setAiMode(doc.ai_created || false);
      setAiEmailText(doc.source_email || '');
      setCurrentGcsObjectPath(doc.gcs_object_path || '');
      hideLoading();
      setShowValidateOnPdf(doc.ai_created && doc.validation_status === 'pending');
      // Check if a validation report already exists for this document
      checkExistingValidationReport(doc._id);
      setPage('pdf');
      showToast('✅ PDF loaded');
    } catch {
      hideLoading(); showToast('❌ Server error');
    }
  }, [currentPdfBlobUrl, showToast]);

  const getSteps = useCallback((): Array<{ id: string; title: string }> => {
    if (!activeSchema) return [];
    const s: Array<{ id: string; title: string }> = [];
    if (activeSchema.steps) activeSchema.steps.forEach((st, i) => s.push({ id: `wizard_${i}`, title: st.title }));
    const modelKey = activeSchema.id === 'irs' ? irsSelections.exhibit : irsSelections.model_type;
    const termType = irsSelections.termination_type;
    if (activeSchema.sections && !Array.isArray(activeSchema.sections)) {
      for (const [key, val] of Object.entries(activeSchema.sections)) {
        const section = val as SchemaSection;
        if (activeSchema.id === 'irs') {
          if (section.show_for_exhibits && !section.show_for_exhibits.includes(modelKey || '')) continue;
          if (section.show_for_termination && section.show_for_termination !== termType) continue;
          if (!section.always_show && !section.show_for_exhibits && !section.show_for_termination) continue;
        } else if (activeSchema.id === 'equity_trs') {
          if (section.show_for_models && modelKey && !section.show_for_models.includes(modelKey)) continue;
        }
        s.push({ id: key, title: section.title.substring(0, 30) });
      }
    } else if (Array.isArray(activeSchema.sections)) {
      activeSchema.sections.forEach(sec => s.push({ id: sec.id || '', title: sec.title || '' }));
    }
    return s;
  }, [activeSchema, irsSelections]);

  const steps = getSteps();

  // ── Auto-scroll stepper to active tab ─────────
  useEffect(() => {
    if (!stepperRef.current) return;
    const container = stepperRef.current;
    const activeBtn = container.querySelector(`button[data-step-index="${currentStep}"]`) as HTMLElement | null;
    if (activeBtn) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + btnRect.left - containerRect.left - containerRect.width / 2 + btnRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) setCurrentStep(c => c + 1);
    else generatePDF();
  }, [currentStep, steps.length, generatePDF]);

  // ── Render Helpers ────────────────────────
  const renderFormContent = () => {
    if (!activeSchema) return null;
    
    // 1. Handle Wizard Steps
    if (activeSchema.steps && activeSchema.steps[currentStep]) {
      const step = activeSchema.steps[currentStep];
      
      if (step.type === 'fields' && step.fields) {
        // Resolve field keys to actual field definitions from sections
        const allFields: SchemaField[] = [];
        if (activeSchema.sections) {
          if (Array.isArray(activeSchema.sections)) {
            activeSchema.sections.forEach(s => allFields.push(...(s.fields || [])));
          } else {
            Object.values(activeSchema.sections).forEach(s => {
              const sec = s as SchemaSection;
              allFields.push(...(sec.fields || []));
              if (sec.subsections) {
                sec.subsections.forEach(ss => allFields.push(...(ss.fields || [])));
              }
            });
          }
        }
        
        const resolvedFields = (step.fields as string[]).map(key => 
          allFields.find(f => f.key === key)
        ).filter(Boolean) as SchemaField[];
        
        return <FieldsStep title={step.title} fields={resolvedFields} stepData={stepData} onUpdate={(k, v) => setStepData(p => ({ ...p, [k]: v }))} aiMode={aiMode} allData={{ ...irsSelections, ...stepData }} onFieldFocus={setActiveFieldKey} activeFieldKey={activeFieldKey} />;
      }
      
      return <SelectionStep stepDef={step} selections={irsSelections} onSelect={(k, v) => setIrsSelections(p => ({ ...p, [k]: v }))} />;
    }

    // 2. Handle Sections (after wizard steps are complete)
    const wizardCount = activeSchema.steps?.length || 0;
    const sectionIdx = currentStep - wizardCount;
    
    if (!Array.isArray(activeSchema.sections)) {
      const sectionEntries = Object.entries(activeSchema.sections || {}).filter(([, val]) => {
        const section = val as SchemaSection;
        if (activeSchema.id === 'irs') {
          if (section.show_for_exhibits && !section.show_for_exhibits.includes(irsSelections.exhibit || '')) return false;
          if (section.show_for_termination && section.show_for_termination !== irsSelections.termination_type) return false;
          return !!(section.always_show || section.show_for_exhibits || section.show_for_termination);
        } else if (activeSchema.id === 'equity_trs') {
          if (section.show_for_models && irsSelections.model_type && !section.show_for_models.includes(irsSelections.model_type)) return false;
        }
        if (section.show_when) {
          const srcVal = { ...irsSelections, ...stepData }[section.show_when.field];
          const targetVal = section.show_when.value;
          const operator = section.show_when.operator || 'equal';
          if (operator === 'not_equal') {
            if (srcVal === targetVal) return false;
          } else {
            if (srcVal !== targetVal) return false;
          }
        }
        return true;
      });
      const section = sectionEntries[sectionIdx]?.[1] as SchemaSection;
      return section ? <SectionStep section={section} stepData={stepData} onUpdate={(k, v) => setStepData(p => ({ ...p, [k]: v }))} aiMode={aiMode} allData={{ ...irsSelections, ...stepData }} onFieldFocus={setActiveFieldKey} activeFieldKey={activeFieldKey} /> : null;
    }
    
    const sec = activeSchema.sections[currentStep];
    return sec ? <FieldsStep title={sec.title} fields={sec.fields || []} stepData={stepData} onUpdate={(k, v) => setStepData(p => ({ ...p, [k]: v }))} aiMode={aiMode} allData={{ ...irsSelections, ...stepData }} onFieldFocus={setActiveFieldKey} activeFieldKey={activeFieldKey} /> : null;
  };

  // ── ChatSidebar helpers ─────────────────────
  const isManualForm = page === 'form' && !aiMode && !!activeSchema;

  // Compute active field label for sidebar display
  const getActiveFieldLabel = (): string => {
    if (!activeFieldKey || !activeSchema) return '';
    const allFields = gatherAllFields();
    const field = allFields.find(f => f.key === activeFieldKey);
    return field ? field.label : activeFieldKey.replace('__rep_', '');
  };

  // Gather all fields from the current schema
  const gatherAllFields = useCallback((): SchemaField[] => {
    if (!activeSchema?.sections) return [];
    const all: SchemaField[] = [];
    if (Array.isArray(activeSchema.sections)) {
      activeSchema.sections.forEach(s => all.push(...(s.fields || [])));
    } else {
      Object.values(activeSchema.sections).forEach(s => {
        const sec = s as SchemaSection;
        all.push(...(sec.fields || []));
        if (sec.subsections) sec.subsections.forEach(ss => all.push(...(ss.fields || [])));
      });
    }
    return all;
  }, [activeSchema]);

  const allFormFields = gatherAllFields();
  const totalFields = allFormFields.length;
  const filledFields = allFormFields.filter(f => {
    const val = stepData[f.key];
    return val !== undefined && val !== null && String(val).trim() !== '';
  }).length;
  const activeFieldLabel = getActiveFieldLabel();

  const handleLogout = () => { clearSession(); router.push('/'); };

  return (
    <div className="flex h-[100dvh] overflow-hidden selection:bg-indigo-100" style={{ background: '#f8f9fc', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .font-display { font-family: var(--font-dm-serif-display), 'DM Serif Display', Georgia, serif; }
        .font-body { font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif; }

        @property --glass-angle-1 { syntax: "<angle>"; inherits: true; initial-value: -75deg; }
        @property --glass-angle-2 { syntax: "<angle>"; inherits: true; initial-value: -45deg; }
        
        .glass-btn-wrap {
          --anim--hover-time: 400ms;
          --anim--hover-ease: cubic-bezier(0.25, 1, 0.5, 1);
          position: relative;
          z-index: 2;
          border-radius: 999vw;
          background: transparent;
          pointer-events: none;
          transition: transform var(--anim--hover-time) var(--anim--hover-ease);
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        .glass-btn-shadow {
          --shadow-cuttoff-fix: 2em;
          position: absolute;
          width: calc(100% + var(--shadow-cuttoff-fix));
          height: calc(100% + var(--shadow-cuttoff-fix));
          top: calc(0% - var(--shadow-cuttoff-fix) / 2);
          left: calc(0% - var(--shadow-cuttoff-fix) / 2);
          filter: blur(clamp(2px, 0.125em, 12px));
          -webkit-filter: blur(clamp(2px, 0.125em, 12px));
          overflow: visible;
          pointer-events: none;
        }
        
        .glass-btn-shadow::after {
          content: "";
          position: absolute;
          z-index: 0;
          inset: 0;
          border-radius: 999vw;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
          width: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          height: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          top: calc(var(--shadow-cuttoff-fix) - 0.5em);
          left: calc(var(--shadow-cuttoff-fix) - 0.875em);
          padding: 0.125em;
          box-sizing: border-box;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          transition: top var(--anim--hover-time) var(--anim--hover-ease), opacity var(--anim--hover-time) var(--anim--hover-ease);
          opacity: 1;
        }
        
        .glass-btn {
          --border-width: clamp(1px, 0.0625em, 4px);
          all: unset;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          pointer-events: auto;
          z-index: 3;
          background: linear-gradient(-75deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
          border-radius: 999vw;
          box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05), inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5), 0 0.25em 0.125em -0.125em rgba(0, 0, 0, 0.2), 0 0 0.1em 0.25em inset rgba(255, 255, 255, 0.2), 0 0 0 0 rgba(255, 255, 255, 1);
          backdrop-filter: blur(clamp(1px, 0.125em, 4px));
          -webkit-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
          transition: transform var(--anim--hover-time) var(--anim--hover-ease),
                      box-shadow var(--anim--hover-time) var(--anim--hover-ease),
                      backdrop-filter var(--anim--hover-time) var(--anim--hover-ease);
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform, box-shadow, backdrop-filter;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        .glass-btn:hover {
          transform: scale(0.975);
          backdrop-filter: blur(0.01em);
          -webkit-backdrop-filter: blur(0.01em);
          box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05), inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5), 0 0.15em 0.05em -0.1em rgba(0, 0, 0, 0.25), 0 0 0.05em 0.1em inset rgba(255, 255, 255, 0.5), 0 0 0 0 rgba(255, 255, 255, 1);
        }
        
        .glass-btn span {
          position: relative;
          display: block;
          user-select: none;
          font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
          letter-spacing: -0.05em;
          font-weight: 500;
          font-size: 1em;
          color: rgba(50, 50, 50, 1);
          text-shadow: 0em 0.25em 0.05em rgba(0, 0, 0, 0.1);
          transition: text-shadow var(--anim--hover-time) var(--anim--hover-ease);
          padding-inline: 1.5em;
          padding-block: 0.875em;
        }
        
        .glass-btn:hover span {
          text-shadow: 0.025em 0.025em 0.025em rgba(0, 0, 0, 0.12);
        }
        
        .glass-btn span::after {
          content: "";
          display: block;
          position: absolute;
          z-index: 1;
          width: calc(100% - var(--border-width));
          height: calc(100% - var(--border-width));
          top: calc(0% + var(--border-width) / 2);
          left: calc(0% + var(--border-width) / 2);
          box-sizing: border-box;
          border-radius: 999vw;
          overflow: clip;
          background: linear-gradient(var(--glass-angle-2), rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.5) 40% 50%, rgba(255, 255, 255, 0) 55%);
          z-index: 3;
          mix-blend-mode: screen;
          pointer-events: none;
          background-size: 200% 200%;
          background-position: 0% 50%;
          background-repeat: no-repeat;
          transition: background-position calc(var(--anim--hover-time) * 1.25) var(--anim--hover-ease), --glass-angle-2 calc(var(--anim--hover-time) * 1.25) var(--anim--hover-ease);
        }
        
        .glass-btn:hover span::after { background-position: 25% 50%; }
        .glass-btn:active span::after { background-position: 50% 15%; --glass-angle-2: -15deg; }
        
        .glass-btn::after {
          content: "";
          position: absolute;
          z-index: 1;
          inset: 0;
          border-radius: 999vw;
          width: calc(100% + var(--border-width));
          height: calc(100% + var(--border-width));
          top: calc(0% - var(--border-width) / 2);
          left: calc(0% - var(--border-width) / 2);
          padding: var(--border-width);
          box-sizing: border-box;
          background: conic-gradient(from var(--glass-angle-1) at 50% 50%, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0) 5% 40%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0) 60% 95%, rgba(0, 0, 0, 0.5)), linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5));
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          transition: all var(--anim--hover-time) var(--anim--hover-ease), --glass-angle-1 500ms ease;
          box-shadow: inset 0 0 0 calc(var(--border-width) / 2) rgba(255, 255, 255, 0.5);
        }
        
        .glass-btn:hover::after { --glass-angle-1: -125deg; }
        .glass-btn:active::after { --glass-angle-1: -75deg; }
        
        .glass-btn-wrap:has(.glass-btn:hover) .glass-btn-shadow {
          filter: blur(clamp(2px, 0.0625em, 6px));
          -webkit-filter: blur(clamp(2px, 0.0625em, 6px));
          transition: filter var(--anim--hover-time) var(--anim--hover-ease);
        }
        .glass-btn-wrap:has(.glass-btn:hover) .glass-btn-shadow::after {
          top: calc(var(--shadow-cuttoff-fix) - 0.875em);
          opacity: 1;
        }
        
        .glass-btn-wrap:has(.glass-btn:active) { transform: rotate3d(1, 0, 0, 25deg); }
        .glass-btn-wrap:has(.glass-btn:active) .glass-btn {
          box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05), inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5), 0 0.125em 0.125em -0.125em rgba(0, 0, 0, 0.2), 0 0 0.1em 0.25em inset rgba(255, 255, 255, 0.2), 0 0.225em 0.05em 0 rgba(0, 0, 0, 0.05), 0 0.25em 0 0 rgba(255, 255, 255, 0.75), inset 0 0.25em 0.05em 0 rgba(0, 0, 0, 0.15);
        }
        .glass-btn-wrap:has(.glass-btn:active) .glass-btn-shadow {
          filter: blur(clamp(2px, 0.125em, 12px));
          -webkit-filter: blur(clamp(2px, 0.125em, 12px));
        }
        .glass-btn-wrap:has(.glass-btn:active) .glass-btn-shadow::after {
          top: calc(var(--shadow-cuttoff-fix) - 0.5em);
          opacity: 0.75;
        }
        .glass-btn-wrap:has(.glass-btn:active) span {
          text-shadow: 0.025em 0.25em 0.05em rgba(0, 0, 0, 0.12);
        }
      ` }} />
      <DashboardSidebar
        userName={userName}
        activePage={page}
        onGoHome={goHome}
        onLogout={handleLogout}
        onSetPage={(nextPage) => { setPage(nextPage); setSidebarOpen(false); }}
        isMobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        hidden={isManualForm || page === 'workflow-builder'}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Mobile-only header — shows hamburger icon + heading on all pages for sidebar access */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', borderBottom: '1px solid rgba(226,232,240,0.55)', boxShadow: '0 1px 16px rgba(0,0,0,0.04)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 shadow-sm shrink-0"
            aria-label="Open navigation"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="text-base font-bold text-slate-800 font-inter tracking-tight truncate">
            {page === 'landing' ? 'Dashboard' :
             page === 'my-documents' ? 'My Documents' :
             page === 'ai' ? 'AI Extract' :
             page === 'analytics' ? 'Analytics' :
             page === 'settings' ? 'Settings' :
             activeSchema?.name || 'Document Editor'}
          </h1>
        </div>

        {/* Desktop header — only for form/pdf pages with critical action buttons */}
        {(page === 'form' || page === 'pdf') && (
          <div className="hidden lg:flex sticky top-0 z-20 items-center justify-between px-6 py-3" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', borderBottom: '1px solid rgba(226,232,240,0.55)', boxShadow: '0 1px 16px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-sm shrink-0"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                <span className="text-sm font-bold font-inter">Back</span>
              </button>
              <h1 className="text-lg font-bold text-slate-800 font-inter tracking-tight truncate">
                {activeSchema?.name || 'Document Editor'}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {page === 'form' && (
                <>
                  <button
                    onClick={() => saveDocument(assembleJSON(), true)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold font-inter hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={generatePDF}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold font-inter hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Generate PDF
                  </button>
                </>
              )}
              {page === 'pdf' && (
                <></>
              )}
            </div>
          </div>
        )}

        <div className={page === 'workflow-builder' ? "flex-1 overflow-hidden flex flex-col" : "flex-1 overflow-y-auto scroll-smooth px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8"}>
          {backendDown && (
            <div className="max-w-4xl mx-auto mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-4 text-red-700 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div className="flex-1">
                <p style={{ fontWeight: 700, fontSize: '14px' }}>{backendError.toLowerCase().includes('database') ? 'Database Connection Unavailable' : 'Backend Server Unreachable'}</p>
                <p style={{ fontSize: '13px', opacity: 0.8 }}>{backendError || 'Please ensure python server.py is running on port 5055.'}</p>
              </div>
              <button onClick={() => fetchRecentDocs()} className="px-4 py-2 bg-white border border-red-200 rounded-xl font-bold text-xs hover:bg-red-50 transition-colors">Retry</button>
            </div>
          )}
          {page === 'landing' && (
            <>
              {/* Welcome Header — kept narrow for readability */}
              <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center pt-10 sm:pt-14 md:pt-20 pb-6 sm:pb-8 animate-fade-in px-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[32px] bg-white border border-border-secondary flex items-center justify-center mb-6 sm:mb-8 shadow-sm p-3 sm:p-4">
                  <img src="/logo.svg" alt="TradeDoc AI Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-secondary font-inter text-center mb-3 sm:mb-4">
                  Welcome to your Workspace
                </h1>
                <p className="text-text-tertiary text-center max-w-lg mb-8 sm:mb-12 leading-relaxed font-medium text-sm sm:text-base px-2">
                  Create your trade documents manually or use our AI-powered extraction to generate them from raw text and emails.
                </p>
                <div className="flex flex-row gap-3 sm:gap-6 md:gap-8 justify-center items-center w-full px-4 flex-wrap">
                  <button
                    className="glass-btn-wrap text-sm sm:text-[15px] md:text-lg lg:text-xl cursor-pointer w-auto max-w-[280px]"
                    onClick={() => setModal('new-doc')}
                  >
                    <div className="glass-btn px-8 py-3 sm:px-10 sm:py-4 md:px-10 md:py-4 lg:px-14 lg:py-6" style={{ pointerEvents: 'auto' }}>
                      <span style={{ color: '#000', fontWeight: 600, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif' }}>
                        New Document
                      </span>
                    </div>
                    <div className="glass-btn-shadow" />
                  </button>

                  <button
                    className="glass-btn-wrap text-sm sm:text-[15px] md:text-lg lg:text-xl cursor-pointer w-auto max-w-[280px]"
                    onClick={() => setPage('analytics')}
                  >
                    <div className="glass-btn px-8 py-3 sm:px-10 sm:py-4 md:px-10 md:py-4 lg:px-14 lg:py-6" style={{ pointerEvents: 'auto' }}>
                      <span style={{ color: '#000', fontWeight: 600, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif' }}>
                        View Analytics
                      </span>
                    </div>
                    <div className="glass-btn-shadow" />
                  </button>
                </div>
              </div>

              {/* All Documents Section — wider container */}
              <section className="w-full max-w-6xl mx-auto mt-4 sm:mt-6 px-4 pb-10 sm:pb-14 md:pb-20">
                <div className="flex flex-row justify-between items-center w-full mb-5">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-secondary font-inter">
                    All Documents
                  </h2>
                </div>
                <RecentDocuments
                  documents={recentDocs}
                  onLoad={openDocInForm}
                  onView={viewPdfFromDoc}
                  onCreateNew={() => setModal('new-doc')}
                />
              </section>
            </>
          )}

          {page === 'analytics' && (
            <>
              {/* Desktop-only heading (mobile heading lives in the top nav strip) */}
              <h1 className="hidden lg:block text-xl sm:text-2xl font-bold text-slate-900 font-inter tracking-tight mb-2 lg:mb-6">
                Analytics
              </h1>
              <div className="w-full max-w-[1440px] mx-auto grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-8 animate-fade-in px-1 sm:px-0">
              {/* Blue card: full width on mobile, 1 col on desktop (with teal stacked below) */}
              <div className="col-span-2 lg:col-span-1">
                <DocumentOverviewCards documents={recentDocs} onLoad={openDocInForm} hideTimeSavedMobile />
              </div>
              {/* Teal Time Saved: only on mobile, sits next to MoneySavedCard */}
              <div className="lg:hidden">
                <TimeSavedCard documents={recentDocs} />
              </div>
              <MoneySavedCard documents={recentDocs} />
              <ActivityChart documents={recentDocs} />
              <DocumentTypeBreakdown documents={recentDocs} />
              <RecentActivitySection documents={recentDocs} onLoad={openDocInForm} />
              <ExtractionEfficiencyChart documents={recentDocs} />
            </div>
            </>
          )}

          {page === 'settings' && (
            <SettingsUI 
              key={settingsSub}
              initialTab={settingsSub}
              onTabChange={(tab) => setSettingsSub(tab)} 
              onShowToast={showToast}
            />
          )}

          {page === 'my-documents' && (
            <MyDocumentsUI
              documents={recentDocs}
              onEdit={openDocInForm}
              onDelete={handleDeleteDocument}
              onFetchPdfBlob={async (docId: string) => {
                try {
                  const r = await fetch(`${API}/api/documents/${docId}/pdf`, { headers: authHeaders() });
                  if (!r.ok) return null;
                  const contentType = r.headers.get('Content-Type') || '';
                  // GCS signed URL response
                  if (contentType.includes('application/json')) {
                    const data = await r.json();
                    const signedUrl: string | undefined = data.signed_url;
                    const filename: string = data.filename || 'confirmation.pdf';
                    if (!signedUrl) return null;
                    const pdfResp = await fetch(signedUrl);
                    if (!pdfResp.ok) return null;
                    const blob = await pdfResp.blob();
                    return { url: URL.createObjectURL(blob), filename };
                  }
                  // Direct PDF blob
                  const blob = await r.blob();
                  const contentDisp = r.headers.get('Content-Disposition') || '';
                  let fname = 'confirmation.pdf';
                  const match = contentDisp.match(/filename=([^;]+)/);
                  if (match) fname = match[1].replace(/"/g, '').trim();
                  return { url: URL.createObjectURL(blob), filename: fname };
                } catch {
                  return null;
                }
              }}
              onFormView={(doc) => {
                openDocInForm(doc);
              }}
              onViewPdfPage={(doc) => viewPdfFromDoc(doc)}
            />
          )}


          {page === 'ai' && <AIExtractPanel text={aiEmailText} onChange={setAiEmailText} onExtract={submitAIExtract} onCancel={goHome} />}

          {page === 'workflow-builder' && (
            <WorkflowBuilderPanel
              recentDocs={recentDocs}
              onShowToast={showToast}
              apiBase={API}
              onClose={goHome}
              authHeaders={(extra = {}) => ({
                ...authHeaders(),
                ...extra,
              })}
            />
          )}

          {page === 'form' && (
            <div className="max-w-2xl mx-auto">
              {/* AI Mode Banner */}
              {aiMode && (
                <div
                  className="mb-7 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-700"
                  style={{
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(124,58,237,0.05) 100%)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    borderLeft: '3px solid #6366f1',
                    borderRadius: '16px',
                  }}
                >
                  <div
                    className="w-9 h-9 text-white rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 12px rgba(79,70,229,0.28)' }}
                  >🤖</div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#3730a3', fontFamily: "'DM Sans', system-ui, sans-serif" }}>AI Intelligent Fill Active</p>
                    <p style={{ fontSize: '10px', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Reviewing fields extracted from source email</p>
                  </div>
                </div>
              )}

              {/* Progress Stepper */}
              <div ref={stepperRef} className="mb-8 px-2 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar relative scroll-smooth">
                {(() => {
                  if (!activeSchema) return null;
                  const wizardSteps = activeSchema.steps || [];
	                  let filteredSections: SchemaSection[] = [];
	                  if (!Array.isArray(activeSchema.sections)) {
	                    filteredSections = Object.entries(activeSchema.sections || {}).filter(([, val]) => {
	                      const section = val;
                      if (activeSchema.id === 'irs') {
                        if (section.show_for_exhibits && !section.show_for_exhibits.includes(irsSelections.exhibit || '')) return false;
                        if (section.show_for_termination && section.show_for_termination !== irsSelections.termination_type) return false;
                        return !!(section.always_show || section.show_for_exhibits || section.show_for_termination);
                      } else if (activeSchema.id === 'equity_trs') {
                        if (section.show_for_models && irsSelections.model_type && !section.show_for_models.includes(irsSelections.model_type)) return false;
                      }
                      if (section.show_when) {
                        const srcVal = { ...irsSelections, ...stepData }[section.show_when.field];
                        const targetVal = section.show_when.value;
                        const operator = section.show_when.operator || 'equal';
                        if (operator === 'not_equal') { if (srcVal === targetVal) return false; } 
                        else { if (srcVal !== targetVal) return false; }
                      }
                      return true;
                    }).map(([, v]) => v);
                  } else {
                    filteredSections = activeSchema.sections;
                  }

                  const allSteps = [...wizardSteps.map(s => ({ id: s.id, title: s.title })), ...filteredSections.map(s => ({ id: s.title, title: s.title }))];

                  return allSteps.map((s, i) => (
                    <React.Fragment key={i}>
                      <button
                        onClick={() => setCurrentStep(i)}
                        data-step-index={i}
                        className="whitespace-nowrap transition-all duration-300 flex items-center gap-3 shrink-0"
                        style={{
                          height: '36px',
                          padding: '0 16px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: i === currentStep ? 800 : 600,
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                          background: i === currentStep ? '#4f46e5' : 'transparent',
                          color: i === currentStep ? 'white' : i < currentStep ? '#4f46e5' : '#64748b',
                          border: 'none',
                          boxShadow: i === currentStep ? '0 8px 20px rgba(79,70,229,0.2)' : 'none',
                        }}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${
                          i === currentStep ? 'bg-white/20 text-white' : i < currentStep ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {i < currentStep ? '✓' : i + 1}
                        </span>
                        {s.title}
                      </button>
                      {i < allSteps.length - 1 && (
                        <div className="h-[2px] w-6 bg-slate-200 shrink-0 mx-1" />
                      )}
                    </React.Fragment>
                  ));
                })()}
              </div>

              {/* Form Card */}
              <div
                className="bg-white min-h-[360px]"
                style={{
                  borderRadius: '20px',
                  border: '1px solid rgba(226,232,240,0.8)',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
                }}
              >
                <div className="p-4 sm:p-6 lg:p-7">
                  {renderFormContent()}
                </div>
                <div
                  className="mx-4 sm:mx-6 lg:mx-7 pb-4 sm:pb-6 pt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderTop: '1px solid rgba(241,245,249,1)' }}
                >
                  <button
                    onClick={() => currentStep > 0 && setCurrentStep(c => c - 1)}
                    disabled={currentStep === 0}
                    style={{
                      padding: '10px 28px',
                      borderRadius: '999px',
                      border: '1px solid rgba(226,232,240,0.8)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#64748b',
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      background: 'white',
                      opacity: currentStep === 0 ? 0.35 : 1,
                      cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >Back</button>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: '16px 48px',
                      borderRadius: '16px',
                      background: '#4f46e5',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 700,
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      border: 'none',
                      boxShadow: '0 10px 25px rgba(79,70,229,0.2)',
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#4f46e5'}
                  >
                    {currentStep === steps.length - 1 ? 'Generate Confirmation' : 'Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {page === 'pdf' && (
            <CustomPDFViewer
              docId={editingDocId || ''}
              pdfUrl={currentPdfBlobUrl!}
              filename={currentPdfFilename}
              onClose={handleBack}
              onDownload={() => { const a = document.createElement('a'); a.href = currentPdfBlobUrl!; a.download = currentPdfFilename; a.click(); }}
              onPrint={() => { const w = window.open(currentPdfBlobUrl!, '_blank'); w?.print(); }}
              isAiCreated={aiMode}
              hasExistingReport={hasExistingValidationReport}
              showValidateOnPdf={showValidateOnPdf}
              onGenerateValidation={requestValidation}
              onViewCurrentReport={() => setValidationPanelOpen(true)}
              onConvertToWord={downloadWord}
              generatingValidation={loading}
              onSigned={fetchRecentDocs}
              initialIsSigned={recentDocs.find(d => d._id === editingDocId)?.signed || false}
            />
          )}
        </div>
      </main>

      {/* ── ChatSidebar (manual form pages only) ── */}
      {isManualForm && (
        <ChatSidebar
          docType={activeSchema?.id || ''}
          schema={activeSchema}
          activeFieldKey={activeFieldKey}
          activeFieldLabel={activeFieldLabel}
          onFieldFocus={setActiveFieldKey}
          totalFields={totalFields}
          filledFields={filledFields}
          skippedCount={0}
          currentData={{ ...irsSelections, ...stepData }}
        />
      )}

      <ValidationReport
        report={validationReport}
        isOpen={validationPanelOpen}
        onClose={() => setValidationPanelOpen(false)}
        documentTitle={currentPdfFilename}
        validationDate={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        onRegenerate={requestValidation}
      />

      {/* Loading Overlay */}
      {loading && (
        <div
          className="fixed inset-0 z-100 flex flex-col items-center justify-center animate-in fade-in duration-300"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          <div className="flex flex-col items-center">
            {/* Minimal Rotating Logo */}
            <div className="relative mb-8">
              <div className="w-24 h-24 animate-[spin_3s_linear_infinite]">
                <img 
                  src="/logo.svg" 
                  alt="Loading..." 
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            </div>

            <div className="text-center">
              <h3
                style={{ fontSize: '20px', fontWeight: 700, color: 'white', fontFamily: "var(--font-inter)", letterSpacing: '-0.02em', marginBottom: '4px' }}
              >
                {loadingText}
              </h3>
              <p
                style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: "var(--font-inter)", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}
              >
                {loadingSub}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toastVisible && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-110 flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-500"
          style={{
            padding: '12px 24px',
            background: 'rgba(15,23,42,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '999px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#818cf8', flexShrink: 0 }} />
          <span
            style={{ fontSize: '13px', fontWeight: 600, color: 'white', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '-0.01em' }}
          >{toast}</span>
        </div>
      )}

      {/* New Document Options Modal */}
      {modal === 'new-doc' && (
        <div className="fixed inset-0 z-120 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setModal('none')} />
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-lg relative shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-text-secondary">New Document</h3>
                <p className="text-sm text-text-tertiary">Select how you want to create your document.</p>
              </div>
              <button onClick={() => setModal('none')} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 gap-4">
              <button 
                onClick={() => { setPage('ai'); setModal('none'); }}
                className="flex items-center gap-5 p-6 rounded-2xl border-2 border-transparent bg-primary/5 hover:border-primary/40 hover:bg-primary/8 transition-all group text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-white shadow-button group-hover:scale-105 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.69 7"/><path d="M12 12l5.63 8.16"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-secondary text-lg mb-1">AI-Powered Extraction</p>
                  <p className="text-sm text-text-tertiary">Extract data from emails or PDFs automatically using Gemini AI.</p>
                </div>
              </button>

              <button 
                onClick={() => { setModal('type'); }}
                className="flex items-center gap-5 p-6 rounded-2xl border-2 border-transparent bg-orange-50/50 hover:border-orange-200 hover:bg-orange-50 transition-all group text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-secondary text-lg mb-1">Manual Form Entry</p>
                  <p className="text-sm text-text-tertiary">Fill out a structured form manually using our pre-built templates.</p>
                </div>
              </button>
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setModal('none')} className="px-6 py-2.5 text-sm font-bold text-text-tertiary hover:text-text-secondary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Type Selection Modal */}
      {modal === 'type' && (
        <div className="fixed inset-0 z-130 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setModal('none')} />
          <div className="bg-white rounded-t-[28px] sm:rounded-[40px] w-full max-w-2xl max-h-[90dvh] relative shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-y-auto animate-in slide-in-from-bottom duration-300 border border-white/20">
            <div className="p-6 sm:p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
              <div>
                <h3 className="text-2xl font-black text-text-secondary tracking-tight">Select Asset Class</h3>
                <p className="text-sm text-text-tertiary font-medium">Choose a template to start manual trade capture.</p>
              </div>
              <button onClick={() => setModal('none')} className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[
                { id: 'fx_ndf', name: 'FX NDF', sub: 'Foreign Exchange', color: '#4f46e5', bg: 'rgba(79,70,229,0.08)', hoverBorder: '#4f46e5', icon: <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1M12 16v1m-4-4h8m-8 4h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> },
                { id: 'irs', name: 'Interest Rate Swap', sub: 'IRS Contracts', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', hoverBorder: '#7c3aed', icon: <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg> },
                { id: 'cds', name: 'Credit Default Swap', sub: 'CDS Protections', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', hoverBorder: '#ef4444', icon: <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
                { id: 'equity_trs', name: 'Equity TRS', sub: 'Total Return Swaps', color: '#10b981', bg: 'rgba(16,185,129,0.08)', hoverBorder: '#10b981', icon: <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> }
              ].map((t) => (
                <button 
                  key={t.id}
	                  onClick={() => { selectType(t.id); setModal('none'); }}
	                  className="flex flex-col items-center gap-4 p-6 sm:p-8 rounded-[28px] sm:rounded-[40px] border-2 border-gray-100 transition-all duration-300 group text-center relative overflow-hidden"
	                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.hoverBorder; e.currentTarget.style.backgroundColor = t.bg; e.currentTarget.style.boxShadow = `0 20px 40px ${t.color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(243,244,246,1)'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm" style={{ background: t.bg, color: t.color }}>
                    {t.icon}
                  </div>
                  <div>
                    <p className="font-black text-[#1a1d2e] text-lg tracking-tight">{t.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Chat Copilot — hidden on manual form pages (ChatSidebar replaces it) */}
      {!isManualForm && (
      <div className="fixed bottom-4 right-4 z-140 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8">
        <ChatCopilot
          docType={page === 'form' ? activeSchema?.id : null}
          schema={page === 'form' ? activeSchema : null}
          currentData={page === 'form' ? { ...irsSelections, ...stepData } : null}
          onNavigate={(dest) => {
          const targetRaw = dest.toLowerCase().trim();

          const pageMap: Record<string, AppPage> = {
            'landing': 'landing', 'home': 'landing', 'dashboard': 'landing',
            'analytics': 'analytics', 'charts': 'analytics', 'stats': 'analytics',
            'ai': 'ai', 'extraction': 'ai', 'upload': 'ai',
            'settings': 'settings', 'profile': 'settings', 'settings-profile': 'settings',
            'settings-preference': 'settings', 'settings-password': 'settings',
            'my-documents': 'my-documents', 'documents': 'my-documents', 'history': 'my-documents',
            'form': 'form',
            'form-fx_ndf': 'form', 'form-irs': 'form', 'form-cds': 'form', 'form-equity_trs': 'form'
          };

          // Check for full match first (e.g. "my-documents")
          let actualPage: AppPage | undefined = pageMap[targetRaw];
          let sub: string | undefined = undefined;

          // If not found, try splitting (e.g. "form-irs" -> target: "form", sub: "irs")
          if (!actualPage && targetRaw.includes('-')) {
            const parts = targetRaw.split('-');
            const prefix = parts[0];
            if (pageMap[prefix]) {
              actualPage = pageMap[prefix];
              sub = parts.slice(1).join('-');
            }
          }

          if (actualPage) {
            setPage(actualPage);
            setModal('none');

            if (actualPage === 'settings') {
              const subMap: Record<string, SettingsTab> = {
                'profile': 'edit-profile', 'settings-profile': 'edit-profile',
                'security': 'security', 'password': 'security', 'change-password': 'security', 'settings-password': 'security'
              };
              const subKey = sub || targetRaw;
              if (subMap[subKey]) setSettingsSub(subMap[subKey]);
            }

            if (actualPage === 'form') {
              const schemaKey = sub || targetRaw.replace('form-', '');
              if (schemas[schemaKey]) {
                setActiveSchema(schemas[schemaKey]);
                setCurrentStep(0);
                setStepData({});
                setIrsSelections({});
              }
            }
          } else {
            console.warn('Unknown navigation target:', targetRaw);
          }
        }} />
      </div>
      )}
    </div>
  );
}
