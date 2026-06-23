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
          ticket_colours: string | null;
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
          ticket_colours?: string | null;
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
          order_reference: string;
          ticket_email_status: "pending" | "sent" | "failed" | "skipped";
          ticket_email_sent_at: string | null;
          ticket_email_failed_at: string | null;
          ticket_email_error: string | null;
          reserved_until: string | null;
          reservation_released_at: string | null;
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
          order_reference: string;
          ticket_email_status?: "pending" | "sent" | "failed" | "skipped";
          ticket_email_sent_at?: string | null;
          ticket_email_failed_at?: string | null;
          ticket_email_error?: string | null;
          reserved_until?: string | null;
          reservation_released_at?: string | null;
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
      ticketing_ticket_email_secrets: {
        Row: {
          ticket_id: string;
          order_id: string;
          ticket_secret_version: number;
          ticket_secret_algorithm: "aes-256-gcm";
          ticket_secret_iv: string;
          ticket_secret_ciphertext: string;
          ticket_secret_auth_tag: string;
          created_at: string;
        };
        Insert: {
          ticket_id: string;
          order_id: string;
          ticket_secret_version: number;
          ticket_secret_algorithm: "aes-256-gcm";
          ticket_secret_iv: string;
          ticket_secret_ciphertext: string;
          ticket_secret_auth_tag: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ticketing_ticket_email_secrets"]["Insert"]
        >;
      };
      admin_users: {
        Row: {
          user_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
      };
      site_gallery_images: {
        Row: {
          id: string;
          slot: number;
          image_url: string;
          alt: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slot: number;
          image_url: string;
          alt?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["site_gallery_images"]["Insert"]
        >;
      };
      lineup_artists: {
        Row: {
          id: string;
          event_id: string;
          slot: number;
          name: string;
          soundcloud_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          slot: number;
          name: string;
          soundcloud_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lineup_artists"]["Insert"]
        >;
      };
      support_threads: {
        Row: {
          id: string;
          reference_number: number;
          customer_email: string;
          customer_name: string | null;
          subject: string;
          status: "new" | "needs_reply" | "resolved";
          source: "contact_form";
          last_message_at: string;
          closed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reference_number?: number;
          customer_email: string;
          customer_name?: string | null;
          subject: string;
          status?: "new" | "needs_reply" | "resolved";
          source?: "contact_form";
          last_message_at?: string;
          closed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["support_threads"]["Insert"]
        >;
      };
      support_messages: {
        Row: {
          id: string;
          thread_id: string;
          direction: "inbound" | "outbound" | "note";
          author_email: string | null;
          author_name: string | null;
          subject: string | null;
          body_text: string;
          body_html: string | null;
          provider: string | null;
          provider_message_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          direction: "inbound" | "outbound" | "note";
          author_email?: string | null;
          author_name?: string | null;
          subject?: string | null;
          body_text: string;
          body_html?: string | null;
          provider?: string | null;
          provider_message_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["support_messages"]["Insert"]
        >;
      };
    };
    Functions: {
      ticketing_cancel_checkout_reservation: {
        Args: {
          p_order_id?: string | null;
          p_stripe_checkout_session_id?: string | null;
          p_reason?: string | null;
        };
        Returns: {
          order_id: string;
          stripe_checkout_session_id: string | null;
        }[];
      };
      ticketing_cancel_expired_reservations: {
        Args: {
          p_now?: string;
          p_limit?: number;
        };
        Returns: {
          order_id: string;
          stripe_checkout_session_id: string | null;
        }[];
      };
      ticketing_create_checkout_reservation: {
        Args: {
          p_event_id: string;
          p_order_reference: string;
          p_items: Json;
          p_reservation_minutes?: number;
        };
        Returns: {
          order_id: string;
          order_reference: string;
          amount_total_cents: number;
          currency: string;
          reserved_until: string;
          line_items: Json;
        }[];
      };
      ticketing_fulfill_checkout_session: {
        Args: {
          p_webhook_event_id: string;
          p_webhook_event_type: string;
          p_order_id: string;
          p_stripe_checkout_session_id: string;
          p_stripe_payment_intent_id: string | null;
          p_payment_status: string;
          p_amount_total_cents: number | null;
          p_currency: string | null;
          p_buyer_email: string | null;
          p_buyer_name: string | null;
          p_tickets: Json;
        };
        Returns: {
          processed: boolean;
          duplicate: boolean;
          capacity_exceeded: boolean;
          failure_reason: string | null;
          order_id: string | null;
          event_id: string | null;
          event_name: string | null;
          venue: string | null;
          venue_address: string | null;
          starts_at: string | null;
          ends_at: string | null;
          order_reference: string | null;
          order_total_cents: number | null;
          order_currency: string | null;
          ticket_email_status: "pending" | "sent" | "failed" | "skipped" | null;
          tickets: Json;
        }[];
      };
      ticketing_fulfill_payment_intent: {
        Args: {
          p_webhook_event_id: string;
          p_webhook_event_type: string;
          p_order_id: string;
          p_stripe_payment_intent_id: string;
          p_payment_status: string;
          p_amount_total_cents: number | null;
          p_currency: string | null;
          p_buyer_email: string | null;
          p_buyer_name: string | null;
          p_tickets: Json;
        };
        Returns: {
          processed: boolean;
          duplicate: boolean;
          capacity_exceeded: boolean;
          failure_reason: string | null;
          order_id: string | null;
          event_id: string | null;
          event_name: string | null;
          venue: string | null;
          venue_address: string | null;
          starts_at: string | null;
          ends_at: string | null;
          order_reference: string | null;
          order_total_cents: number | null;
          order_currency: string | null;
          ticket_email_status: "pending" | "sent" | "failed" | "skipped" | null;
          tickets: Json;
        }[];
      };
      ticketing_mark_ticket_email_delivery: {
        Args: {
          p_order_id: string;
          p_status: "sent" | "failed" | "skipped";
          p_error?: string | null;
        };
        Returns: undefined;
      };
      ticketing_publish_current_event: {
        Args: {
          p_event_id: string;
          p_archive_previous?: boolean;
        };
        Returns: Database["public"]["Tables"]["ticketing_events"]["Row"];
      };
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
          ticket_number: string | null;
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
