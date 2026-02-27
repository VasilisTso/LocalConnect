export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          karma_points: number;
          transport_mode: 'walking' | 'driving';
          tags: string[];
          is_senior: boolean;
          is_admin: boolean;
          avg_rating: number;
          created_at: string;
        };
        Insert: /* ... omitted for brevity ... */ any;
        Update: /* ... omitted for brevity ... */ any;
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          status: string;
          location: any; // PostGIS Point
          created_at: string;
        };
      };
      user_interactions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          interaction_type: string;
          timestamp: string;
        };
      };
    };
  };
}