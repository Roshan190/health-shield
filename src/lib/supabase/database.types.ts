export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PolicyType =
  | 'health'
  | 'term'
  | 'life'
  | 'personal_accident'
  | 'critical_illness'
  | 'other';

export type RecordCategory =
  | 'prescription'
  | 'lab_report'
  | 'scan'
  | 'bill'
  | 'discharge_summary'
  | 'vaccination'
  | 'other';

export type FamilyRelationship =
  | 'spouse'
  | 'child'
  | 'parent'
  | 'sibling'
  | 'grandparent'
  | 'other';

export type FamilyRole = 'manager' | 'viewer';

export type VitalType = 'blood_pressure' | 'blood_sugar' | 'weight';

export type PlatformHealthSource = 'health_connect' | 'apple_health';

export type PlatformHealthMetric = 'steps' | 'heart_rate' | 'sleep';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          date_of_birth: string | null;
          blood_group: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          date_of_birth?: string | null;
          blood_group?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          date_of_birth?: string | null;
          blood_group?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      policies: {
        Row: {
          id: string;
          user_id: string;
          policy_type: PolicyType;
          insurer: string;
          policy_number: string;
          sum_insured: number | null;
          premium_amount: number | null;
          premium_frequency: string | null;
          start_date: string | null;
          renewal_date: string | null;
          nominee: string | null;
          notes: string | null;
          document_path: string | null;
          document_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          policy_type?: PolicyType;
          insurer: string;
          policy_number: string;
          sum_insured?: number | null;
          premium_amount?: number | null;
          premium_frequency?: string | null;
          start_date?: string | null;
          renewal_date?: string | null;
          nominee?: string | null;
          notes?: string | null;
          document_path?: string | null;
          document_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          policy_type?: PolicyType;
          insurer?: string;
          policy_number?: string;
          sum_insured?: number | null;
          premium_amount?: number | null;
          premium_frequency?: string | null;
          start_date?: string | null;
          renewal_date?: string | null;
          nominee?: string | null;
          notes?: string | null;
          document_path?: string | null;
          document_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      medical_records: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: RecordCategory;
          record_date: string | null;
          tags: string[];
          notes: string | null;
          document_path: string | null;
          document_name: string | null;
          document_mime: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category?: RecordCategory;
          record_date?: string | null;
          tags?: string[];
          notes?: string | null;
          document_path?: string | null;
          document_name?: string | null;
          document_mime?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category?: RecordCategory;
          record_date?: string | null;
          tags?: string[];
          notes?: string | null;
          document_path?: string | null;
          document_name?: string | null;
          document_mime?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          relationship: FamilyRelationship;
          date_of_birth: string | null;
          blood_group: string | null;
          role: FamilyRole;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          relationship?: FamilyRelationship;
          date_of_birth?: string | null;
          blood_group?: string | null;
          role?: FamilyRole;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          relationship?: FamilyRelationship;
          date_of_birth?: string | null;
          blood_group?: string | null;
          role?: FamilyRole;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vitals: {
        Row: {
          id: string;
          user_id: string;
          vital_type: VitalType;
          recorded_at: string;
          value_primary: number;
          value_secondary: number | null;
          unit: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vital_type: VitalType;
          recorded_at?: string;
          value_primary: number;
          value_secondary?: number | null;
          unit: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vital_type?: VitalType;
          recorded_at?: string;
          value_primary?: number;
          value_secondary?: number | null;
          unit?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      medications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          dose: string | null;
          instructions: string | null;
          reminder_times: string[];
          reminder_enabled: boolean;
          active: boolean;
          started_on: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          dose?: string | null;
          instructions?: string | null;
          reminder_times?: string[];
          reminder_enabled?: boolean;
          active?: boolean;
          started_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          dose?: string | null;
          instructions?: string | null;
          reminder_times?: string[];
          reminder_enabled?: boolean;
          active?: boolean;
          started_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_health_daily: {
        Row: {
          id: string;
          user_id: string;
          source: PlatformHealthSource;
          metric: PlatformHealthMetric;
          day: string;
          value_primary: number;
          unit: string;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: PlatformHealthSource;
          metric: PlatformHealthMetric;
          day: string;
          value_primary: number;
          unit: string;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: PlatformHealthSource;
          metric?: PlatformHealthMetric;
          day?: string;
          value_primary?: number;
          unit?: string;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      policy_type: PolicyType;
      record_category: RecordCategory;
      family_relationship: FamilyRelationship;
      family_role: FamilyRole;
      vital_type: VitalType;
      platform_health_source: PlatformHealthSource;
      platform_health_metric: PlatformHealthMetric;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Policy = Database['public']['Tables']['policies']['Row'];
export type MedicalRecord = Database['public']['Tables']['medical_records']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type Vital = Database['public']['Tables']['vitals']['Row'];
export type Medication = Database['public']['Tables']['medications']['Row'];
export type PlatformHealthDaily = Database['public']['Tables']['platform_health_daily']['Row'];
