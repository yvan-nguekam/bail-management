import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { computeDepositBalance, isDepositTransferred } from "@/lib/deposit"

type SessionUser = { id: string; role: string }

export const depositLeaseInclude = {
  property: { select: { id: true, name: true, ownerId: true, managerId: true } },
  depositDeductions: {
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: { id: true, name: true } } },
  },
} satisfies Prisma.LeaseInclude

export type DepositLease = Prisma.LeaseGetPayload<{ include: typeof depositLeaseInclude }>

export function loadDepositLease(id: string) {
  return prisma.lease.findUnique({ where: { id }, include: depositLeaseInclude })
}

/** ADMIN, propriétaire ou gestionnaire du bien. */
export function canManageDeposit(user: SessionUser, lease: DepositLease) {
  return (
    user.role === "ADMIN" ||
    lease.property.ownerId === user.id ||
    lease.property.managerId === user.id
  )
}

export function canViewDeposit(user: SessionUser, lease: DepositLease) {
  return canManageDeposit(user, lease) || lease.tenantId === user.id
}

/** Vue d'ensemble de la caution renvoyée par l'API. */
export function buildDepositSummary(lease: DepositLease, user: SessionUser) {
  const received = lease.depositReceivedAmount ?? 0
  const balance = computeDepositBalance(
    received,
    lease.depositDeductions.map((deduction) => deduction.amount)
  )

  return {
    leaseId: lease.id,
    leaseStatus: lease.status,
    securityDeposit: lease.securityDeposit,
    status: lease.depositStatus,
    receivedAmount: lease.depositReceivedAmount,
    receivedAt: lease.depositReceivedAt,
    paymentMethod: lease.depositPaymentMethod,
    reference: lease.depositReference,
    settledAt: lease.depositSettledAt,
    refundAmount: lease.depositRefundAmount,
    refundMethod: lease.depositRefundMethod,
    deductions: lease.depositDeductions.map((deduction) => ({
      id: deduction.id,
      label: deduction.label,
      amount: deduction.amount,
      createdAt: deduction.createdAt,
      createdBy: deduction.createdBy,
    })),
    balance,
    transferred: isDepositTransferred(lease.status, lease.depositStatus),
    canManage: canManageDeposit(user, lease),
  }
}
