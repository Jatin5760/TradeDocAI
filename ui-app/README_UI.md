# TradeDocAI - React UI

A modern, professional React UI for TradeDocAI intelligent trade document processing platform.

## Overview

This is a Next.js 16 application built with React 19, Tailwind CSS, and TypeScript. It provides a comprehensive interface for:

- **Document Upload & Management**: Upload and organize trade documents with real-time processing
- **AI-Powered Extraction**: Automatically extract data from documents using AI
- **Dynamic Forms**: Generate customizable forms based on document schemas
- **PDF Viewing**: View, analyze, and export processed documents
- **User Dashboard**: Google Docs-style interface for managing documents

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 3
- **Language**: TypeScript
- **State Management**: React Context API
- **Storage**: localStorage (demo mode) / Backend integration ready

## Project Structure

```
ui-app/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles & design tokens
│   ├── login/
│   │   └── page.tsx               # Login page (demo: demo@tradedoc.ai / demo123)
│   ├── signup/
│   │   └── page.tsx               # Sign up page
│   ├── dashboard/
│   │   └── page.tsx               # Main dashboard
│   ├── documents/
│   │   ├── page.tsx               # Documents list
│   │   └── [id]/
│   │       └── page.tsx           # Document viewer & PDF preview
│   ├── forms/
│   │   └── page.tsx               # Dynamic form wizard
│   └── settings/
│       └── page.tsx               # Settings page
├── components/
│   ├── Navbar.tsx                 # Navigation component
│   ├── DashboardLayout.tsx        # Dashboard layout wrapper
│   └── DocumentContext.tsx        # Document state management
├── lib/
│   └── formSchemas.ts             # Form schema definitions
└── public/
    └── [static assets]
```

## Features

### 1. Landing Page
- Hero section with compelling CTA
- Features showcase (6 key features)
- How it works section
- Social proof
- Professional fintech design

### 2. Authentication
- **Login Page**: Demo mode login with `demo@tradedoc.ai` / `demo123`
- **Sign Up Page**: Account creation (placeholder for DB integration)
- Protected routes with authentication check

### 3. Dashboard
- Document upload modal with progress tracking
- Recent documents grid view
- Key metrics (total, completed, processing)
- Document cards with status indicators
- Empty state handling

### 4. Documents Management
- Full document list with filtering & search
- Status badges (completed, processing, failed)
- Bulk operations ready
- Delete functionality

### 5. Document Viewer
- PDF preview with zoom controls
- Extracted data tab showing AI results
- Confidence scores for each field
- Export options (PDF, Word, JSON, CSV)
- Document details sidebar

### 6. Dynamic Form Wizard
- 3-step form process: Select Schema → Fill Form → Review → Success
- 3 sample form schemas (FX Trade, Bond Purchase, Invoice)
- Real-time validation
- Responsive design
- Form submission tracking

### 7. Settings Page
- Notification preferences
- Integration settings (API, Automation)
- Storage management
- Account management

## Design System

### Colors
- **Primary**: `#1e40af` (Deep Blue)
- **Accent**: `#059669` (Emerald Green)
- **Background**: `#ffffff`
- **Text**: `#0f1117` (Foreground), `#424856` (Secondary)
- **Borders**: `#e5e7eb`

### Typography
- **Sans Font**: Geist (default system font)
- **Mono Font**: Geist Mono

### Spacing & Layout
- Flexbox-first layout approach
- 4px base unit spacing scale
- Mobile-first responsive design
- 2px border radius on most elements

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The app runs on `http://localhost:3000`

### Test Credentials

```
Email: demo@tradedoc.ai
Password: demo123
```

## Key Components

### Navbar
Navigation bar with logo, menu links, and auth buttons.

### DashboardLayout
Wrapper component providing:
- Sidebar navigation
- Top header bar
- User menu
- Protected route enforcement

### DocumentContext
React Context for managing documents:
- CRUD operations
- localStorage persistence
- Simulated processing

### FormSchemas
Pre-built form templates:
- **FX Trade Confirmation**: Currency pairs, spot rates, settlements
- **Bond Purchase Agreement**: Issuer, coupon rate, maturity
- **Invoice Processing**: General invoice data extraction

## Integration with Backend

The UI is designed to work with the Flask backend at `/server.py`. Key API endpoints to integrate:

```
POST /api/ai/extract       # Extract data from documents
POST /api/forms/validate   # Validate form submissions
POST /api/pdf/generate     # Generate PDFs
POST /api/documents/upload # Upload documents
```

Update API calls in:
- `/components/DocumentContext.tsx` (document operations)
- `/app/forms/page.tsx` (form submissions)
- `/app/documents/[id]/page.tsx` (PDF generation)

## Current Limitations (Demo Mode)

- Authentication uses localStorage (no real auth)
- Documents stored in localStorage (session-based)
- Form submissions don't call actual backend
- PDF viewer shows mock data
- No actual AI processing

## Future Enhancements

1. Connect to Flask backend for real API calls
2. Implement real authentication system
3. Add database integration
4. Real PDF processing library
5. WebSocket for real-time updates
6. File upload to cloud storage
7. Advanced search & filtering
8. Batch document processing
9. API key management
10. Usage analytics dashboard

## Styling

All colors use CSS custom properties defined in `globals.css`:

```css
--primary: #1e40af
--accent: #059669
--background: #ffffff
--foreground: #0f1117
--border: #e5e7eb
```

Use Tailwind's color system with these tokens:
```jsx
<button className="bg-primary text-white">Login</button>
<div className="border-border">Content</div>
```

## Performance

- Uses Next.js server-side rendering where appropriate
- CSS-in-JS optimized with Tailwind
- Images lazy-loaded
- Code splitting per route
- Smooth animations (200ms transitions)

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Color contrast compliant
- Focus states on interactive elements

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Development Notes

### Adding New Pages

1. Create file in `app/[section]/page.tsx`
2. Use `DashboardLayout` for admin pages
3. Use custom layout for public pages
4. Import shared components

### Adding New Features

1. Create components in `components/` folder
2. Use `DocumentContext` for state management
3. Follow existing patterns for forms and validation
4. Use Tailwind for styling

### Debugging

Check the browser console for any errors. The app uses simple validation and error handling. For production, add proper error boundaries and logging.

## Deployment

This app is ready to deploy to Vercel:

```bash
# Push to GitHub
git push origin main

# Vercel will automatically deploy on push
```

Environment variables (if needed):
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_NAME` - App display name

## Support

For issues or questions about the UI, check:
1. The generated components
2. Tailwind documentation: tailwindcss.com
3. Next.js documentation: nextjs.org
4. React documentation: react.dev

---

**Built with v0** - Modern React UI for TradeDocAI
