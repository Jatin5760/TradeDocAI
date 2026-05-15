export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'radio';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface FormSchema {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSubmission {
  id: string;
  schemaId: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

// Sample form schemas based on trade document types
export const SAMPLE_SCHEMAS: FormSchema[] = [
  {
    id: 'fx-trade-confirmation',
    name: 'FX Trade Confirmation',
    description: 'Form for foreign exchange trade confirmations',
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {
        id: 'trade-date',
        name: 'tradeDate',
        label: 'Trade Date',
        type: 'date',
        required: true,
      },
      {
        id: 'currency-pair',
        name: 'currencyPair',
        label: 'Currency Pair',
        type: 'select',
        required: true,
        options: [
          { label: 'EUR/USD', value: 'EURUSD' },
          { label: 'GBP/USD', value: 'GBPUSD' },
          { label: 'USD/JPY', value: 'USDJPY' },
          { label: 'AUD/USD', value: 'AUDUSD' },
          { label: 'USD/CAD', value: 'USDCAD' },
        ],
      },
      {
        id: 'spot-rate',
        name: 'spotRate',
        label: 'Spot Rate',
        type: 'number',
        required: true,
        placeholder: '1.0850',
      },
      {
        id: 'notional-amount',
        name: 'notionalAmount',
        label: 'Notional Amount (USD)',
        type: 'number',
        required: true,
        placeholder: '1000000',
      },
      {
        id: 'settlement-date',
        name: 'settlementDate',
        label: 'Settlement Date',
        type: 'date',
        required: true,
      },
      {
        id: 'counterparty',
        name: 'counterparty',
        label: 'Counterparty',
        type: 'text',
        required: true,
        placeholder: 'Enter counterparty name',
      },
      {
        id: 'broker',
        name: 'broker',
        label: 'Broker (Optional)',
        type: 'text',
        required: false,
        placeholder: 'Enter broker name',
      },
      {
        id: 'confirmed',
        name: 'confirmed',
        label: 'Confirm Trade Details',
        type: 'checkbox',
        required: true,
      },
    ],
  },
  {
    id: 'bond-purchase-agreement',
    name: 'Bond Purchase Agreement',
    description: 'Form for bond purchase agreements',
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {
        id: 'bond-issuer',
        name: 'bondIssuer',
        label: 'Bond Issuer',
        type: 'text',
        required: true,
        placeholder: 'Company or Government name',
      },
      {
        id: 'bond-type',
        name: 'bondType',
        label: 'Bond Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Government', value: 'government' },
          { label: 'Corporate', value: 'corporate' },
          { label: 'Municipal', value: 'municipal' },
          { label: 'High Yield', value: 'high-yield' },
        ],
      },
      {
        id: 'coupon-rate',
        name: 'couponRate',
        label: 'Coupon Rate (%)',
        type: 'number',
        required: true,
        placeholder: '2.5',
      },
      {
        id: 'maturity-date',
        name: 'maturityDate',
        label: 'Maturity Date',
        type: 'date',
        required: true,
      },
      {
        id: 'principal-amount',
        name: 'principalAmount',
        label: 'Principal Amount (USD)',
        type: 'number',
        required: true,
        placeholder: '100000',
      },
      {
        id: 'purchase-price',
        name: 'purchasePrice',
        label: 'Purchase Price',
        type: 'number',
        required: true,
        placeholder: '99.50',
      },
      {
        id: 'settlement-date-bond',
        name: 'settlementDate',
        label: 'Settlement Date',
        type: 'date',
        required: true,
      },
      {
        id: 'credit-rating',
        name: 'creditRating',
        label: 'Credit Rating',
        type: 'select',
        required: false,
        options: [
          { label: 'AAA', value: 'AAA' },
          { label: 'AA', value: 'AA' },
          { label: 'A', value: 'A' },
          { label: 'BBB', value: 'BBB' },
          { label: 'BB', value: 'BB' },
          { label: 'B', value: 'B' },
        ],
      },
    ],
  },
  {
    id: 'invoice-processing',
    name: 'Invoice Processing',
    description: 'General invoice data extraction form',
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {
        id: 'invoice-number',
        name: 'invoiceNumber',
        label: 'Invoice Number',
        type: 'text',
        required: true,
        placeholder: 'INV-2024-001',
      },
      {
        id: 'invoice-date',
        name: 'invoiceDate',
        label: 'Invoice Date',
        type: 'date',
        required: true,
      },
      {
        id: 'vendor-name',
        name: 'vendorName',
        label: 'Vendor Name',
        type: 'text',
        required: true,
        placeholder: 'Vendor Company Name',
      },
      {
        id: 'vendor-email',
        name: 'vendorEmail',
        label: 'Vendor Email',
        type: 'email',
        required: false,
      },
      {
        id: 'invoice-amount',
        name: 'invoiceAmount',
        label: 'Invoice Amount (USD)',
        type: 'number',
        required: true,
        placeholder: '5000',
      },
      {
        id: 'due-date',
        name: 'dueDate',
        label: 'Due Date',
        type: 'date',
        required: true,
      },
      {
        id: 'payment-terms',
        name: 'paymentTerms',
        label: 'Payment Terms',
        type: 'select',
        required: true,
        options: [
          { label: 'Net 15', value: 'net-15' },
          { label: 'Net 30', value: 'net-30' },
          { label: 'Net 60', value: 'net-60' },
          { label: 'Net 90', value: 'net-90' },
        ],
      },
      {
        id: 'po-number',
        name: 'poNumber',
        label: 'PO Number (Optional)',
        type: 'text',
        required: false,
        placeholder: 'PO-2024-001',
      },
      {
        id: 'notes',
        name: 'notes',
        label: 'Additional Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Enter any additional notes',
      },
    ],
  },
];

// Get schema by ID
export function getSchemaById(id: string): FormSchema | undefined {
  return SAMPLE_SCHEMAS.find(schema => schema.id === id);
}

// Get all available schemas
export function getAllSchemas(): FormSchema[] {
  return SAMPLE_SCHEMAS;
}

// Validate form submission
export function validateSubmission(
  schema: FormSchema,
  data: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  schema.fields.forEach(field => {
    const value = data[field.name];

    // Check required fields
    if (field.required && (!value || value === '')) {
      errors[field.name] = `${field.label} is required`;
      return;
    }

    if (!value) return;

    // Validate based on type
    switch (field.type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          errors[field.name] = 'Invalid email address';
        }
        break;
      case 'number':
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
          errors[field.name] = 'Must be a number';
        }
        if (field.validation?.min !== undefined && numericValue < field.validation.min) {
          errors[field.name] = `Must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && numericValue > field.validation.max) {
          errors[field.name] = `Must be no more than ${field.validation.max}`;
        }
        break;
      case 'text':
      case 'textarea':
        if (field.validation?.minLength && String(value).length < field.validation.minLength) {
          errors[field.name] = `Minimum ${field.validation.minLength} characters`;
        }
        if (field.validation?.maxLength && String(value).length > field.validation.maxLength) {
          errors[field.name] = `Maximum ${field.validation.maxLength} characters`;
        }
        break;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
