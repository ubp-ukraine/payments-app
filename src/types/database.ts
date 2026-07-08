export type UserRole = 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole | null;
  created_at: string;
}
