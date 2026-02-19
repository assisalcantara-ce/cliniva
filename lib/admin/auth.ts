export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'moderator' | 'support';
}

export function parseAdminToken(token: string): AdminUser | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return {
      id: decoded.id,
      email: decoded.email,
      full_name: decoded.full_name,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export function createAdminToken(user: AdminUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export function hasPermission(role: string, resource: string, action: string): boolean {
  const permissions: Record<string, Record<string, string[]>> = {
    super_admin: {
      usuarios: ['read', 'create', 'update', 'delete'],
      financeiro: ['read', 'create', 'update', 'delete'],
      suporte: ['read', 'update', 'delete'],
      integracoes: ['read', 'create', 'update', 'delete'],
    },
    moderator: {
      usuarios: ['read', 'update'],
      financeiro: ['read'],
      suporte: ['read', 'update'],
      integracoes: [],
    },
    support: {
      usuarios: ['read'],
      financeiro: [],
      suporte: ['read', 'update'],
      integracoes: [],
    },
  };

  const rolePermissions = permissions[role];
  if (!rolePermissions) return false;

  const resourceActions = rolePermissions[resource];
  if (!resourceActions) return false;

  return resourceActions.includes(action);
}
