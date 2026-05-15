# TradeDocAI - API Integration Guide

This guide explains how to connect the React UI to the Flask backend server.

## Current Setup

- **UI Server**: Next.js on localhost:3000
- **Backend Server**: Flask on localhost:5001 (from `/server.py`)
- **Communication**: HTTP REST APIs

## Integration Points

### 1. Document Upload

**Location**: `/components/DocumentContext.tsx`

**Current Implementation** (Mock):
```typescript
const addDocument = (name: string, type: string, size: number) => {
  // Creates local document object
  // Simulates processing with setTimeout
}
```

**Backend Integration**:
```typescript
const addDocument = async (name: string, type: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', type);

  try {
    const response = await fetch('http://localhost:5001/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    const newDoc: Document = {
      id: data.document_id,
      name: name,
      type: type,
      size: file.size,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'processing',
      progress: 0,
    };
    
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    saveDocuments(updated);

    // Poll for processing status
    pollDocumentStatus(data.document_id);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### 2. AI Data Extraction

**Location**: `/app/documents/[id]/page.tsx`

**Current Implementation** (Mock):
```typescript
const mockExtractedData = {
  documentType: 'FX Trade Confirmation',
  tradeDate: '2024-04-29',
  // ... hardcoded fields
};
```

**Backend Integration**:
```typescript
useEffect(() => {
  fetchExtractedData();
}, [docId]);

const fetchExtractedData = async () => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/ai/extract?document_id=${docId}`
    );
    const data = await response.json();
    setExtractedData({
      documentType: data.document_type,
      tradeDate: data.trade_date,
      spotRate: data.spot_rate,
      // ... map other fields
      extractedFields: data.extracted_fields.map((field: any) => ({
        label: field.field_name,
        value: field.value,
        confidence: field.confidence,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch extracted data:', error);
  }
};
```

### 3. Form Validation

**Location**: `/app/forms/page.tsx`

**Current Implementation** (Mock):
```typescript
const validateForm = () => {
  // Client-side only validation
  const newErrors: Record<string, string> = {};
  // ... validation logic
};
```

**Backend Integration**:
```typescript
const validateForm = async () => {
  const newErrors: Record<string, string> = {};

  try {
    const response = await fetch(
      'http://localhost:5001/api/forms/validate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema_id: selectedSchema?.id,
          data: formData,
        }),
      }
    );

    const result = await response.json();
    
    if (result.valid) {
      return true;
    } else {
      setErrors(result.errors);
      return false;
    }
  } catch (error) {
    console.error('Validation failed:', error);
    return false;
  }
};
```

### 4. Form Submission

**Location**: `/app/forms/page.tsx`

**Current Implementation** (Mock):
```typescript
const handleSubmit = () => {
  const submission = {
    id: Date.now().toString(),
    schemaId: selectedSchema?.id,
    data: formData,
    createdAt: new Date(),
  };
  localStorage.setItem('formSubmissions', JSON.stringify([...]));
  setStep('success');
};
```

**Backend Integration**:
```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch(
      'http://localhost:5001/api/forms/submit',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema_id: selectedSchema?.id,
          data: formData,
          user_id: user?.id,
        }),
      }
    );

    const result = await response.json();
    
    if (result.success) {
      setStep('success');
      // Optionally refresh documents list
      await documents.refresh();
    } else {
      setError(result.error || 'Submission failed');
    }
  } catch (error) {
    console.error('Submission failed:', error);
    setError('Network error. Please try again.');
  }
};
```

### 5. PDF Generation

**Location**: `/app/documents/[id]/page.tsx`

**Current Implementation** (Mock):
```typescript
// Shows export buttons that alert() when clicked
<button onClick={() => alert(`Exporting as ${format}...`)}>
```

**Backend Integration**:
```typescript
const handleExport = async (format: 'pdf' | 'docx' | 'json' | 'csv') => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/documents/${docId}/export`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      }
    );

    // Get the file blob
    const blob = await response.blob();
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.name}.${getExtension(format)}`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
  }
};

function getExtension(format: string): string {
  const ext: Record<string, string> = {
    pdf: 'pdf',
    docx: 'docx',
    json: 'json',
    csv: 'csv',
  };
  return ext[format] || 'txt';
}
```

### 6. Authentication (Login/Signup)

**Location**: `/app/login/page.tsx` and `/app/signup/page.tsx`

