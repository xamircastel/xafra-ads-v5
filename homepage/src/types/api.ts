// API Types and Interfaces for Backend Integration

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'affiliate' | 'advertiser';
  createdAt: string;
  isActive: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  category: 'mobile-mvas' | 'videos' | 'games' | 'real-estate' | 'entertainment';
  status: 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  conversions: number;
  clicks: number;
  impressions: number;
  createdAt: string;
  endDate?: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  type: 'direct' | 'indirect';
  payout: number;
  currency: 'USD' | 'PEN' | 'COP' | 'MXN';
  countries: string[];
  category: string;
  isActive: boolean;
  requirements: string[];
  trackingUrl: string;
}

export interface Payment {
  id: string;
  affiliateId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: 'bank_transfer' | 'paypal' | 'crypto';
  createdAt: string;
  processedAt?: string;
}

export interface Analytics {
  period: 'daily' | 'weekly' | 'monthly';
  data: {
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }[];
}

export interface Country {
  code: string;
  name: string;
  isActive: boolean;
  campaigns: number;
  revenue: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Endpoints Documentation
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: 'POST /api/auth/login',
    REGISTER: 'POST /api/auth/register',
    LOGOUT: 'POST /api/auth/logout',
    REFRESH: 'POST /api/auth/refresh',
    PROFILE: 'GET /api/auth/profile'
  },
  
  // Campaigns
  CAMPAIGNS: {
    LIST: 'GET /api/campaigns',
    CREATE: 'POST /api/campaigns',
    GET: 'GET /api/campaigns/:id',
    UPDATE: 'PUT /api/campaigns/:id',
    DELETE: 'DELETE /api/campaigns/:id',
    ANALYTICS: 'GET /api/campaigns/:id/analytics'
  },
  
  // Offers
  OFFERS: {
    LIST: 'GET /api/offers',
    CREATE: 'POST /api/offers',
    GET: 'GET /api/offers/:id',
    UPDATE: 'PUT /api/offers/:id',
    DELETE: 'DELETE /api/offers/:id',
    BY_CATEGORY: 'GET /api/offers/category/:category'
  },
  
  // Payments
  PAYMENTS: {
    LIST: 'GET /api/payments',
    CREATE: 'POST /api/payments',
    GET: 'GET /api/payments/:id',
    UPDATE_STATUS: 'PUT /api/payments/:id/status'
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: 'GET /api/analytics/dashboard',
    CAMPAIGNS: 'GET /api/analytics/campaigns',
    COUNTRIES: 'GET /api/analytics/countries',
    REVENUE: 'GET /api/analytics/revenue'
  },
  
  // Countries
  COUNTRIES: {
    LIST: 'GET /api/countries',
    STATS: 'GET /api/countries/stats'
  },
  
  // Contact
  CONTACT: {
    SEND_MESSAGE: 'POST /api/contact/message',
    GET_MESSAGES: 'GET /api/contact/messages'
  }
} as const;