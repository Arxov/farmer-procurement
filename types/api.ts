import { BookingStatus, PaymentStatus, GrievanceStatus, UserRole } from './database';

export interface CreateBookingRequest {
  centreId: string;
  commodityId: string;
  date: string;
  slotWindow: string;
  quantity?: string | number;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  actual_weight_quintals?: number | string;
  quality_grade?: string;
  quality_notes?: string;
  accepted_quantity_quintals?: number | string;
}

export interface SuggestSlotResponse {
  suggestion: {
    centreId: string;
    centreName: string;
    district: string;
    date: string;
    slotWindow: string;
    remainingCapacity: number;
    dailyCapacity: number;
  } | null;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}
