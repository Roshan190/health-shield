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

export type HouseholdInviteStatus = 'pending' | 'accepted' | 'revoked' | 'cancelled';

export type VaultMembershipStatus = 'active' | 'revoked';

export type VaultResourceType = 'policy' | 'medical_record';

export type ClaimStatus = 'draft' | 'submitted' | 'more_info' | 'settled';

export type VisitConsentStatus = 'active' | 'revoked';

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
          family_member_id: string | null;
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
          family_member_id?: string | null;
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
          family_member_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'policies_family_member_id_fkey';
            columns: ['family_member_id'];
            isOneToOne: false;
            referencedRelation: 'family_members';
            referencedColumns: ['id'];
          },
        ];
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
          family_member_id: string | null;
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
          family_member_id?: string | null;
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
          family_member_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'medical_records_family_member_id_fkey';
            columns: ['family_member_id'];
            isOneToOne: false;
            referencedRelation: 'family_members';
            referencedColumns: ['id'];
          },
        ];
      };
      medical_record_documents: {
        Row: {
          id: string;
          record_id: string;
          user_id: string;
          document_path: string;
          document_name: string;
          document_mime: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          record_id: string;
          user_id: string;
          document_path: string;
          document_name: string;
          document_mime: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string;
          user_id?: string;
          document_path?: string;
          document_name?: string;
          document_mime?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'medical_record_documents_record_id_fkey';
            columns: ['record_id'];
            isOneToOne: false;
            referencedRelation: 'medical_records';
            referencedColumns: ['id'];
          },
        ];
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
      household_invites: {
        Row: {
          id: string;
          owner_user_id: string;
          invitee_email: string;
          status: HouseholdInviteStatus;
          invitee_user_id: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          invitee_email: string;
          status?: HouseholdInviteStatus;
          invitee_user_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          invitee_email?: string;
          status?: HouseholdInviteStatus;
          invitee_user_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vault_memberships: {
        Row: {
          id: string;
          owner_user_id: string;
          member_user_id: string;
          status: VaultMembershipStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          member_user_id: string;
          status?: VaultMembershipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          member_user_id?: string;
          status?: VaultMembershipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vault_item_shares: {
        Row: {
          id: string;
          owner_user_id: string;
          member_user_id: string;
          resource_type: VaultResourceType;
          resource_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          member_user_id: string;
          resource_type: VaultResourceType;
          resource_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          member_user_id?: string;
          resource_type?: VaultResourceType;
          resource_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      preferred_hospitals: {
        Row: {
          id: string;
          user_id: string;
          place_id: string;
          name: string;
          address: string | null;
          latitude: number;
          longitude: number;
          maps_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          place_id: string;
          name: string;
          address?: string | null;
          latitude: number;
          longitude: number;
          maps_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          place_id?: string;
          name?: string;
          address?: string | null;
          latitude?: number;
          longitude?: number;
          maps_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      claims: {
        Row: {
          id: string;
          user_id: string;
          policy_id: string;
          status: ClaimStatus;
          hospital_name: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          policy_id: string;
          status?: ClaimStatus;
          hospital_name?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          policy_id?: string;
          status?: ClaimStatus;
          hospital_name?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'claims_policy_id_fkey';
            columns: ['policy_id'];
            isOneToOne: false;
            referencedRelation: 'policies';
            referencedColumns: ['id'];
          },
        ];
      };
      claim_checklist_items: {
        Row: {
          id: string;
          claim_id: string;
          user_id: string;
          item_key: string;
          label: string;
          sort_order: number;
          done: boolean;
          medical_record_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          claim_id: string;
          user_id: string;
          item_key: string;
          label: string;
          sort_order?: number;
          done?: boolean;
          medical_record_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          claim_id?: string;
          user_id?: string;
          item_key?: string;
          label?: string;
          sort_order?: number;
          done?: boolean;
          medical_record_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'claim_checklist_items_claim_id_fkey';
            columns: ['claim_id'];
            isOneToOne: false;
            referencedRelation: 'claims';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claim_checklist_items_medical_record_id_fkey';
            columns: ['medical_record_id'];
            isOneToOne: false;
            referencedRelation: 'medical_records';
            referencedColumns: ['id'];
          },
        ];
      };
      visit_consents: {
        Row: {
          id: string;
          patient_user_id: string;
          doctor_email: string;
          status: VisitConsentStatus;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_user_id: string;
          doctor_email: string;
          status?: VisitConsentStatus;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_user_id?: string;
          doctor_email?: string;
          status?: VisitConsentStatus;
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      visit_consent_items: {
        Row: {
          id: string;
          consent_id: string;
          resource_type: VaultResourceType;
          resource_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          consent_id: string;
          resource_type: VaultResourceType;
          resource_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          consent_id?: string;
          resource_type?: VaultResourceType;
          resource_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'visit_consent_items_consent_id_fkey';
            columns: ['consent_id'];
            isOneToOne: false;
            referencedRelation: 'visit_consents';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      accept_household_invite: {
        Args: { p_invite_id: string };
        Returns: Database['public']['Tables']['vault_memberships']['Row'];
      };
      revoke_vault_membership: {
        Args: { p_membership_id: string };
        Returns: undefined;
      };
      is_active_vault_member: {
        Args: { p_owner: string; p_member: string };
        Returns: boolean;
      };
      can_view_shared_resource: {
        Args: {
          p_owner: string;
          p_resource_type: VaultResourceType;
          p_resource_id: string;
        };
        Returns: boolean;
      };
      current_jwt_email: {
        Args: Record<string, never>;
        Returns: string;
      };
      visit_consent_is_live: {
        Args: { p_consent_id: string };
        Returns: boolean;
      };
      can_doctor_view_resource: {
        Args: {
          p_owner: string;
          p_resource_type: VaultResourceType;
          p_resource_id: string;
        };
        Returns: boolean;
      };
      create_visit_consent: {
        Args: {
          p_doctor_email: string;
          p_expires_at: string;
          p_items: Json;
        };
        Returns: Database['public']['Tables']['visit_consents']['Row'];
      };
      revoke_visit_consent: {
        Args: { p_consent_id: string };
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
      household_invite_status: HouseholdInviteStatus;
      vault_membership_status: VaultMembershipStatus;
      vault_resource_type: VaultResourceType;
      claim_status: ClaimStatus;
      visit_consent_status: VisitConsentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Policy = Database['public']['Tables']['policies']['Row'];
export type MedicalRecord = Database['public']['Tables']['medical_records']['Row'];
export type MedicalRecordDocument = Database['public']['Tables']['medical_record_documents']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type Vital = Database['public']['Tables']['vitals']['Row'];
export type Medication = Database['public']['Tables']['medications']['Row'];
export type PlatformHealthDaily = Database['public']['Tables']['platform_health_daily']['Row'];
export type HouseholdInvite = Database['public']['Tables']['household_invites']['Row'];
export type VaultMembership = Database['public']['Tables']['vault_memberships']['Row'];
export type VaultItemShare = Database['public']['Tables']['vault_item_shares']['Row'];
export type PreferredHospital = Database['public']['Tables']['preferred_hospitals']['Row'];
export type Claim = Database['public']['Tables']['claims']['Row'];
export type ClaimChecklistItem = Database['public']['Tables']['claim_checklist_items']['Row'];
export type VisitConsent = Database['public']['Tables']['visit_consents']['Row'];
export type VisitConsentItem = Database['public']['Tables']['visit_consent_items']['Row'];
