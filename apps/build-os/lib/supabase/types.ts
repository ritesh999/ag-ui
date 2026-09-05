// Hand-written, covering only what step 2's app code touches. Once a real
// Supabase project exists, prefer generating this properly:
//   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
// and this file can be replaced wholesale.
//
// Insert/Update types are plain interfaces (not Partial<Row> intersections
// — that shape confused postgrest-js's insert-overload resolution in
// testing, producing a spurious "type 'never[]'" error) with every
// DB-defaulted column marked optional explicitly.

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          currency_code: string;
          unit_system: "metric" | "imperial";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency_code?: string;
          unit_system?: "metric" | "imperial";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          currency_code?: string;
          unit_system?: "metric" | "imperial";
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          role: "owner" | "admin" | "member" | "viewer";
          invited_email: string | null;
          invited_at: string | null;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          role?: "owner" | "admin" | "member" | "viewer";
          invited_email?: string | null;
          invited_at?: string | null;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          role?: "owner" | "admin" | "member" | "viewer";
          invited_email?: string | null;
          invited_at?: string | null;
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          client: string | null;
          industry: string | null;
          location: string | null;
          project_size: "small" | "medium" | "large" | "major" | null;
          status: "draft" | "documents_uploaded" | "estimate_analyzed" | "tendered" | "awarded";
          is_sample: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          client?: string | null;
          industry?: string | null;
          location?: string | null;
          project_size?: "small" | "medium" | "large" | "major" | null;
          status?: "draft" | "documents_uploaded" | "estimate_analyzed" | "tendered" | "awarded";
          is_sample?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          client?: string | null;
          industry?: string | null;
          location?: string | null;
          project_size?: "small" | "medium" | "large" | "major" | null;
          status?: "draft" | "documents_uploaded" | "estimate_analyzed" | "tendered" | "awarded";
          is_sample?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          organization_id: string;
          resource_type:
            | "labour"
            | "material"
            | "plant"
            | "subcontractor"
            | "overheads"
            | "productivity"
            | "quantity"
            | "pricing_item"
            | "variable";
          description: string;
          unit: string | null;
          rate_or_value: number;
          comments: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          resource_type:
            | "labour"
            | "material"
            | "plant"
            | "subcontractor"
            | "overheads"
            | "productivity"
            | "quantity"
            | "pricing_item"
            | "variable";
          description: string;
          unit?: string | null;
          rate_or_value?: number;
          comments?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          resource_type?:
            | "labour"
            | "material"
            | "plant"
            | "subcontractor"
            | "overheads"
            | "productivity"
            | "quantity"
            | "pricing_item"
            | "variable";
          description?: string;
          unit?: string | null;
          rate_or_value?: number;
          comments?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      assemblies: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          unit: string | null;
          comments: string | null;
          derived_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          unit?: string | null;
          comments?: string | null;
          derived_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          unit?: string | null;
          comments?: string | null;
          derived_rate?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      assembly_components: {
        Row: {
          id: string;
          organization_id: string;
          assembly_id: string;
          component_resource_id: string;
          quantity_or_formula: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          organization_id: string;
          assembly_id: string;
          component_resource_id: string;
          quantity_or_formula: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          organization_id?: string;
          assembly_id?: string;
          component_resource_id?: string;
          quantity_or_formula?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization_with_owner: {
        Args: { p_org_name: string; p_currency_code?: string; p_unit_system?: string };
        Returns: string; // uuid
      };
      accept_pending_invites: {
        Args: Record<string, never>;
        Returns: string[]; // uuid[]
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
