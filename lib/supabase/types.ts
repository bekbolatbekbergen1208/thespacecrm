export type Role = "founder" | "admin" | "manager" | "employee";
export type TaskStatus = "todo" | "in_progress" | "done";
export type AccessRequestStatus = "pending" | "approved" | "rejected";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "blocked";

type RoboticsValue = string | number | null;
type RoboticsTable = {
  Row: {
    id: string;
    company_id: string;
    created_at: string;
    [key: string]: RoboticsValue;
  };
  Insert: {
    id?: string;
    company_id: string;
    created_at?: string;
    [key: string]: RoboticsValue | undefined;
  };
  Update: {
    [key: string]: RoboticsValue | undefined;
  };
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          pending_invite_code: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          pending_invite_code?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          pending_invite_code?: string | null;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          business_type: string;
          dashboard_route: string;
          country: string;
          phone: string | null;
          plan: string;
          subscription_status: SubscriptionStatus;
          subscription_due_date: string;
          monthly_fee: number;
          blocked_at: string | null;
          last_paid_at: string | null;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          business_type?: string;
          dashboard_route?: string;
          country?: string;
          phone?: string | null;
          plan?: string;
          subscription_status?: SubscriptionStatus;
          subscription_due_date?: string;
          monthly_fee?: number;
          blocked_at?: string | null;
          last_paid_at?: string | null;
          invite_code?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          business_type?: string;
          dashboard_route?: string;
          country?: string;
          phone?: string | null;
          plan?: string;
          subscription_status?: SubscriptionStatus;
          subscription_due_date?: string;
          monthly_fee?: number;
          blocked_at?: string | null;
          last_paid_at?: string | null;
          invite_code?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
        };
        Relationships: [];
      };
      platform_subscription_payments: {
        Row: {
          id: string;
          company_id: string;
          amount: number;
          paid_at: string;
          period_start: string | null;
          period_end: string | null;
          method: string;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          amount?: number;
          paid_at?: string;
          period_start?: string | null;
          period_end?: string | null;
          method?: string;
          notes?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          paid_at?: string;
          period_start?: string | null;
          period_end?: string | null;
          method?: string;
          notes?: string | null;
          recorded_by?: string | null;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: Role;
          position: string | null;
          dashboard_route: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role: Role;
          position?: string | null;
          dashboard_route?: string;
          created_at?: string;
        };
        Update: {
          role?: Role;
          position?: string | null;
          dashboard_route?: string;
        };
        Relationships: [];
      };
      employee_access_requests: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string;
          full_name: string;
          position: string;
          company_name: string;
          invite_code: string | null;
          status: AccessRequestStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id: string;
          full_name: string;
          position: string;
          company_name: string;
          invite_code?: string | null;
          status?: AccessRequestStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          company_id?: string | null;
          full_name?: string;
          position?: string;
          company_name?: string;
          invite_code?: string | null;
          status?: AccessRequestStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          status: string;
          value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          status?: string;
          value?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          email?: string | null;
          status?: string;
          value?: number;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          user_id: string | null;
          email: string | null;
          phone: string | null;
          position: string;
          salary: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          user_id?: string | null;
          email?: string | null;
          phone?: string | null;
          position?: string;
          salary?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          user_id?: string | null;
          email?: string | null;
          phone?: string | null;
          position?: string;
          salary?: number;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string | null;
          assignee_id: string | null;
          status: TaskStatus;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description?: string | null;
          assignee_id?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          assignee_id?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          sku: string | null;
          quantity: number;
          price: number;
          reorder_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          sku?: string | null;
          quantity?: number;
          price?: number;
          reorder_level?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          sku?: string | null;
          quantity?: number;
          price?: number;
          reorder_level?: number;
        };
        Relationships: [];
      };
      robotics_students: RoboticsTable;
      robotics_payments: RoboticsTable;
      robotics_attendance: RoboticsTable;
      robotics_lessons: RoboticsTable;
      robotics_trial_lessons: RoboticsTable;
      robotics_subscriptions: RoboticsTable;
      robotics_groups: RoboticsTable;
      robotics_mentors: RoboticsTable;
      robotics_families: RoboticsTable;
      robotics_tasks: RoboticsTable;
      robotics_inventory: RoboticsTable;
      robotics_salaries: RoboticsTable;
      robotics_grades: RoboticsTable;
      robotics_feedback: RoboticsTable;
      robotics_learning: RoboticsTable;
      robotics_methods: RoboticsTable;
      robotics_team: RoboticsTable;
      bakery_shops: RoboticsTable;
      bakery_stock: RoboticsTable;
      bakery_sales: RoboticsTable;
      bakery_suppliers: RoboticsTable;
      bakery_expenses: RoboticsTable;
      bakery_products: RoboticsTable;
      bakery_product_sales: RoboticsTable;
      bakery_vehicles: RoboticsTable;
      bakery_delivery_routes: RoboticsTable;
      retail_products: RoboticsTable;
      retail_product_sales: RoboticsTable;
      retail_debts: RoboticsTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      access_request_status: AccessRequestStatus;
      member_role: Role;
      task_status: TaskStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
