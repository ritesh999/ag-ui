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
      project_resources: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          source_resource_id: string | null;
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
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          source_resource_id?: string | null;
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
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          source_resource_id?: string | null;
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
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      project_assemblies: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          source_assembly_id: string | null;
          name: string;
          unit: string | null;
          comments: string | null;
          derived_rate: number | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          source_assembly_id?: string | null;
          name: string;
          unit?: string | null;
          comments?: string | null;
          derived_rate?: number | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          source_assembly_id?: string | null;
          name?: string;
          unit?: string | null;
          comments?: string | null;
          derived_rate?: number | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      project_assembly_components: {
        Row: {
          id: string;
          organization_id: string;
          project_assembly_id: string;
          component_project_resource_id: string;
          quantity_or_formula: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_assembly_id: string;
          component_project_resource_id: string;
          quantity_or_formula: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_assembly_id?: string;
          component_project_resource_id?: string;
          quantity_or_formula?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          occurred_at: string;
          table_name: string;
          record_id: string;
          action: "insert" | "update" | "delete";
          field_name: string | null;
          old_value: unknown;
          new_value: unknown;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          occurred_at?: string;
          table_name: string;
          record_id: string;
          action: "insert" | "update" | "delete";
          field_name?: string | null;
          old_value?: unknown;
          new_value?: unknown;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_user_id?: string | null;
          occurred_at?: string;
          table_name?: string;
          record_id?: string;
          action?: "insert" | "update" | "delete";
          field_name?: string | null;
          old_value?: unknown;
          new_value?: unknown;
        };
        Relationships: [];
      };
      workbook_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      workbook_rows: {
        Row: {
          id: string;
          organization_id: string;
          workbook_template_id: string;
          row_type: "heading" | "resource";
          resource_id: string | null;
          description: string;
          unit: string | null;
          rate: number | null;
          qty_formula: string | null;
          computed_total: number | null;
          notes: string | null;
          sort_order: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          workbook_template_id: string;
          row_type?: "heading" | "resource";
          resource_id?: string | null;
          description?: string;
          unit?: string | null;
          rate?: number | null;
          qty_formula?: string | null;
          computed_total?: number | null;
          notes?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          workbook_template_id?: string;
          row_type?: "heading" | "resource";
          resource_id?: string | null;
          description?: string;
          unit?: string | null;
          rate?: number | null;
          qty_formula?: string | null;
          computed_total?: number | null;
          notes?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      document_categories: {
        Row: { id: string; code: string; label: string; sort_order: number };
        Insert: { id?: string; code: string; label: string; sort_order?: number };
        Update: { id?: string; code?: string; label?: string; sort_order?: number };
        Relationships: [];
      };
      project_documents: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          category_id: string | null;
          file_name: string;
          file_type: "pdf" | "docx" | "xlsx";
          size_bytes: number;
          storage_path: string;
          status: "processing" | "ready" | "failed";
          status_error: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          category_id?: string | null;
          file_name: string;
          file_type: "pdf" | "docx" | "xlsx";
          size_bytes: number;
          storage_path: string;
          status?: "processing" | "ready" | "failed";
          status_error?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          category_id?: string | null;
          file_name?: string;
          file_type?: "pdf" | "docx" | "xlsx";
          size_bytes?: number;
          storage_path?: string;
          status?: "processing" | "ready" | "failed";
          status_error?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      wbs_sections: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          name: string;
          sort_order: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          name: string;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          name?: string;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      wbs_packages: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          section_id: string;
          name: string;
          description: string | null;
          package_code: string;
          delivery_method: "self_perform" | "subcontract";
          procurement_status: "not_applicable" | "draft" | "issued" | "quotes_received" | "preferred" | "awarded";
          pricing_section_id: string | null;
          sort_order: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          section_id: string;
          name: string;
          description?: string | null;
          package_code: string;
          delivery_method?: "self_perform" | "subcontract";
          procurement_status?: "not_applicable" | "draft" | "issued" | "quotes_received" | "preferred" | "awarded";
          pricing_section_id?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          section_id?: string;
          name?: string;
          description?: string | null;
          package_code?: string;
          delivery_method?: "self_perform" | "subcontract";
          procurement_status?: "not_applicable" | "draft" | "issued" | "quotes_received" | "preferred" | "awarded";
          pricing_section_id?: string | null;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      pricing_sections: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          cost_type: "direct" | "indirect";
          name: string;
          sort_order: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          cost_type?: "direct" | "indirect";
          name: string;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          cost_type?: "direct" | "indirect";
          name?: string;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      pricing_lines: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          section_id: string | null;
          cost_type: "direct" | "indirect";
          item_code: string;
          description: string;
          quantity: number;
          unit: string | null;
          rate: number;
          line_total: number;
          absorbed_indirect: number;
          sell_price: number | null;
          sort_order: number;
          is_ai_generated: boolean;
          ai_confirmed_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          section_id?: string | null;
          cost_type: "direct" | "indirect";
          item_code: string;
          description?: string;
          quantity?: number;
          unit?: string | null;
          rate?: number;
          line_total?: number;
          absorbed_indirect?: number;
          sell_price?: number | null;
          sort_order?: number;
          is_ai_generated?: boolean;
          ai_confirmed_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          section_id?: string | null;
          cost_type?: "direct" | "indirect";
          item_code?: string;
          description?: string;
          quantity?: number;
          unit?: string | null;
          rate?: number;
          line_total?: number;
          absorbed_indirect?: number;
          sell_price?: number | null;
          sort_order?: number;
          is_ai_generated?: boolean;
          ai_confirmed_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      markup_settings: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          margin_pct: number;
          risk_pct: number;
          corporate_overheads_pct: number;
          formula_mode: "compounding" | "additive";
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          margin_pct?: number;
          risk_pct?: number;
          corporate_overheads_pct?: number;
          formula_mode?: "compounding" | "additive";
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          margin_pct?: number;
          risk_pct?: number;
          corporate_overheads_pct?: number;
          formula_mode?: "compounding" | "additive";
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
      create_project: {
        Args: {
          p_organization_id: string;
          p_name: string;
          p_client?: string;
          p_industry?: string;
          p_location?: string;
          p_project_size?: string;
        };
        Returns: string; // uuid
      };
      recompute_project_pricing: {
        Args: { p_project_id: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
