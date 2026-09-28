export interface Listing {
  id: string;
  landlord_id: string;
  title: string;
  address: string;
  city?: string;
  price: number;
  monthly_rent?: number;
  total_rooms?: number;
  available_rooms: number;
  contact_info: string;
  availability_status: "available" | "almost_full" | "fully_occupied" | string;
  images?: string[];
  cover_image?: string;
  property_type?: string;
  occupancy_type?: string;
  allowed_gender?: string;
  utilities?: string[];
  room_features?: string[];
  bathroom_features?: string[];
  kitchen_features?: string[];
  laundry_features?: string[];
  safety_features?: string[];
  description?: string;
  house_rules?: string;
  created_at: string;
  updated_at: string;
}
