import prisma from '../prisma.js';

interface AuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
}

// Mask sensitive fields from audit logs
function sanitizePayload(data?: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const clone = { ...data };
  const sensitiveKeys = ['password', 'password_hash', 'token', 'secret', 'jwt'];
  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      clone[key] = '***REDACTED***';
    }
  }
  return JSON.stringify(clone);
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        ...(params.userId ? { user: { connect: { id: params.userId } } } : {}),
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId || null,
        old_value: sanitizePayload(params.oldValue),
        new_value: sanitizePayload(params.newValue),
        reason: params.reason || null,
        ip_address: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
  }
}
