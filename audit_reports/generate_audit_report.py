from pathlib import Path
from datetime import date

report_dir = Path('audit_reports')
tex = r'''
\documentclass[11pt]{article}
\usepackage[a4paper,margin=0.72in]{geometry}
\usepackage{longtable}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{fancyhdr}
\usepackage{helvet}
\renewcommand{\familydefault}{\sfdefault}
\definecolor{navy}{HTML}{1E293B}
\definecolor{blue}{HTML}{4F46E5}
\definecolor{green}{HTML}{047857}
\definecolor{amber}{HTML}{B45309}
\definecolor{red}{HTML}{B91C1C}
\definecolor{muted}{HTML}{64748B}
\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=blue}
\pagestyle{fancy}
\fancyhf{}
\lhead{TradeDoc AI Project Audit}
\rhead{15 May 2026}
\cfoot{\thepage}
\titleformat{\section}{\Large\bfseries\color{navy}}{}{0em}{}[\titlerule]
\titleformat{\subsection}{\large\bfseries\color{navy}}{}{0em}{}
\setlist[itemize]{leftmargin=1.2em, itemsep=2pt, topsep=3pt}
\setlength{\parindent}{0pt}
\setlength{\parskip}{5pt}
\begin{document}

{\Huge\bfseries TradeDoc AI Project Audit Report}\\[4pt]
{\large Code Quality, Backend Health, Deployment Readiness, and Next-Step Plan}\\[8pt]
{\color{muted}Generated for project folder: \texttt{Latest\_Virtusa\_2.0} | Audit date: 15 May 2026}

\vspace{0.5cm}
\section{Executive Summary}

The project is a working full-stack prototype for AI-assisted derivatives confirmation generation. The core flows are present: Next.js frontend, Flask backend, Gemini-based agent pipeline, LaTeX PDF generation, Adobe PDF-to-Word integration hooks, and MongoDB-backed user/document storage.

\textbf{Overall readiness:} \textcolor{amber}{Not production/deployment ready yet}, but it is close to demo/UAT readiness. The biggest blockers are authentication hardening, frontend lint failures, production WSGI setup, chatbot persistence in MongoDB, and deployment/security cleanup.

\begin{longtable}{|p{0.28\textwidth}|p{0.19\textwidth}|p{0.43\textwidth}|}
\hline
\textbf{Area} & \textbf{Status} & \textbf{Reason} \\
\hline
Backend API & Good prototype & Routes are structured, MongoDB connectivity works, document CRUD works, AI extraction works. Needs WSGI server and better error/security handling. \\
\hline
Frontend UI & Functional but needs cleanup & Production build passes, but ESLint fails with 24 errors and 38 warnings. \\
\hline
MongoDB & Working & Signup, document save/list, and readiness checks passed against configured MongoDB. Chatbot is not persisted in MongoDB yet. \\
\hline
Auth & Partially implemented & Signup/login/me exist, but password change is broken, tokens are stored in localStorage, and several security controls are missing. \\
\hline
PDF generation & Working & Authenticated FX NDF PDF generation smoke test passed and returned a valid PDF. Other doc types should be regression tested similarly. \\
\hline
AI agents & Working smoke test & Gemini AI extraction passed on \texttt{test cases/sample6.txt}; classified as FX NDF and populated 18 fields. \\
\hline
Deployment & Not ready & Docker works conceptually, but image is heavy, Flask dev server is used, secrets/runtime configuration need cleanup, and CI/test gates are missing. \\
\hline
\end{longtable}

\section{Project Structure Analysis}

\subsection{Root folder}
\begin{itemize}
  \item \texttt{server.py}: Main Flask backend. Serves static UI, auth APIs, document CRUD, AI extraction, PDF generation, Word conversion, validation, and health routes.
  \item \texttt{agents/}: Lightweight LangGraph-style agent pipeline: classifier, extractor, PDF compiler, validator, Gemini helper, state graph runner.
  \item \texttt{templates/}: LaTeX/Jinja2 PDF generators for FX NDF, IRS, CDS, and Equity TRS.
  \item \texttt{ui-app/}: Next.js 16 + React 19 frontend.
  \item \texttt{test cases/}: Email/sample inputs for extraction testing.
  \item \texttt{output\_confirmations/}: Generated PDFs/TEX/DOCX. Should remain runtime/generated data, not source code.
  \item \texttt{Dockerfile}, \texttt{docker-compose.yml}, \texttt{entrypoint.sh}: Container deployment setup.
\end{itemize}

\subsection{Folders that should not be committed/deployed as source}
\begin{itemize}
  \item \texttt{.venv/}, \texttt{ui-app/node\_modules/}, \texttt{ui-app/.next/}, \texttt{ui-app/out/}, \texttt{\_\_pycache\_\_/}, \texttt{*.pyc}, \texttt{.DS\_Store}, generated PDF output.
  \item Your \texttt{.gitignore} already covers most of these. Good hygiene is present, but the working folder currently contains generated/vendor artifacts.
\end{itemize}

\section{What I Tested}

\begin{longtable}{|p{0.34\textwidth}|p{0.16\textwidth}|p{0.40\textwidth}|}
\hline
\textbf{Check} & \textbf{Result} & \textbf{Notes} \\
\hline
Python syntax compile & PASS & \texttt{server.py}, agents, and template generator files compiled successfully. \\
\hline
Next.js production build & PASS & \texttt{npm run build} completed successfully. Static pages generated for /, /dashboard, /login, /signup. \\
\hline
ESLint & FAIL & 62 total issues: 24 errors, 38 warnings. This should block production release. \\
\hline
Flask startup & PASS & Server starts and reports MongoDB connected successfully. \\
\hline
Health route via Flask test client & PASS & \texttt{/health/ready} returned ready with MongoDB true and Gemini configured true. \\
\hline
Auth signup smoke test & PASS & Test user signup returned 201 and token. \\
\hline
Document save/list smoke test & PASS & Draft document saved to MongoDB and listed successfully. \\
\hline
Password change smoke test & FAIL & Endpoint crashes with \texttt{KeyError: 'password'} because code reads \texttt{user['password']} instead of \texttt{password\_hash}. \\
\hline
FX NDF PDF generation & PASS & Authenticated generation returned HTTP 200, application/pdf, and a job-scoped file id. \\
\hline
Gemini AI extraction & PASS & \texttt{sample6.txt} classified as FX NDF and extracted 18 populated fields. \\
\hline
\end{longtable}

\section{Backend Health Review}

\subsection{Strengths}
\begin{itemize}
  \item Backend has clear route coverage: auth, profile, document CRUD, AI extraction, PDF generation, Word conversion, validation, liveness/readiness.
  \item MongoDB connection is lazy-loaded and uses indexes for users, documents, and PDF jobs.
  \item Atlas support is thoughtful: TLS options and certifi handling are present.
  \item Generated PDFs are job-scoped under user directories, which is much better than a shared flat temp folder.
  \item AI endpoints validate missing API key and input length for extraction.
  \item LaTeX generation uses argument-list subprocess calls, not shell execution, reducing command injection risk.
\end{itemize}

\subsection{Issues and risks}
\begin{itemize}
  \item \textbf{Password change bug:} \texttt{/api/me/change-password} checks \texttt{user['password']} and writes \texttt{password}; signup/login use \texttt{password\_hash}. This endpoint currently fails.
  \item \textbf{Chat endpoint is unauthenticated:} \texttt{/api/chat} does not use \texttt{@require\_auth}. Any user can call it if they know the route.
  \item \textbf{Flask development server:} The app currently runs via \texttt{app.run}. Production should use Gunicorn/uWSGI behind a reverse proxy or platform runtime.
  \item \textbf{Auth token model:} Itsdangerous signed tokens are okay for a prototype, but production should use secure HTTP-only cookies or a stronger JWT/session design with revocation strategy.
  \item \textbf{No rate limiting:} AI, login, signup, validation, and PDF generation endpoints should be rate limited.
  \item \textbf{No CSRF strategy:} If switching to cookies, add CSRF protection. With bearer tokens, secure storage is still an issue.
  \item \textbf{Input validation is uneven:} JSON schemas exist on frontend, but backend does not deeply validate document payloads before generating PDFs.
  \item \textbf{Global single-file backend:} \texttt{server.py} is large. It works, but maintainability will improve by splitting routes/services.
\end{itemize}

\section{Frontend Quality Review}

\subsection{Strengths}
\begin{itemize}
  \item UI is feature-rich: dashboard, AI extraction, manual forms, PDF preview, settings, saved documents, and chat copilot.
  \item Production build passes, which means TypeScript compilation and static export are not blocking right now.
  \item API helper centralizes base URL and auth headers.
  \item Dashboard flow integrates document save, generate PDF, convert to Word, validate, and load saved documents.
\end{itemize}

\subsection{Key frontend gaps}
\begin{itemize}
  \item ESLint fails. Main categories: \texttt{no-explicit-any}, unused variables/imports, unescaped apostrophe, React hooks lint around setState in effects, and image optimization warnings.
  \item Auth state is stored in \texttt{localStorage}. This is easy but not ideal for production because XSS can read tokens.
  \item Signup terms checkbox is visual only; it does not block submission.
  \item Forgot password links are placeholders.
  \item Chat history is stored in browser \texttt{localStorage}; it is not connected to MongoDB.
  \item Some dashboard state and type logic is large and could be split into hooks/services.
\end{itemize}

\section{Authentication Status}

You mentioned auth is still pending. My finding: \textbf{auth is partly built, but not production complete.}

Existing pieces:
\begin{itemize}
  \item Signup: implemented and tested successfully.
  \item Login: implemented.
  \item Current user: \texttt{/api/auth/me} implemented.
  \item Profile update: implemented.
  \item Route protection: most document/PDF/AI routes are protected with bearer token auth.
\end{itemize}

Missing/fix-needed pieces:
\begin{itemize}
  \item Fix password change: use \texttt{password\_hash} consistently.
  \item Protect \texttt{/api/chat} with \texttt{@require\_auth}.
  \item Add logout/session expiration UX.
  \item Add forgot password/reset password flow.
  \item Add email verification if this will be public.
  \item Add rate limiting and login abuse protection.
  \item Move tokens away from localStorage for production, preferably HTTP-only secure cookies.
  \item Add backend validation for profile fields and password policy.
\end{itemize}

\section{Chatbot + MongoDB Integration Plan}

Current state:
\begin{itemize}
  \item Frontend stores chat history in \texttt{localStorage}.
  \item Frontend sends the history array to \texttt{/api/chat} with every message.
  \item Backend uses Gemini and returns reply/action.
  \item Backend does not persist conversations or messages in MongoDB.
\end{itemize}

Recommended MongoDB design:
\begin{itemize}
  \item \texttt{chat\_sessions}: \texttt{\_id}, \texttt{user\_id}, \texttt{title}, \texttt{created\_at}, \texttt{updated\_at}, \texttt{last\_message}, \texttt{metadata}.
  \item \texttt{chat\_messages}: \texttt{\_id}, \texttt{session\_id}, \texttt{user\_id}, \texttt{role}, \texttt{content}, \texttt{action}, \texttt{model}, \texttt{created\_at}.
  \item Indexes: \texttt{(user\_id, updated\_at)}, \texttt{(session\_id, created\_at)}.
\end{itemize}

Recommended API endpoints:
\begin{itemize}
  \item \texttt{POST /api/chat/sessions}: create session.
  \item \texttt{GET /api/chat/sessions}: list sessions for user.
  \item \texttt{GET /api/chat/sessions/<id>/messages}: load messages.
  \item \texttt{POST /api/chat}: accept \texttt{session\_id} + message, persist user message, call Gemini, persist assistant reply.
  \item \texttt{DELETE /api/chat/sessions/<id>}: delete a session.
\end{itemize}

\section{Deployment Readiness}

\subsection{Current deployment assets}
\begin{itemize}
  \item Dockerfile installs Python, Node, TinyTeX, MongoDB, app dependencies, builds UI, and runs Flask.
  \item Compose file provides a separate MongoDB service plus app service.
  \item Health endpoints exist: \texttt{/health/live} and \texttt{/health/ready}.
\end{itemize}

\subsection{Deployment blockers}
\begin{itemize}
  \item Use a production WSGI server instead of Flask dev server. Example: \texttt{gunicorn -w 2 -b 0.0.0.0:5055 server:app}.
  \item Dockerfile installs MongoDB inside the app image, while docker-compose also runs MongoDB separately. Choose one model. Recommended: keep MongoDB as a separate service and remove MongoDB from app image.
  \item Pin dependency versions for repeatable builds. Current requirements use broad \texttt{>=} ranges.
  \item Add CI gates: Python syntax/tests, frontend lint, frontend build, Docker build.
  \item Add structured logging and avoid printing sensitive runtime details.
  \item Decide whether generated PDFs are temporary or persisted. The code persists pdf job metadata and stores generated files under runtime volume.
  \item Add cleanup policy for temp PDFs and old job folders.
  \item Review \texttt{.dockerignore}: comments say \texttt{.env} is intentionally included, but Dockerfile does not copy it. Prefer never baking \texttt{.env} into image; pass secrets at runtime only.
\end{itemize}

\section{Security Review}

Priority fixes before public deployment:
\begin{enumerate}
  \item Do not deploy with default \texttt{AUTH\_SECRET}; fail startup if missing in production.
  \item Protect \texttt{/api/chat} and all AI-cost endpoints.
  \item Add rate limiting for login/signup/chat/extraction/PDF/validation.
  \item Fix password change and use only \texttt{password\_hash}.
  \item Use secure cookies or a hardened token strategy.
  \item Validate all backend payloads with Pydantic/JSON Schema before PDF generation.
  \item Add upload/input size limits everywhere, not only email extraction.
  \item Ensure LaTeX escaping is consistent for all nested structures.
\end{enumerate}

\section{Code Quality Scorecard}

\begin{longtable}{|p{0.30\textwidth}|p{0.14\textwidth}|p{0.46\textwidth}|}
\hline
\textbf{Category} & \textbf{Score} & \textbf{Comment} \\
\hline
Architecture & 7/10 & Clear prototype architecture, but backend should be modularized. \\
\hline
Backend reliability & 7/10 & Core flows work. Needs automated tests, rate limits, validation, production server. \\
\hline
Frontend quality & 6/10 & Build passes, UX is rich, but lint errors and type looseness need cleanup. \\
\hline
Security & 5/10 & Basic auth exists; production hardening is pending. \\
\hline
Database design & 6.5/10 & User/docs storage works; chat persistence and migrations/schema discipline are pending. \\
\hline
Deployment readiness & 5.5/10 & Docker assets exist; image/process/runtime need cleanup. \\
\hline
Test coverage & 3/10 & Smoke testing works manually, but formal automated test suite is missing. \\
\hline
Overall & 6/10 & Strong demo/UAT base, not yet production ready. \\
\hline
\end{longtable}

\section{Recommended Work Plan}

\subsection{Phase 1: Stabilize auth and backend health (1--2 days)}
\begin{itemize}
  \item Fix \texttt{/api/me/change-password} password hash bug.
  \item Add \texttt{@require\_auth} to \texttt{/api/chat}.
  \item Add production startup guard for \texttt{AUTH\_SECRET}.
  \item Add basic rate limiting.
  \item Add backend tests for signup, login, me, change password, document CRUD, and protected route failures.
\end{itemize}

\subsection{Phase 2: Connect chatbot to MongoDB (1--2 days)}
\begin{itemize}
  \item Add chat session/message collections and indexes.
  \item Update \texttt{/api/chat} to persist user and assistant messages.
  \item Update frontend to load chat history from backend instead of localStorage.
  \item Add delete/clear conversation support.
\end{itemize}

\subsection{Phase 3: Frontend cleanup (1 day)}
\begin{itemize}
  \item Fix ESLint errors, especially \texttt{any} types and hook warnings.
  \item Replace placeholder terms/forgot password behavior or hide until implemented.
  \item Improve token expiry handling and redirect behavior.
\end{itemize}

\subsection{Phase 4: Deployment hardening (1--2 days)}
\begin{itemize}
  \item Switch Docker entrypoint to Gunicorn.
  \item Remove MongoDB from app image if using docker-compose MongoDB service.
  \item Pin dependencies.
  \item Add cleanup job for old PDFs.
  \item Add CI workflow with lint/build/smoke tests.
\end{itemize}

\subsection{Phase 5: Regression and UAT (1--2 days)}
\begin{itemize}
  \item Run PDF generation smoke tests for FX NDF, IRS, CDS, and Equity TRS.
  \item Run AI extraction on all 10 sample emails and compare expected doc types/critical fields.
  \item Validate generated PDFs using the validation endpoint for representative samples.
  \item Test Docker Compose from clean checkout.
\end{itemize}

\section{Final Recommendation}

You have already completed the hard foundation: frontend, backend, DB connection, Gemini agents, and PDF generation. The remaining work is not a full rebuild; it is stabilization and productionization.

My recommendation: first fix auth and chatbot persistence, then clean frontend lint, then harden Docker/deployment. After these steps, the project can move from working prototype to deployment-ready MVP.

\textbf{Go / No-Go:} For demo or internal review: Go. For public/production deployment: No-Go until the blockers above are fixed.

\end{document}
'''
(report_dir / 'TradeDoc_AI_Audit_Report.tex').write_text(tex)
print(report_dir / 'TradeDoc_AI_Audit_Report.tex')
