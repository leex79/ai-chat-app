export interface Database {
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          id: string;
          device_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          device_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          device_id: string;
          role: "user" | "assistant";
          content: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_calls: any | null;
          created_at: string;
        };
        Insert: {
          id: string;
          session_id: string;
          device_id: string;
          role: "user" | "assistant";
          content?: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_calls?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          device_id?: string;
          role?: "user" | "assistant";
          content?: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_calls?: any | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      mcp_servers: {
        Row: {
          id: string;
          device_id: string;
          name: string;
          transport: "stdio" | "http";
          command: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          env: any | null;
          url: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headers: any | null;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          device_id: string;
          name: string;
          transport: "stdio" | "http";
          command?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args?: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          env?: any | null;
          url?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headers?: any | null;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          name?: string;
          transport?: "stdio" | "http";
          command?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args?: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          env?: any | null;
          url?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headers?: any | null;
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
