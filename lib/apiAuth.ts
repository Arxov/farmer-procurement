import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from './supabaseAdmin';
import { UserRole } from '../types/database';

export interface AuthenticatedNextApiRequest extends NextApiRequest {
  user: {
    id: string;
    role: UserRole;
    phone?: string;
  };
}

export type ApiHandler = (req: AuthenticatedNextApiRequest, res: NextApiResponse) => Promise<any> | any;

export interface AuthOptions {
  roles?: UserRole[];
}

export function withAuth(handler: ApiHandler, options?: AuthOptions) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Not authenticated' });

      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, phone')
        .eq('id', userData.user.id)
        .single();

      if (profileError || !profile) return res.status(401).json({ error: 'Profile not found' });

      if (options?.roles && !options.roles.includes(profile.role as UserRole)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      (req as AuthenticatedNextApiRequest).user = {
        id: userData.user.id,
        role: profile.role as UserRole,
        phone: profile.phone || undefined,
      };

      return await handler(req as AuthenticatedNextApiRequest, res);
    } catch (error: any) {
      console.error('API Auth/Execution Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
