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
        Relationships: [];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [];
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
        Insert: {
          catalog_version?: number;
          country_code?: string | null;
          created_at?: string;
          display_name: string;
          group_code?: string | null;
          id?: string;
          is_active?: boolean;
          is_special?: boolean;
          jersey?: number | null;
          page_number?: number | null;
          player_name?: string | null;
          position?: string | null;
          printed_code?: string | null;
          rarity_id: string;
          section_code: string;
          section_number: number;
          sticker_type?: string;
        };
        Update: {
          catalog_version?: number;
          country_code?: string | null;
          created_at?: string;
          display_name?: string;
          group_code?: string | null;
          id?: string;
          is_active?: boolean;
          is_special?: boolean;
          jersey?: number | null;
          page_number?: number | null;
          player_name?: string | null;
          position?: string | null;
          printed_code?: string | null;
          rarity_id?: string;
          section_code?: string;
          section_number?: number;
          sticker_type?: string;
        };
        Relationships: [];
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
        Insert: {
          accent: string;
          code: string;
          flag_emoji: string;
          group_code?: string | null;
          name: string;
          stripe: string;
          stripe2: string;
        };
        Update: {
          accent?: string;
          code?: string;
          flag_emoji?: string;
          group_code?: string | null;
          name?: string;
          stripe?: string;
          stripe2?: string;
        };
        Relationships: [];
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
        Insert: {
          created_at?: string;
          cromo_id: string;
          id?: string;
          owned_quantity?: number;
          pasted_quantity?: number;
          status?: string | null;
          updated_at?: string;
          user_id: string;
          wanted_quantity?: number;
        };
        Update: {
          created_at?: string;
          cromo_id?: string;
          id?: string;
          owned_quantity?: number;
          pasted_quantity?: number;
          status?: string | null;
          updated_at?: string;
          user_id?: string;
          wanted_quantity?: number;
        };
        Relationships: [];
      };
      listing_items: {
        Row: { cromo_id: string; id: string; listing_id: string; quantity: number };
        Insert: { cromo_id: string; id?: string; listing_id: string; quantity?: number };
        Update: { cromo_id?: string; id?: string; listing_id?: string; quantity?: number };
        Relationships: [];
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
        Insert: {
          bid_increment?: number | null;
          bids_count?: number;
          buy_now_price?: number | null;
          created_at?: string;
          current_bid?: number | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          is_public: boolean;
          kind: string;
          negotiable?: boolean;
          price?: number | null;
          scope_universities?: string[];
          seller_id: string;
          start_price?: number | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          bid_increment?: number | null;
          bids_count?: number;
          buy_now_price?: number | null;
          created_at?: string;
          current_bid?: number | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          is_public?: boolean;
          kind?: string;
          negotiable?: boolean;
          price?: number | null;
          scope_universities?: string[];
          seller_id?: string;
          start_price?: number | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          contact_revealed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          get_count?: number;
          give_count?: number;
          id?: string;
          listing_id?: string | null;
          match_score?: number | null;
          match_type?: string | null;
          reason?: Json;
          status?: string;
          updated_at?: string;
          user_a_id: string;
          user_a_responded_at?: string | null;
          user_a_response?: string;
          user_b_id: string;
          user_b_responded_at?: string | null;
          user_b_response?: string;
        };
        Update: {
          contact_revealed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          get_count?: number;
          give_count?: number;
          id?: string;
          listing_id?: string | null;
          match_score?: number | null;
          match_type?: string | null;
          reason?: Json;
          status?: string;
          updated_at?: string;
          user_a_id?: string;
          user_a_responded_at?: string | null;
          user_a_response?: string;
          user_b_id?: string;
          user_b_responded_at?: string | null;
          user_b_response?: string;
        };
        Relationships: [];
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
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: Json;
          read?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: Json;
          read?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_contacts: {
        Row: { created_at: string; updated_at: string; user_id: string; whatsapp_phone: string };
        Insert: { created_at?: string; updated_at?: string; user_id: string; whatsapp_phone: string };
        Update: { created_at?: string; updated_at?: string; user_id?: string; whatsapp_phone?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          album_pct: number | null;
          auction_blocked_until: string | null;
          created_at: string;
          display_name: string;
          id: string;
          is_anonymous: boolean;
          scope: string[];
          university: string | null;
          updated_at: string;
        };
        Insert: {
          album_pct?: number | null;
          auction_blocked_until?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          is_anonymous?: boolean;
          scope?: string[];
          university?: string | null;
          updated_at?: string;
        };
        Update: {
          album_pct?: number | null;
          auction_blocked_until?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_anonymous?: boolean;
          scope?: string[];
          university?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          chip_color: string;
          dot_color: string;
          id: string;
          label: string;
          sort_order: number;
          text_color: string;
        };
        Update: {
          chip_color?: string;
          dot_color?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          text_color?: string;
        };
        Relationships: [];
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
        Insert: {
          created_at?: string;
          cromo_id: string;
          id?: string;
          quantity?: number;
          role: string;
          transaction_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          cromo_id?: string;
          id?: string;
          quantity?: number;
          role?: string;
          transaction_id?: string;
          user_id?: string;
        };
        Relationships: [];
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
        Insert: {
          accepted_at?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          contact_revealed_at?: string | null;
          created_at?: string;
          currency?: string;
          final_price?: number | null;
          id?: string;
          initiator_confirmed?: boolean;
          initiator_id: string;
          kind: string;
          listing_id: string;
          match_id?: string | null;
          owner_confirmed?: boolean;
          owner_id: string;
          status?: string;
          updated_at?: string;
          winning_bid_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          contact_revealed_at?: string | null;
          created_at?: string;
          currency?: string;
          final_price?: number | null;
          id?: string;
          initiator_confirmed?: boolean;
          initiator_id?: string;
          kind?: string;
          listing_id?: string;
          match_id?: string | null;
          owner_confirmed?: boolean;
          owner_id?: string;
          status?: string;
          updated_at?: string;
          winning_bid_id?: string | null;
        };
        Relationships: [];
      };
      universities: {
        Row: {
          color: string;
          email_domain: string | null;
          id: string;
          name: string;
          short: string;
        };
        Insert: {
          color: string;
          email_domain?: string | null;
          id: string;
          name: string;
          short: string;
        };
        Update: {
          color?: string;
          email_domain?: string | null;
          id?: string;
          name?: string;
          short?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      contact_info: {
        Row: { user_id: string | null; whatsapp_phone: string | null };
        Insert: { user_id?: string | null; whatsapp_phone?: string | null };
        Update: { user_id?: string | null; whatsapp_phone?: string | null };
        Relationships: [];
      };
      cromo_with_country_rarity: {
        Row: {
          accent: string | null;
          catalog_version: number | null;
          country_code: string | null;
          country_group_code: string | null;
          country_name: string | null;
          created_at: string | null;
          display_name: string | null;
          flag_emoji: string | null;
          group_code: string | null;
          id: string | null;
          is_active: boolean | null;
          is_special: boolean | null;
          jersey: number | null;
          n: number | null;
          page_number: number | null;
          player_name: string | null;
          position: string | null;
          printed_code: string | null;
          rarity_chip: string | null;
          rarity_dot: string | null;
          rarity_id: string | null;
          rarity_label: string | null;
          rarity_sort_order: number | null;
          rarity_text: string | null;
          section_code: string | null;
          section_number: number | null;
          sticker_type: string | null;
          stripe: string | null;
          stripe2: string | null;
        };
        Relationships: [];
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
        Relationships: [];
      };
    };
    Functions: {
      before_user_created_hook: { Args: { event: Json }; Returns: Json };
      fn_accept_transaction: { Args: { p_transaction_id: string }; Returns: undefined };
      fn_cancel_transaction: {
        Args: { p_reason?: string; p_transaction_id: string };
        Returns: undefined;
      };
      fn_complete_transaction: { Args: { p_transaction_id: string }; Returns: string };
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
      fn_create_trade_proposal: {
        Args: { p_offered_cromo: string; p_owner: string; p_requested_cromo: string };
        Returns: string;
      };
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
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database['public'];

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Update'];
export type Views<T extends keyof DefaultSchema['Views']> = DefaultSchema['Views'][T]['Row'];
export type Functions<T extends keyof DefaultSchema['Functions']> = DefaultSchema['Functions'][T];