**Current Implementation** (Mock):
```typescript
const handleLogin = async (e: React.FormEvent) => {
  // Demo: checks for demo@tradedoc.ai / demo123
  if (email === 'demo@tradedoc.ai' && password === 'demo123') {
    localStorage.setItem('user', JSON.stringify({...}));
    router.push('/dashboard');
  }
};
```

**Backend Integration**:
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    const response = await fetch(
      'http://localhost:5001/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (response.ok && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('isAuthenticated', 'true');
      router.push('/dashboard');
    } else {
      setError(data.error || 'Login failed');
    }
  } catch (error) {
    setError('Network error. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

## Environment Variables

Create a `.env.local` file in the ui-app folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_APP_NAME=TradeDocAI
```

Then use in code:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
```

## API Request Interceptor (Optional)

Create `/lib/apiClient.ts`:

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  const url = `${apiUrl}${endpoint}`;

  const token = localStorage.getItem('authToken');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

Usage:
```typescript
const result = await apiCall<ExtractedData>(
  `/api/ai/extract?document_id=${docId}`
);

if (result.success && result.data) {
  setExtractedData(result.data);
}
```

## Backend API Endpoints Expected

Based on the Flask server structure, ensure these endpoints exist:

```
POST   /api/auth/login               - User login
POST   /api/auth/register            - User registration
POST   /api/auth/logout              - User logout

POST   /api/documents/upload         - Upload document
GET    /api/documents                - List documents
GET    /api/documents/{id}           - Get document details
DELETE /api/documents/{id}           - Delete document
POST   /api/documents/{id}/export    - Export document

POST   /api/ai/extract               - Extract data from document
POST   /api/ai/process               - Process document

POST   /api/forms/schemas            - Get available form schemas
POST   /api/forms/validate           - Validate form submission
POST   /api/forms/submit             - Submit form
GET    /api/forms/submissions        - Get form submissions

POST   /api/pdf/generate             - Generate PDF
POST   /api/word/generate            - Generate Word document
```

## Testing the Integration

### 1. Test Document Upload
```javascript
// In browser console
const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
// Simulate document context
```

### 2. Test API Endpoint
```bash
curl -X POST http://localhost:5001/api/ai/extract \
  -H "Content-Type: application/json" \
  -d '{"document_id": "123"}'
```

### 3. Enable CORS (if needed)

Add to Flask server:
```python
from flask_cors import CORS
CORS(app)
```

## Common Integration Issues

### 1. CORS Error
**Problem**: "Access to XMLHttpRequest blocked by CORS policy"

**Solution**: Add CORS headers to Flask:
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])
```

### 2. 404 Endpoints
**Problem**: Endpoints return 404

**Solution**: Verify Flask routes match API paths in UI code

### 3. Auth Token Expired
**Problem**: API calls return 401 Unauthorized

**Solution**: Implement token refresh:
```typescript
if (response.status === 401) {
  // Try to refresh token
  const refreshed = await refreshAuthToken();
  if (refreshed) {
    // Retry original request
  } else {
    // Redirect to login
  }
}
```

## Performance Optimization

### 1. Request Debouncing
```typescript
import { useCallback, useRef } from 'react';

const debouncedSearch = useCallback(
  debounce(async (query: string) => {
    const result = await apiCall(`/api/documents?search=${query}`);
  }, 300),
  []
);
```

### 2. Request Caching
Use SWR for data fetching:
```typescript
import useSWR from 'swr';

const { data, error, isLoading } = useSWR(
  `/api/documents/${id}`,
  fetcher
);
```

### 3. Batch Operations
Combine multiple requests into one:
```typescript
const batchRequest = await apiCall('/api/batch', {
  method: 'POST',
  body: JSON.stringify({
    requests: [
      { endpoint: '/documents/1' },
      { endpoint: '/documents/2' },
    ],
  }),
});
```

## Security Considerations

1. **Store tokens securely**: Use httpOnly cookies when possible
2. **Validate input**: Sanitize all user inputs before sending to backend
3. **Handle errors gracefully**: Don't expose sensitive info in error messages
4. **Implement rate limiting**: Prevent brute force attacks
5. **Use HTTPS in production**: Never use HTTP for sensitive data

## Next Steps

1. Set up CORS in Flask backend
2. Implement user authentication endpoints
3. Test document upload endpoint
4. Connect AI extraction API
5. Implement form validation endpoints
6. Add PDF generation
7. Set up real database

For detailed Flask backend structure, see `/server.py`
