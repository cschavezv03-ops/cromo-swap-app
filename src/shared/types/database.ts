export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      auction_bids: {
        Row: {
          amount: number;
          bidder_id: string;
          created_at: string;
          id: string;
          listing_id: string;
        };
        Insert: {
          amount: number;
          bidder_id: string;
          created_at?: string;
          id?: string;
          listing_id: string;
        };
        Update: {
          amount?: number;
          bidder_id?: string;
          created_at?: string;
          id?: string;
          listing_id?: string;
        };
      };
      blocks: {
        Row: { blocked_id: string; blocker_id: string; created_at: string; id: string };
        Insert: { blocked_id: string; blocker_id: string; created_at?: string; id?: string };
        Update: { blocked_id?: string; blocker_id?: string; created_at?: string; id?: string };
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: string;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: string;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['friendships']['Row']>;
      };
      catalog_cromos: {
        Row: {
          catalog_version: number;
          country_code: string | null;
          created_at: string;
          display_name: string;
          group_code: string | null;
          id: string;
          is_active: boolean;
          is_special: boolean;
          jersey: number | null;
          page_number: number | null;
          player_name: string | null;
          position: string | null;
          printed_code: string | null;
          rarity_id: string;
          section_code: string;
          section_number: number;
          sticker_type: string;
        };
        Insert: Partial<Database['public']['Tables']['catalog_cromos']['Row']> & {
          display_name: string;
          rarity_id: string;
          section_code: string;
          section_number: number;
        };
        Update: Partial<Database['public']['Tables']['catalog_cromos']['Row']>;
      };
      countries: {
        Row: {
          accent: string;
          code: string;
          flag_emoji: string;
          group_code: string | null;
          name: string;
          stripe: string;
          stripe2: string;
        };
        Insert: Database['public']['Tables']['countries']['Row'];
        Update: Partial<Database['public']['Tables']['countries']['Row']>;
      };
      inventory_items: {
        Row: {
          created_at: string;
          cromo_id: string;
          id: string;
          owned_quantity: number;
          pasted_quantity: number;
          status: string | null;
          updated_at: string;
          user_id: string;
          wanted_quantity: number;
        };
        Insert: Partial<Database['public']['Tables']['inventory_items']['Row']> & {
          cromo_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['inventory_items']['Row']>;
      };
      listing_items: {
        Row: { cromo_id: string; id: string; listing_id: string; quantity: number };
        Insert: { cromo_id: string; id?: string; listing_id: string; quantity?: number };
        Update: Partial<Database['public']['Tables']['listing_items']['Row']>;
      };
      listings: {
        Row: {
          bid_increment: number | null;
          bids_count: number;
          buy_now_price: number | null;
          created_at: string;
          current_bid: number | null;
          description: string | null;
          ends_at: string | null;
          id: string;
          is_public: boolean;
          kind: string;
          negotiable: boolean;
          price: number | null;
          scope_universities: string[];
          seller_id: string;
          start_price: number | null;
          status: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['listings']['Row']> & {
          is_public: boolean;
          kind: string;
          seller_id: string;
        };
        Update: Partial<Database['public']['Tables']['listings']['Row']>;
      };
      matches: {
        Row: {
          contact_revealed_at: string | null;
          created_at: string;
          expires_at: string;
          get_count: number;
          give_count: number;
          id: string;
          listing_id: string | null;
          match_score: number | null;
          match_type: string | null;
          reason: Json;
          status: string;
          updated_at: string;
          user_a_id: string;
          user_a_responded_at: string | null;
          user_a_response: string;
          user_b_id: string;
          user_b_responded_at: string | null;
          user_b_response: string;
        };
        Insert: Partial<Database['public']['Tables']['matches']['Row']> & {
          user_a_id: string;
          user_b_id: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Row']>;
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: Json;
          read: boolean;
          user_id: string;
        };
        Insert: { created_at?: string; id?: string; kind: string; payload?: Json; read?: boolean; user_id: string };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      profile_contacts: {
        Row: { created_at: string; updated_at: string; user_id: string; whatsapp_phone: string };
        Insert: {
          created_at?: string;
          updated_at?: string;
          user_id: string;
          whatsapp_phone: string;
        };
        Update: Partial<Database['public']['Tables']['profile_contacts']['Row']>;
      };
      profiles: {
        Row: {
          album_pct: number | null;
          auction_blocked_until: string | null;
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          expo_push_token: string | null;
          id: string;
          is_anonymous: boolean;
          scope: string[];
          university: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          display_name: string;
          id: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      rarities: {
        Row: {
          chip_color: string;
          dot_color: string;
          id: string;
          label: string;
          sort_order: number;
          text_color: string;
        };
        Insert: Database['public']['Tables']['rarities']['Row'];
        Update: Partial<Database['public']['Tables']['rarities']['Row']>;
      };
      transaction_items: {
        Row: {
          created_at: string;
          cromo_id: string;
          id: string;
          quantity: number;
          role: string;
          transaction_id: string;
          user_id: string;
        };
        Insert: Partial<Database['public']['Tables']['transaction_items']['Row']> & {
          cromo_id: string;
          role: string;
          transaction_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['transaction_items']['Row']>;
      };
      transactions: {
        Row: {
          accepted_at: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          completed_at: string | null;
          contact_revealed_at: string | null;
          created_at: string;
          currency: string;
          final_price: number | null;
          id: string;
          initiator_confirmed: boolean;
          initiator_id: string;
          kind: string;
          listing_id: string;
          match_id: string | null;
          owner_confirmed: boolean;
          owner_id: string;
          status: string;
          updated_at: string;
          winning_bid_id: string | null;
        };
        Insert: Partial<Database['public']['Tables']['transactions']['Row']> & {
          initiator_id: string;
          kind: string;
          listing_id: string;
          owner_id: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Row']>;
      };
      universities: {
        Row: { color: string; email_domain: string | null; id: string; name: string; short: string };
        Insert: Database['public']['Tables']['universities']['Row'];
        Update: Partial<Database['public']['Tables']['universities']['Row']>;
      };
    };
    Views: {
      contact_info: {
        Row: { user_id: string | null; whatsapp_phone: string | null };
      };
      matches_suggestions: {
        Row: {
          counterparty_id: string | null;
          get_count: number | null;
          give_count: number | null;
          match_type: string | null;
          sort_key: number | null;
          university: string | null;
        };
      };
    };
    Functions: {
      fn_accept_transaction: { Args: { p_transaction_id: string }; Returns: undefined };
      fn_cancel_transaction: {
        Args: { p_reason?: string; p_transaction_id: string };
        Returns: undefined;
      };
      fn_complete_transaction: { Args: { p_transaction_id: string }; Returns: string };
      fn_create_trade_proposal: {
        Args: { p_offered_cromo: string; p_owner: string; p_requested_cromo: string };
        Returns: string;
      };
      fn_create_sale_listing: {
        Args: {
          p_cromo_id: string;
          p_description?: string;
          p_is_public: boolean;
          p_negotiable: boolean;
          p_price: number;
          p_scope_universities: string[];
        };
        Returns: string;
      };
      fn_create_package_listing: {
        Args: {
          p_description?: string;
          p_is_public: boolean;
          p_items: Json;
          p_negotiable: boolean;
          p_price: number;
          p_scope_universities: string[];
        };
        Returns: string;
      };
      fn_create_purchase_request: { Args: { p_listing_id: string }; Returns: string };
      fn_create_auction_listing: {
        Args: {
          p_cromo_id: string;
          p_start_price: number;
          p_duration_hours: number;
          p_bid_increment?: number;
          p_buy_now_price?: number | null;
          p_is_public?: boolean;
          p_scope_universities?: string[];
          p_description?: string | null;
        };
        Returns: string;
      };
      fn_place_bid: {
        Args: { p_listing_id: string; p_amount: number };
        Returns: string;
      };
      fn_close_auction: { Args: { p_listing_id: string }; Returns: string | null };
      fn_pause_listing: { Args: { p_listing_id: string }; Returns: undefined };
      fn_resume_listing: { Args: { p_listing_id: string }; Returns: undefined };
      fn_propose_match: {
        Args: {
          p_get_count?: number;
          p_give_count?: number;
          p_listing_id?: string;
          p_match_score?: number;
          p_match_type?: string;
          p_reason?: Json;
          p_target: string;
        };
        Returns: string;
      };
      fn_respond_match: { Args: { p_match_id: string; p_response: string }; Returns: string };
      fn_send_friend_request: { Args: { p_target: string }; Returns: string };
      fn_respond_friend_request: {
        Args: { p_request_id: string; p_response: string };
        Returns: undefined;
      };
      fn_remove_friend: { Args: { p_other: string }; Returns: undefined };
      fn_create_rating: {
        Args: { p_transaction_id: string; p_stars: number; p_comment?: string | null };
        Returns: string;
      };
      fn_set_push_token: { Args: { p_token: string }; Returns: undefined };
      fn_search_profiles: {
        Args: { p_query: string; p_university?: string | null; p_limit?: number };
        Returns: Array<{
          id: string;
          display_name: string;
          university: string | null;
          album_pct: number | null;
          avatar_url: string | null;
          is_friend: boolean;
        }>;
      };
      fn_buy_now_auction: { Args: { p_listing_id: string }; Returns: string };
      fn_friend_inventory: {
        Args: { p_user_id: string; p_kind: string; p_limit?: number };
        Returns: Array<{
          cromo_id: string;
          printed_code: string;
          jersey: number | null;
          display_name: string;
          player_name: string | null;
          country_code: string | null;
          owned_quantity: number;
        }>;
      };
      fn_get_user_card: {
        Args: { p_user_id: string };
        Returns: Array<{
          id: string;
          display_name: string;
          university: string | null;
          album_pct: number | null;
          avatar_url: string | null;
          is_friend: boolean;
        }>;
      };
    };
  };
};

// Helper aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
