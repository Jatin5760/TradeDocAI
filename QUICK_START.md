# TradeDocAI UI - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Prerequisites
- Node.js 18+ and npm
- A modern web browser

### Step 1: Start the Dev Server

```bash
cd /vercel/share/v0-project/ui-app
npm run dev
```

The app will be available at `http://localhost:3000`

### Step 2: Login with Demo Account

Visit `http://localhost:3000/login` and use:

```
Email: demo@tradedoc.ai
Password: demo123
```

Or click "Auto-fill Demo Credentials" button for convenience.

### Step 3: Explore Features

**Dashboard** (`/dashboard`)
- View metrics
- Upload test documents
- See document processing

**Forms** (`/forms`)
- Select a form template
- Fill out sample data
- Submit and review

**Documents** (`/documents`)
- Browse all documents
- Search and filter
- View details

**Settings** (`/settings`)
- Configure notifications
- Manage integrations
- Check storage

## 📁 Project Layout

```
ui-app/
├── app/                    - Page components
├── components/             - Reusable components
├── lib/                    - Utilities & schemas
├── public/                 - Static files
└── package.json           - Dependencies
```

## 🎨 Design Highlights

- **Colors**: Deep blue (#1e40af) & emerald (#059669)
- **Animations**: Smooth 200ms transitions
- **Layout**: Responsive, mobile-first
- **Fonts**: Geist (clean, modern)

## 🔧 Common Tasks

### Upload a Test Document
1. Go to Dashboard
2. Click "Upload Document"
3. Select any file
4. Document appears in "Recent Documents"

### Create a Form
1. Go to Forms
2. Select "FX Trade Confirmation"
3. Fill in the required fields
4. Click "Review & Submit"
5. Confirm and submit

### View Extracted Data
1. Go to Documents list
2. Click "View" on any document
3. Switch to "Extracted Data" tab
4. See AI extraction results with confidence scores

### Export a Document
1. Open any document
2. Click "Export" button
3. Choose format (PDF, Word, JSON, CSV)
4. File downloads automatically

## 🔐 Authentication

Currently using **demo mode** (localStorage):
- Demo email: `demo@tradedoc.ai`
- Demo password: `demo123`

Ready to connect to real backend - see `API_INTEGRATION_GUIDE.md`

## 📝 Form Templates Available

1. **FX Trade Confirmation**
   - Trade date, currency pair, spot rate
   - Notional amount, settlement date
   - Counterparty & broker info

2. **Bond Purchase Agreement**
   - Issuer, bond type, coupon rate
   - Maturity date, principal amount
   - Credit rating

3. **Invoice Processing**
   - Invoice number & date
   - Vendor information
   - Amount & payment terms

## 🛠️ Building & Deployment

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code quality
```

### Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Initial UI build"
git push origin main

# Vercel automatically deploys on push
```

## 📊 Mock Data

The app includes realistic mock data:
- Document list with different statuses
- Extracted data with confidence scores
- Form validation examples
- Processing progress simulation

## 🔗 API Integration

To connect the real backend:

1. Update API URLs in `/lib/` files
2. Replace `fetch()` calls with actual endpoints
3. Handle authentication tokens
4. Add error boundaries

See `API_INTEGRATION_GUIDE.md` for detailed instructions.

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
# On macOS/Linux
lsof -i :3000
kill -9 <PID>

# Or use a different port
npm run dev -- -p 3001
```

### Styles Not Loading
```bash
# Clear Tailwind cache
rm -rf .next
npm run dev
```

### localStorage Not Working
- Check browser privacy settings
- Disable extensions that block storage
- Try a different browser

## 💡 Tips

1. **Mobile Testing**: Open DevTools and toggle device toolbar
2. **Form Validation**: Leave fields empty to see error states
3. **Document Upload**: Any file type works in demo mode
4. **Export**: All formats return success alerts in demo
5. **Dark Mode**: Not yet implemented (white theme only)

## 🌐 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## 📚 Documentation

- `README_UI.md` - Complete project documentation
- `UI_BUILD_SUMMARY.md` - Build overview and features
- `API_INTEGRATION_GUIDE.md` - Backend integration details

## 🎯 Next Steps

1. ✅ Explore all UI features
2. ⏭️ Read API_INTEGRATION_GUIDE.md
3. ⏭️ Connect Flask backend
4. ⏭️ Set up real authentication
5. ⏭️ Implement database storage

## 📧 Need Help?

- Check browser console for errors (F12)
- Review component source code
- Check Tailwind docs: tailwindcss.com
- Check Next.js docs: nextjs.org

## 🎉 You're All Set!

Your TradeDocAI UI is running and ready to explore. Start at the landing page or jump straight to the dashboard with the demo account.

Happy building! 🚀

---

**App URL**: http://localhost:3000
**Demo Email**: demo@tradedoc.ai
**Demo Password**: demo123
