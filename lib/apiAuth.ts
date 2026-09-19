import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from './supabaseAdmin';
import { UserRole } from '../types/database';
import { getAuth } from '@clerk/nextjs/server';

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
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, phone')
        .eq('id', userId)
        .single();

      if (profileError || !profile) return res.status(401).json({ error: 'Profile not found' });

      if (options?.roles && !options.roles.includes(profile.role as UserRole)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      (req as AuthenticatedNextApiRequest).user = {
        id: userId,
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
