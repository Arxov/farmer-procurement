export type UserRole = 'farmer' | 'officer' | 'admin';

export type BookingStatus =
  | 'booked'
  | 'checked_in'
  | 'weighed'
  | 'quality_checked'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'initiated' | 'paid' | 'failed';

export type GrievanceStatus = 'open' | 'in_review' | 'resolved';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  land_holding_acres: number | null;
  village: string | null;
  created_at?: string;
}

export interface Centre {
  id: string;
  name: string;
  district: string | null;
  state: string | null;
  daily_capacity: number;
  created_at?: string;
}

export interface Commodity {
  id: string;
  name: string;
  msp_rate_per_quintal: number;
  season: string | null;
  created_at?: string;
}

export interface Booking {
  id: string;
  farmer_id: string;
  centre_id: string;
  commodity_id: string;
  slot_date: string;
  slot_window: string;
  expected_quantity_quintals: number | null;
  actual_weight_quintals: number | null;
  quality_grade: string | null;
  quality_notes: string | null;
  accepted_quantity_quintals: number | null;
  status: BookingStatus;
  created_at?: string;
  profiles?: Profile;
  centres?: Centre;
  commodities?: Commodity;
}

export interface QueueEntry {
  id: string;
  booking_id: string;
  check_in_time: string | null;
  queue_position: number | null;
  estimated_wait_minutes: number | null;
  served_at: string | null;
  created_at?: string;
}

export interface GatePass {
  id: string;
  booking_id: string;
  vehicle_number: string | null;
  qr_code: string | null;
  issued_at?: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  accepted_quantity_quintals: number | null;
  amount: number | null;
  utr_reference: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  bookings?: Booking;
}

export interface Grievance {
  id: string;
  booking_id: string;
  issue_type: string | null;
  description: string | null;
  status: GrievanceStatus;
  created_at?: string;
  bookings?: Booking;
}
