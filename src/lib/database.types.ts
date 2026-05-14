export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ticketing_events: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          venue: string;
          starts_at: string;
          ends_at: string | null;
          hero_image_url: string | null;
          is_current: boolean;
          is_free: boolean;
          status: "draft" | "published" | "archived";
          created_at: string;
          venue_address: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          venue: string;
          starts_at: string;
          ends_at?: string | null;
          hero_image_url?: string | null;
          is_current?: boolean;
          is_free?: boolean;
          status?: "draft" | "published" | "archived";
          created_at?: string;
          venue_address?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_events"]["Insert"]
        >;
      };
      ticketing_ticket_types: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string | null;
          stripe_price_id: string | null;
          price_cents: number;
          currency: string;
          capacity: number;
          sales_start_at: string | null;
          sales_end_at: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          description?: string | null;
          stripe_price_id?: string | null;
          price_cents: number;
          currency?: string;
          capacity: number;
          sales_start_at?: string | null;
          sales_end_at?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_ticket_types"]["Insert"]
        >;
      };
      ticketing_orders: {
        Row: {
          id: string;
          event_id: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          buyer_email: string | null;
          buyer_name: string | null;
          amount_total_cents: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          buyer_email?: string | null;
          buyer_name?: string | null;
          amount_total_cents?: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded" | "cancelled";
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_orders"]["Insert"]
        >;
      };
      ticketing_order_items: {
        Row: {
          id: string;
          order_id: string;
          ticket_type_id: string;
          quantity: number;
          unit_amount_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          ticket_type_id: string;
          quantity: number;
          unit_amount_cents: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_order_items"]["Insert"]
        >;
      };
      ticketing_tickets: {
        Row: {
          id: string;
          order_id: string;
          ticket_type_id: string;
          event_id: string;
          ticket_code: string;
          ticket_number: string;
          secret_hash: string;
          attendee_email: string | null;
          attendee_name: string | null;
          status: "valid" | "redeemed" | "refunded" | "cancelled";
          redeemed_at: string | null;
          redeemed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          ticket_type_id: string;
          event_id: string;
          ticket_code?: string;
          ticket_number?: string;
          secret_hash: string;
          attendee_email?: string | null;
          attendee_name?: string | null;
          status?: "valid" | "redeemed" | "refunded" | "cancelled";
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_tickets"]["Insert"]
        >;
      };
      ticketing_checkins: {
        Row: {
          id: string;
          ticket_id: string | null;
          event_id: string | null;
          result: string;
          scanned_by: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id?: string | null;
          event_id?: string | null;
          result: string;
          scanned_by?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_checkins"]["Insert"]
        >;
      };
      ticketing_webhook_events: {
        Row: {
          id: string;
          type: string;
          received_at: string;
        };
        Insert: {
          id: string;
          type: string;
          received_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_webhook_events"]["Insert"]
        >;
      };
    };
    Functions: {
      ticketing_redeem_ticket: {
        Args: {
          p_ticket_code: string;
          p_secret_hash: string;
          p_event_id?: string | null;
          p_scanned_by?: string | null;
        };
        Returns: {
          result: string;
          ticket_id: string | null;
          event_id: string | null;
          ticket_type_id: string | null;
          attendee_email: string | null;
          redeemed_at: string | null;
        }[];
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
