'use client';

import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { RecentDoc } from '../types';

interface WorkflowBuilderProps {
  recentDocs: RecentDoc[];
  onShowToast: (msg: string) => void;
  apiBase: string;
  onClose: () => void;
  authHeaders: (extra?: Record<string, string>) => Record<string, string>;
}

type NodeType = 'sender' | 'draft' | 'recipient' | 'pdf';

interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  data: Record<string, string>;
}

interface Link {
  id: string;
  from: string;
  to: string;
}

export default function WorkflowBuilderPanel({
  recentDocs,
  onShowToast,
  apiBase,
  onClose,
  authHeaders,
}: WorkflowBuilderProps) {
  // --- Default layout — toolbar is outside canvas so nodes can start near top ---
  const DEFAULT_NODES: Node[] = [
    {
      id: 'sender-1',
      type: 'sender',
      x: 50,
      y: 20,
      data: { smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: 'jatinsharma14202003@gmail.com', smtp_password: '', smtp_from_name: 'TradeDoc Operations', show_advanced: 'false' },
    },
    {
      id: 'pdf-1',
      type: 'pdf',
      x: 50,
      y: 270,
      data: { pdf_file_id: '', pdf_filename: '' },
    },
    {
      id: 'draft-1',
      type: 'draft',
      x: 450,
      y: 40,
      data: {
        text: 'From: bank@ops.com\nTo: client@trade.com\nFX NDF Trade details:\nStrike: 82.40\nNotional: $1,000,000',
        prompt: 'Draft a professional email confirming that the attached trade confirmation document has been fully executed by both parties. Inform the recipient that the signed copy is enclosed for their records.',
        pdf_file_id: '',
        pdf_filename: ''
      },
    },
    {
      id: 'recipient-1',
      type: 'recipient',
      x: 880,
      y: 180,
      data: { email: '' },
    },
  ];

  const DEFAULT_LINKS: Link[] = [
    { id: 'link-1', from: 'sender-1', to: 'draft-1' },
    { id: 'link-pdf', from: 'pdf-1', to: 'draft-1' },
    { id: 'link-3', from: 'draft-1', to: 'recipient-1' },
  ];

  // --- Nodes & Links State ---
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);

  const [links, setLinks] = useState<Link[]>(DEFAULT_LINKS);

  // --- UI Interaction States ---
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [executing, setExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'canvas' | 'approvals' | 'logs'>('canvas');
  const [pendingDocs, setPendingDocs] = useState<RecentDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<RecentDoc | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchPendingApprovals = async () => {
    try {
      const res = await fetch(`${apiBase}/api/workflow/pending-approvals`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setPendingDocs(data);
      }
    } catch (e) {
      console.error("Error fetching pending approvals:", e);
    }
  };

  const fetchPdfBlob = async (docId: string) => {
    try {
      setPdfLoading(true);
      setPdfError(null);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      const r = await fetch(`${apiBase}/api/documents/${docId}/pdf?t=${Date.now()}`, {
        headers: authHeaders()
      });
      if (!r.ok) {
        setPdfError('Failed to retrieve PDF from server.');
        setPdfLoading(false);
        return;
      }
      const contentType = r.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const data = await r.json();
        const signedUrl: string | undefined = data.signed_url;
        if (!signedUrl) {
          setPdfError('Signed URL not generated.');
          setPdfLoading(false);
          return;
        }
        const pdfResp = await fetch(signedUrl);
        if (!pdfResp.ok) {
          setPdfError('Failed to fetch from signed URL.');
          setPdfLoading(false);
          return;
        }
        const blob = await pdfResp.blob();
        setPdfBlobUrl(URL.createObjectURL(blob));
      } else {
        const blob = await r.blob();
        setPdfBlobUrl(URL.createObjectURL(blob));
      }
      setPdfLoading(false);
    } catch (e) {
      console.error(e);
      setPdfError('An error occurred while fetching the PDF preview.');
      setPdfLoading(false);
    }
  };

  const handleSelectDoc = async (doc: RecentDoc) => {
    setSelectedDoc(doc);
    fetchPdfBlob(doc._id);
    try {
      setDraftingEmail(true);
      const res = await fetch(`${apiBase}/api/workflow/draft-release-email`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ doc_id: doc._id }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailSubject(data.subject || '');
        setEmailBody(data.email_body || '');
      } else {
        onShowToast('⚠️ Failed to generate AI draft email. You can write your own below.');
        setEmailSubject(`EXECUTED: Trade Confirmation — ${doc.summary}`);
        setEmailBody(`Dear Client,\n\nPlease find attached the fully executed trade confirmation for ${doc.summary}.\n\nKind regards,\nTradeDoc Operations`);
      }
    } catch (e) {
      console.error(e);
      onShowToast('⚠️ Failed to contact draft generator.');
    } finally {
      setDraftingEmail(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedDoc) return;
    try {
      setReleasing(true);
      const res = await fetch(`${apiBase}/api/workflow/release-document`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          doc_id: selectedDoc._id,
          subject: emailSubject,
          email_body: emailBody,
        }),
      });
      if (res.ok) {
        onShowToast('🎉 Document successfully verified and released!');
        const updatedList = pendingDocs.filter(d => d._id !== selectedDoc._id);
        setPendingDocs(updatedList);
        setSelectedDoc(null);
        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
          setPdfBlobUrl(null);
        }
      } else {
        const data = await res.json();
        onShowToast(`❌ Error: ${data.error || 'Failed to release document'}`);
      }
    } catch (e) {
      console.error(e);
      onShowToast('❌ Failed to release document.');
    } finally {
      setReleasing(false);
    }
  };

  // Revoke blob URL on cleanup
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // --- Load nodes & links from localStorage on mount & Fetch Pending Approvals ---
  useEffect(() => {
    fetchPendingApprovals();

    if (typeof window !== 'undefined') {
      const savedNodes = localStorage.getItem('td_workflow_nodes');
      const savedLinks = localStorage.getItem('td_workflow_links');
      if (savedNodes) {
        try {
          const parsed = JSON.parse(savedNodes);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNodes(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
      if (savedLinks) {
        try {
          const parsed = JSON.parse(savedLinks);
          if (Array.isArray(parsed)) {
            setLinks(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Check for tab routing
      const targetTab = sessionStorage.getItem('workflow_builder_tab');
      if (targetTab === 'approvals') {
        setActiveTab('approvals');
        sessionStorage.removeItem('workflow_builder_tab');
      }
    }
  }, []);

  // --- Persist nodes in localStorage only when NOT dragging (optimized) ---
  useEffect(() => {
    if (typeof window !== 'undefined' && !draggingNodeId && nodes.length > 0) {
      localStorage.setItem('td_workflow_nodes', JSON.stringify(nodes));
    }
  }, [nodes, draggingNodeId]);

  // --- Persist links in localStorage ---
  useEffect(() => {
    if (typeof window !== 'undefined' && links.length > 0) {
      localStorage.setItem('td_workflow_links', JSON.stringify(links));
    }
  }, [links]);

  // --- Fetch PDF selections on load ---
  useEffect(() => {
    // Automatically match the latest generated PDF if available
    const latestDoc = recentDocs.find(d => !d.is_draft);
    if (latestDoc) {
      setNodes(prev =>
        prev.map(node => {
          if (node.type === 'draft') {
            return {
              ...node,
              data: {
                ...node.data,
                pdf_file_id: latestDoc.data?.pdf_file_id as string || latestDoc._id || '',
                pdf_filename: latestDoc.summary || 'trade_confirmation.pdf',
              },
            };
          }
          return node;
        })
      );
    }
  }, [recentDocs]);

  // --- Add a new node ---
  const addNode = (type: NodeType) => {
    const id = `${type}-${Date.now()}`;
    const x = 150 + Math.random() * 200;
    const y = 150 + Math.random() * 200;
    
    let defaultData: Record<string, string> = {};
    if (type === 'sender') {
      defaultData = { smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: 'jatinsharma14202003@gmail.com', smtp_password: '', smtp_from_name: 'TradeDoc Operations', show_advanced: 'false' };
    } else if (type === 'draft') {
      defaultData = { text: '', prompt: 'Draft a trade confirmation cover email.', pdf_file_id: '', pdf_filename: '' };
    } else if (type === 'recipient') {
      defaultData = { email: '' };
    } else if (type === 'pdf') {
      defaultData = { pdf_file_id: '', pdf_filename: '' };
    }

    setNodes(prev => [...prev, { id, type, x, y, data: defaultData }]);
    onShowToast(`Added ${type.toUpperCase()} node`);
  };

  // --- Delete a node ---
  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setLinks(prev => prev.filter(l => l.from !== id && l.to !== id));
    onShowToast('🗑️ Node deleted');
  };

  // --- Drag and Drop Movement ---
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    // Prevent dragging when interacting with input elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON') {
      return;
    }
    
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    setDraggingNodeId(id);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingNodeId) {
      setNodes(prev =>
        prev.map(node => {
          if (node.id === draggingNodeId) {
            return {
              ...node,
              x: Math.max(0, e.clientX - dragOffset.x),
              y: Math.max(0, e.clientY - dragOffset.y),
            };
          }
          return node;
        })
      );
    }

    if (connectingFromId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setConnectingFromId(null);
  };

  // --- Linking Nodes ---
  const startConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingFromId(nodeId);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const endConnection = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!connectingFromId || connectingFromId === targetId) {
      setConnectingFromId(null);
      return;
    }

    const sourceNode = nodes.find(n => n.id === connectingFromId);
    const targetNode = nodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) return;

    // Validate link: Output to Input only.
    // Sender/PDF → Draft, Draft → Recipient
    const isValid =
      ((sourceNode.type === 'sender' || sourceNode.type === 'pdf') && targetNode.type === 'draft') ||
      (sourceNode.type === 'draft' && targetNode.type === 'recipient');

    if (!isValid) {
      onShowToast('⚠️ Invalid connection! Follow the flow: Sender/Input/PDF → AI Draft → Recipient');
      setConnectingFromId(null);
      return;
    }

    // Check if link already exists
    const exists = links.some(l => l.from === connectingFromId && l.to === targetId);
    if (!exists) {
      const newLinkId = `link-${Date.now()}`;
      setLinks(prev => [...prev, { id: newLinkId, from: connectingFromId, to: targetId }]);
      onShowToast('🔗 Connection created!');
    }
    setConnectingFromId(null);
  };

  // --- Update individual node data fields ---
  const updateNodeData = (nodeId: string, key: string, value: string) => {
    setNodes(prev =>
      prev.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, [key]: value },
          };
        }
        return node;
      })
    );
  };

  // --- Run / Execute the Workflow ---
  const runWorkflow = async () => {
    // 1. Locate the AI Draft Node(s)
    const draftNodes = nodes.filter(n => n.type === 'draft');
    if (draftNodes.length === 0) {
      onShowToast('❌ Please add at least one AI Email Draft node.');
      return;
    }

    setExecuting(true);
    setExecutionLogs([]);
    setActiveTab('logs');

    let overallSuccess = true;

    for (const draft of draftNodes) {
      const log = (msg: string) => setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      
      log(`Processing Draft Node: ${draft.id}...`);

      // Find connected Sender
      const senderLink = links.find(l => l.to === draft.id && nodes.find(n => n.id === l.from)?.type === 'sender');
      const senderNode = senderLink ? nodes.find(n => n.id === senderLink.from) : null;

      // Find connected Recipients
      const recipientLinks = links.filter(l => l.from === draft.id && nodes.find(n => n.id === l.to)?.type === 'recipient');
      const recipientNodes = recipientLinks.map(l => nodes.find(n => n.id === l.to)).filter(Boolean) as Node[];

      if (!draft.data.text) {
        log(`❌ Error: Draft Node ${draft.id} does not have Email Input content filled.`);
        overallSuccess = false;
        continue;
      }

      if (recipientNodes.length === 0) {
        log(`❌ Error: Draft Node ${draft.id} has no Recipient nodes connected.`);
        overallSuccess = false;
        continue;
      }

      // Collect recipient email addresses
      const recipients = recipientNodes.map(r => r.data.email).filter(Boolean);
      if (recipients.length === 0) {
        log(`❌ Error: Connected Recipient nodes are empty.`);
        overallSuccess = false;
        continue;
      }

      log(`Found ${recipients.length} recipients: ${recipients.join(', ')}`);

      // Check for connected PDF node — overrides draft node's own attachment
      const pdfLink = links.find(l => l.to === draft.id && nodes.find(n => n.id === l.from)?.type === 'pdf');
      const pdfNode = pdfLink ? nodes.find(n => n.id === pdfLink.from) : null;
      const resolvedPdfFileId = pdfNode?.data.pdf_file_id || draft.data.pdf_file_id || '';
      const resolvedPdfFilename = pdfNode?.data.pdf_filename || draft.data.pdf_filename || '';

      if (pdfNode) {
        log(`📎 Using PDF from PDF Attachment node: ${resolvedPdfFilename || 'Selected PDF'}`);
      }

      // Prepare payload
      // Find the selected doc from the PDF node to extract client details
      const pdfDocId = (pdfNode?.data.pdf_file_id || draft.data.pdf_file_id || '');
      const selectedPdfDoc = recentDocs.find(d =>
        (d.data?.pdf_file_id as string) === pdfDocId || d._id === pdfDocId
      );
      const payload: Record<string, unknown> = {
        input_text: draft.data.text || '',
        prompt: draft.data.prompt || '',
        recipients: recipients,
        pdf_file_id: resolvedPdfFileId,
        pdf_filename: resolvedPdfFilename,
        // Pass client details so Groq can use real names instead of placeholders
        client_name: selectedPdfDoc?.client_signed_name || '',
        client_email: selectedPdfDoc?.client_email || '',
        doc_summary: selectedPdfDoc?.summary || '',
        doc_type: selectedPdfDoc?.doc_type || '',
      };

      // Add custom sender credentials if connected
      if (senderNode) {
        log(`Using custom sender account: ${senderNode.data.smtp_user || 'Default System'}`);
        payload.custom_sender = {
          smtp_host: senderNode.data.smtp_host || 'smtp.gmail.com',
          smtp_port: senderNode.data.smtp_port || '587',
          smtp_user: senderNode.data.smtp_user || '',
          smtp_password: senderNode.data.smtp_password || '',
          smtp_from_name: senderNode.data.smtp_from_name || 'TradeDoc Operations',
        };
      } else {
        log(`Using default system SMTP configuration from backend.`);
      }

      try {
        log(`Sending workflow request to backend...`);
        const resp = await fetch(`${apiBase}/api/workflow/execute`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const err = await resp.json();
          log(`❌ Backend Error: ${err.error || 'Execution failed'}`);
          overallSuccess = false;
          continue;
        }

        const result = await resp.json();
        log(`✅ AI Email Draft Generated:\n"${result.email_draft.substring(0, 120)}..."`);
        log(`📤 Sent successfully to ${result.success_count} recipients.`);
        
        if (result.failed_recipients && result.failed_recipients.length > 0) {
          result.failed_recipients.forEach((fail: { recipient: string; error: string }) => {
            log(`⚠️ Failed sending to ${fail.recipient}: ${fail.error}`);
          });
          overallSuccess = false;
        }
      } catch (e) {
        log(`❌ Connection Error: ${(e as Error).message}`);
        overallSuccess = false;
      }
    }

    setExecuting(false);
    if (overallSuccess) {
      onShowToast('🎉 Workflow executed successfully!');
    } else {
      onShowToast('⚠️ Workflow execution completed with some errors.');
    }
  };

  // --- Helper: Render connection SVG curves ---
  const renderLines = () => {
    return links.map(link => {
      const fromNode = nodes.find(n => n.id === link.from);
      const toNode = nodes.find(n => n.id === link.to);

      if (!fromNode || !toNode) return null;

      // Adjust coordinate start/end based on node width/height
      const startX = fromNode.x + 280; // Card width approx
      const startY = fromNode.y + 70;  // Port position
      const endX = toNode.x;
      const endY = toNode.y + 70;

      // Control points for curved Bezier path
      const cp1X = startX + 80;
      const cp1Y = startY;
      const cp2X = endX - 80;
      const cp2Y = endY;

      const pathString = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

      return (
        <g key={link.id} className="group">
          {/* Visual highlight line */}
          <path
            d={pathString}
            fill="none"
            stroke="rgba(99, 102, 241, 0.15)"
            strokeWidth="8"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={() => {
              setLinks(prev => prev.filter(l => l.id !== link.id));
              onShowToast('🔗 Connection removed');
            }}
          />
          {/* Main SVG connection line */}
          <path
            d={pathString}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3.5"
            strokeDasharray={connectingFromId ? '4 4' : 'none'}
            className="transition-all duration-300"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(79, 70, 229, 0.3))' }}
          />
        </g>
      );
    });
  };

  // --- Render active dragging link line ---
  const renderConnectingLine = () => {
    if (!connectingFromId) return null;
    const fromNode = nodes.find(n => n.id === connectingFromId);
    if (!fromNode) return null;

    const startX = fromNode.x + 280;
    const startY = fromNode.y + 70;

    const pathString = `M ${startX} ${startY} C ${startX + 80} ${startY}, ${mousePos.x - 80} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;

    return (
      <path
        d={pathString}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="3"
        strokeDasharray="5 5"
      />
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 animate-fade-in">
      {/* Panel Headers */}
      <div className="flex flex-row justify-between items-center mb-5 shrink-0 px-2">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm cursor-pointer shrink-0"
            title="Go back to Dashboard"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            <span className="text-xs font-bold font-inter">Exit Agent</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-inter tracking-tight">
              AI Email Agent
            </h1>
            <p className="text-[13px] text-slate-500 font-medium">
              Visually construct, automate, and send your trade documents to clients.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2.5 items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl" style={{ border: '1px solid rgba(226,232,240,0.8)' }}>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'canvas' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              Canvas
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'approvals' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'} flex items-center gap-1`}
            >
              Approvals & Releases
              {pendingDocs.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-sm">
                  {pendingDocs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'logs' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              Logs {executionLogs.length > 0 && `(${executionLogs.length})`}
            </button>
          </div>

          {/* Reset Layout + Run Workflow — only relevant on Canvas tab */}
          {activeTab !== 'approvals' && (
            <>
              <button
                onClick={() => {
                  localStorage.removeItem('td_workflow_nodes');
                  localStorage.removeItem('td_workflow_links');
                  setNodes(DEFAULT_NODES);
                  setLinks(DEFAULT_LINKS);
                  onShowToast('🔄 Layout reset to default');
                }}
                className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-700 font-bold text-xs border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-1.5"
                title="Reset node layout to default positions"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Reset Layout
              </button>

              <button
                onClick={runWorkflow}
                disabled={executing}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-[13px] flex items-center gap-1.5 transition-all shadow-md bg-primary hover:bg-indigo-700 disabled:opacity-50"
                style={{ boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)' }}
              >
                {executing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                    Run Workflow
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas / Logs display */}
      <div className="flex-1 bg-slate-50 rounded-[28px] border border-slate-200/80 overflow-hidden relative flex flex-col shadow-inner">
        {activeTab === 'canvas' ? (
          <>
            {/* Canvas Toolbar Row — sits ABOVE the canvas, never overlaps nodes */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100 rounded-t-[28px] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Add Nodes:</span>
                <button
                  onClick={() => addNode('sender')}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
                >
                  Sender
                </button>
                <button
                  onClick={() => addNode('pdf')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all flex items-center gap-1"
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  PDF Attachment
                </button>
                <button
                  onClick={() => addNode('draft')}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
                >
                  AI Email Draft
                </button>
                <button
                  onClick={() => addNode('recipient')}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
                >
                  Recipient
                </button>
              </div>
              <span className="text-[11px] text-indigo-500 font-semibold">
                Drag node headers to move · Connect: Out-port (purple) → In-port (blue)
              </span>
            </div>

            {/* Draggable Node Canvas Container — no scrollbars */}
            <div
              ref={canvasRef}
              className="flex-1 w-full h-full overflow-hidden relative select-none"
              style={{
                backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* SVG connection layer */}
              <svg className="absolute inset-0 w-[2000px] h-[2000px] pointer-events-none z-0">
                {renderLines()}
                {renderConnectingLine()}
              </svg>

              {/* Render Draggable Nodes */}
              {nodes.map(node => (
                <div
                  key={node.id}
                  className="absolute w-[290px] bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow flex flex-col z-10"
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                  }}
                >
                  {/* Node Header */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    className="px-4 py-3 bg-slate-50 rounded-t-2xl border-b border-slate-100 flex justify-between items-center cursor-move"
                  >
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        {node.type === 'sender' && 'Sender Profile'}
                        {node.type === 'draft' && 'AI Email Draft'}
                        {node.type === 'recipient' && 'Recipient'}
                        {node.type === 'pdf' && 'PDF Attachment'}
                      </strong>
                    </div>
                    <button
                      onClick={() => deleteNode(node.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Node Content / Input fields */}
                  <div className="p-4 flex-1 flex flex-col gap-4">
                    {node.type === 'sender' && (
                      <div className="flex flex-col gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sender Display Name</label>
                          <input
                            type="text"
                            value={node.data.smtp_from_name}
                            onChange={(e) => updateNodeData(node.id, 'smtp_from_name', e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                            placeholder="e.g. TradeDoc AI Operations"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sender Email Address</label>
                          <input
                            type="email"
                            placeholder="your_email@gmail.com"
                            value={node.data.show_advanced === 'true' ? node.data.smtp_user : 'ops@tradedoc.com'}
                            onChange={(e) => updateNodeData(node.id, 'smtp_user', e.target.value)}
                            disabled={node.data.show_advanced !== 'true'}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
                          />
                        </div>
                        
                        {node.data.show_advanced === 'true' && (
                          <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-3 animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SMTP Server Host</label>
                              <input
                                type="text"
                                value={node.data.smtp_host}
                                onChange={(e) => updateNodeData(node.id, 'smtp_host', e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SMTP Security</span>
                                <div className="text-[11px] text-slate-500 font-medium py-1">STARTTLS Required</div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Port</label>
                                <input
                                  type="text"
                                  value={node.data.smtp_port}
                                  onChange={(e) => updateNodeData(node.id, 'smtp_port', e.target.value)}
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-center"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">SMTP App Password</label>
                                <span className="text-[9px] text-indigo-500 font-bold">Encrypted</span>
                              </div>
                              <input
                                type="password"
                                placeholder="••••••••••••••••"
                                value={node.data.smtp_password}
                                onChange={(e) => updateNodeData(node.id, 'smtp_password', e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100/60">
                          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            System SMTP Active
                          </span>
                          <button
                            onClick={() => updateNodeData(node.id, 'show_advanced', node.data.show_advanced === 'true' ? 'false' : 'true')}
                            className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            {node.data.show_advanced === 'true' ? 'Hide Server Settings' : 'Custom Server Setup'}
                          </button>
                        </div>
                      </div>
                    )}

                    {node.type === 'draft' && (
                      <div className="flex flex-col gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Incoming Source Email</label>
                          <textarea
                            value={node.data.text || ''}
                            onChange={(e) => updateNodeData(node.id, 'text', e.target.value)}
                            placeholder="Paste raw email details or transaction description..."
                            rows={5}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 resize-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Groq Prompt (Email Context)</label>
                          <textarea
                            value={node.data.prompt || ''}
                            onChange={(e) => updateNodeData(node.id, 'prompt', e.target.value)}
                            placeholder="Draft a trade confirmation cover email..."
                            rows={4}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {node.type === 'recipient' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Recipient Email</label>
                        <input
                          type="email"
                          placeholder="recipient@domain.com"
                          value={node.data.email}
                          onChange={(e) => updateNodeData(node.id, 'email', e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                        />
                      </div>
                    )}

                    {node.type === 'pdf' && (() => {
                      // Only show PDFs that are FULLY EXECUTED — both parties signed
                      // AND the initiator has verified & released. Half-signed docs excluded.
                      const releasedDocs = recentDocs.filter(d => !d.is_draft && d.released === true);
                      return (
                        <div className="flex flex-col gap-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Select Fully Executed PDF</label>
                          {releasedDocs.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                                <svg width="18" height="18" fill="none" stroke="#f59e0b" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                              </div>
                              <div>
                                <p className="text-[11px] text-slate-600 font-bold">No fully executed PDFs yet</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">A document must be signed by both parties<br/>and verified by you before it can be sent.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                              {releasedDocs.map(doc => {
                                const isSelected = node.data.pdf_file_id === (doc.data?.pdf_file_id as string || doc._id);
                                return (
                                  <button
                                    key={doc._id}
                                    onClick={() => {
                                      const fileId = doc.data?.pdf_file_id as string || doc._id || '';
                                      const filename = doc.summary || 'trade_confirmation.pdf';

                                      // 1. Update this PDF node
                                      updateNodeData(node.id, 'pdf_file_id', fileId);
                                      updateNodeData(node.id, 'pdf_filename', filename);

                                      // 2. Build auto-fill text from doc details
                                      const tradeData = doc.data || {};
                                      const lines: string[] = [];
                                      lines.push(`Document: ${doc.summary || 'Trade Confirmation'}`);
                                      lines.push(`Type: ${doc.doc_type || 'N/A'}`);
                                      lines.push(`Date: ${new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`);
                                      lines.push('');
                                      lines.push('--- Trade Details ---');
                                      // Dump all key-value pairs from the document's data object
                                      Object.entries(tradeData).forEach(([k, v]) => {
                                        if (k === 'pdf_file_id' || !v) return;
                                        const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                        lines.push(`${label}: ${v}`);
                                      });
                                      lines.push('');
                                      lines.push('--- Parties ---');
                                      if (doc.client_signed_name) lines.push(`Client (Party B): ${doc.client_signed_name}`);
                                      if (doc.client_email) lines.push(`Client Email: ${doc.client_email}`);
                                      if (doc.party_b_metadata?.time) lines.push(`Client Signed At: ${doc.party_b_metadata.time}`);
                                      const autoText = lines.join('\n');

                                      // 3. Find linked draft node(s) and auto-fill their text
                                      setNodes(prev => {
                                        // Find draft nodes connected FROM this pdf node
                                        const connectedDraftIds = links
                                          .filter(l => l.from === node.id)
                                          .map(l => l.to);
                                        // Also find recipient nodes connected from any draft
                                        const connectedRecipientIds = links
                                          .filter(l => connectedDraftIds.includes(l.from))
                                          .map(l => l.to);

                                        return prev.map(n => {
                                          if (connectedDraftIds.includes(n.id) && n.type === 'draft') {
                                            return { ...n, data: { ...n.data, text: autoText } };
                                          }
                                          if (connectedRecipientIds.includes(n.id) && n.type === 'recipient' && doc.client_email) {
                                            return { ...n, data: { ...n.data, email: doc.client_email } };
                                          }
                                          return n;
                                        });
                                      });

                                      onShowToast('✅ Document details auto-filled into draft');
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-150 flex items-start gap-2.5 ${
                                      isSelected
                                        ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                                        : 'bg-slate-50 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                                    }`}
                                  >
                                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                      isSelected ? 'bg-indigo-500' : 'bg-slate-200'
                                    }`}>
                                      {isSelected ? (
                                        <svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                      ) : (
                                        <svg width="9" height="9" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[11px] font-bold leading-tight truncate ${
                                        isSelected ? 'text-indigo-700' : 'text-slate-700'
                                      }`}>{doc.summary || 'Untitled Document'}</p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <svg width="9" height="9" fill="none" stroke="#059669" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        <span className="text-[9px] font-semibold text-emerald-700 uppercase tracking-wide">Fully Executed</span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {node.data.pdf_filename && (
                            <div className="mt-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                              <svg width="11" height="11" fill="none" stroke="#6366f1" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                              <span className="text-[10px] font-bold text-indigo-600 truncate">{node.data.pdf_filename.substring(0, 32)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Ports for Connection Linking */}
                  {/* Input Port (Blue Circle on Left) */}
                  {(node.type === 'draft' || node.type === 'recipient') && (
                    <div
                      onMouseUp={(e) => endConnection(e, node.id)}
                      className="absolute left-[-8px] top-[70px] w-4 h-4 bg-indigo-500 rounded-full border-2 border-white cursor-pointer hover:scale-125 hover:bg-indigo-600 transition-all flex items-center justify-center shadow"
                      title="Connect Input here"
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}

                  {/* Output Port (Purple Circle on Right) */}
                  {(node.type === 'sender' || node.type === 'draft' || node.type === 'pdf') && (
                    <div
                      onMouseDown={(e) => startConnection(e, node.id)}
                      className="absolute right-[-8px] top-[70px] w-4 h-4 bg-purple-500 rounded-full border-2 border-white cursor-pointer hover:scale-125 hover:bg-purple-600 transition-all flex items-center justify-center shadow"
                      title="Drag to connect Output"
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : activeTab === 'approvals' ? (
          /* Approvals & Releases Workspace */
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50">
            {/* Left Sidebar: Pending List */}
            <div className="lg:w-[350px] w-full border-r border-slate-200/80 bg-white flex flex-col shrink-0 h-full">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-inter">Pending Verification</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Awaiting final initiator release</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {pendingDocs.length} docs
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pendingDocs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mb-3 border border-emerald-100 shadow-sm animate-pulse">
                      ✓
                    </div>
                    <h4 className="text-xs font-bold text-slate-700">All Caught Up!</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                      No signed documents are pending verification at this moment.
                    </p>
                  </div>
                ) : (
                  pendingDocs.map((doc) => {
                    const isSelected = selectedDoc?._id === doc._id;
                    const dateStr = doc.client_signed_at 
                      ? new Date(doc.client_signed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Recently';
                    
                    return (
                      <button
                        key={doc._id}
                        onClick={() => handleSelectDoc(doc)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 relative flex gap-3 cursor-pointer hover:bg-slate-50 ${
                          isSelected 
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-sm ring-1 ring-indigo-200/50' 
                            : 'bg-white border-slate-200/80 shadow-sm'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                          isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          📄
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded-md">
                              {(doc.doc_type || 'TRADE').toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {dateStr}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 truncate mb-0.5">
                            {doc.summary || 'Trade Confirmation'}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate font-medium">
                            Client: {doc.client_signed_name || doc.client_email || 'Party B'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Verification Details & Action */}
            <div className="flex-1 overflow-y-auto flex flex-col h-full bg-slate-50">
              {!selectedDoc ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg shadow-indigo-200 flex items-center justify-center mb-5 border border-indigo-500/30">
                    <img src="/logo-light.svg" alt="TradeDoc AI" className="w-9 h-9 object-contain" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base font-inter">Client Approvals Center</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Select a client-signed document from the sidebar list to run the operations gate, inspect credentials, and verify before final release.
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6 flex flex-col lg:flex-row gap-6 min-h-full">
                  {/* Left Column: Form & Metadata */}
                  <div className="flex-1 space-y-6 min-w-0">
                    {/* Header Details */}
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Pending Release Gate
                        </span>
                        <span className="text-xs text-slate-400 font-medium">ID: {selectedDoc._id}</span>
                      </div>
                      <h2 className="text-lg font-black text-slate-800 font-inter leading-tight">
                        {selectedDoc.summary || 'Trade Confirmation'}
                      </h2>
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <span className="text-sm">🛡️</span>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Client Sign Audit Trail</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Signee</label>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                            {selectedDoc.client_signed_name || 'Counterparty Rep'}
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Email</label>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                            {selectedDoc.client_email || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IP Address</label>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 truncate font-mono">
                            {selectedDoc.party_b_metadata?.ip || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signature Date (IST)</label>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                            {selectedDoc.party_b_metadata?.time || 'Pending timestamp'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signer Agent/Browser</label>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 break-words line-clamp-2" title={selectedDoc.party_b_metadata?.user_agent}>
                          {selectedDoc.party_b_metadata?.user_agent || 'Unknown browser'}
                        </p>
                      </div>
                    </div>

                    {/* Email Editor Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🤖</span>
                          <div>
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">AI Release Email Draft</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Groq Operations Desk Agent</p>
                          </div>
                        </div>
                        {draftingEmail && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold animate-pulse">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            Drafting...
                          </div>
                        )}
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Line</label>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            disabled={draftingEmail}
                            className="w-full mt-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Message Body</label>
                          <textarea
                            rows={8}
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            disabled={draftingEmail}
                            className="w-full mt-1 px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium leading-relaxed font-sans"
                            style={{ resize: 'vertical' }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleRelease}
                        disabled={releasing || draftingEmail}
                        className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {releasing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Releasing & Sending Executed Copy...
                          </>
                        ) : (
                          <>
                            <span>✓</span>
                            <span>Verify & Release Executed Trade</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: PDF Viewer */}
                  <div className="lg:w-[480px] xl:w-[540px] w-full shrink-0 flex flex-col h-[650px] bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">📄</span>
                        <h4 className="text-xs font-bold text-slate-700">Executed PDF Contract Preview</h4>
                      </div>
                      {pdfBlobUrl && (
                        <a
                          href={pdfBlobUrl}
                          download={`${selectedDoc.summary.toLowerCase().replace(/\s+/g, '_')}_executed.pdf`}
                          className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          Download
                        </a>
                      )}
                    </div>
                    <div className="flex-1 bg-slate-100 flex items-center justify-center relative h-full">
                      {pdfLoading && (
                        <div className="flex flex-col items-center gap-2 animate-pulse">
                          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-slate-500 font-bold">Rendering Document...</span>
                        </div>
                      )}
                      {pdfError && (
                        <div className="p-4 text-center max-w-xs">
                          <p className="text-xs text-rose-500 font-bold mb-2">{pdfError}</p>
                          <button
                            onClick={() => fetchPdfBlob(selectedDoc._id)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                          >
                            Retry Loading
                          </button>
                        </div>
                      )}
                      {!pdfLoading && !pdfError && pdfBlobUrl && (
                        <iframe
                          src={`${pdfBlobUrl}#toolbar=0`}
                          title="Final Executed Agreement Preview"
                          className="w-full h-full border-0"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Logs Panel View (Light Theme) */
          <div className="flex-1 p-6 flex flex-col h-full bg-slate-50 font-mono text-slate-700 overflow-y-auto border border-slate-200/80 rounded-2xl shadow-inner">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500">EXECUTION CONSOLE LOGS</span>
              <button
                onClick={() => setExecutionLogs([])}
                className="px-2 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors shadow-sm cursor-pointer"
              >
                Clear Console
              </button>
            </div>
            <div className="flex-1 mt-4 space-y-2 text-xs">
              {executionLogs.length === 0 ? (
                <div className="text-slate-400 italic text-center pt-10">No execution logs. Click "Run Workflow" to trigger.</div>
              ) : (
                executionLogs.map((log, index) => {
                  let colorClass = 'text-slate-600';
                  if (log.includes('✅')) colorClass = 'text-emerald-600 font-semibold';
                  else if (log.includes('❌')) colorClass = 'text-rose-600 font-semibold';
                  else if (log.includes('⚠️')) colorClass = 'text-amber-600';
                  else if (log.includes('📤')) colorClass = 'text-cyan-600';
                  return (
                    <div key={index} className={`whitespace-pre-wrap leading-relaxed ${colorClass}`}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
