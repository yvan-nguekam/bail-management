/**
 * Données de test (seed) pour le développement.
 *
 * Exécution : `pnpm db:seed` (ou `node prisma/seed.ts`, Node 24+ sans tsx/ts-node).
 * Lancé automatiquement par `prisma migrate dev` / `prisma migrate reset`.
 *
 * Stratégie d'idempotence : le script VIDE toutes les tables (dans l'ordre des
 * dépendances) puis recrée un jeu de données complet. Il peut donc être relancé
 * autant de fois que nécessaire, mais il efface toutes les données existantes.
 * Il refuse de s'exécuter si NODE_ENV === "production".
 *
 * Les dates sont calculées par rapport à aujourd'hui pour que les statuts
 * (baux actifs, loyers en retard, échéances à venir) restent pertinents.
 */
import { PrismaClient } from "@prisma/client"
import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

if (process.env.NODE_ENV === "production") {
  console.error("Refus : le seed ne doit jamais être exécuté en production (NODE_ENV=production).")
  process.exit(1)
}

const prisma = new PrismaClient()

const PASSWORD = "password123"

// ---------- Helpers de dates (UTC pour éviter les décalages de fuseau) ----------

const now = new Date()
const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

/** Jour `day` du mois courant décalé de `offsetMonths` mois. */
function monthStart(offsetMonths: number, day = 1): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, day))
}

/** Dernier jour du mois contenant `date`. */
function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function daysAgo(days: number): Date {
  return new Date(todayUtc.getTime() - days * 24 * 60 * 60 * 1000)
}

function daysFromNow(days: number): Date {
  return daysAgo(-days)
}

// ---------- Génération des échéances de loyer ----------

type ScheduleOptions = {
  leaseId: string
  tenantId: string
  startDate: Date
  endDate: Date
  monthlyRent: number
  paymentDay: number
  /** Nombre d'échéances déjà dues (les plus récentes) laissées impayées (OVERDUE). */
  overdueCount: number
  /** Préfixe de référence de transaction pour les paiements réglés. */
  referencePrefix: string
  paidMethod: PaymentMethod
}

function buildPaymentSchedule(opts: ScheduleOptions): Prisma.PaymentCreateManyInput[] {
  const periods: { periodStart: Date; periodEnd: Date; dueDate: Date }[] = []

  const cursor = new Date(Date.UTC(opts.startDate.getUTCFullYear(), opts.startDate.getUTCMonth(), 1))
  while (cursor <= opts.endDate) {
    const periodStart = new Date(cursor)
    periods.push({
      periodStart,
      periodEnd: endOfMonth(periodStart),
      dueDate: new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), opts.paymentDay)),
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  const dueIndexes = periods.map((p, i) => (p.dueDate < todayUtc ? i : -1)).filter((i) => i >= 0)
  const overdueIndexes = new Set(dueIndexes.slice(Math.max(0, dueIndexes.length - opts.overdueCount)))

  return periods.map((p, i) => {
    const isDue = p.dueDate < todayUtc
    let status: PaymentStatus = "PENDING"
    if (isDue) status = overdueIndexes.has(i) ? "OVERDUE" : "PAID"
    const paid = status === "PAID"

    const month = `${p.periodStart.getUTCFullYear()}${String(p.periodStart.getUTCMonth() + 1).padStart(2, "0")}`
    return {
      leaseId: opts.leaseId,
      tenantId: opts.tenantId,
      amount: opts.monthlyRent,
      dueDate: p.dueDate,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      status,
      // Réglé la veille de l'échéance
      paidDate: paid ? new Date(p.dueDate.getTime() - 24 * 60 * 60 * 1000) : null,
      paymentMethod: paid ? opts.paidMethod : null,
      reference: paid ? `${opts.referencePrefix}-${month}` : null,
    }
  })
}

// ---------- Nettoyage (ordre des dépendances) ----------

async function wipe() {
  await prisma.$transaction([
    prisma.activity.deleteMany(),
    prisma.document.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.maintenanceComment.deleteMany(),
    prisma.maintenanceRequest.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.depositDeduction.deleteMany(),
    prisma.lease.deleteMany(),
    prisma.property.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

// ---------- Seed ----------

async function main() {
  let dbHost = "(inconnu)"
  try {
    dbHost = new URL(process.env.DATABASE_URL ?? "").host || dbHost
  } catch {
    // DATABASE_URL absente ou invalide : Prisma lèvera une erreur explicite
  }
  console.log(`Seed de la base ${dbHost} : suppression des données existantes...`)
  await wipe()

  const password = await bcrypt.hash(PASSWORD, 12)

  // --- Utilisateurs ---
  const [admin, landlord, manager, tenant, tenant2] = await Promise.all([
    prisma.user.create({
      data: { email: "admin@test.com", password, name: "Jean-Pierre Mbarga", phone: "+237 699 10 20 30", role: "ADMIN", emailVerified: daysAgo(400) },
    }),
    prisma.user.create({
      data: { email: "landlord@test.com", password, name: "Marie-Claire Ngo Bassong", phone: "+237 677 45 67 89", role: "LANDLORD", emailVerified: daysAgo(380) },
    }),
    prisma.user.create({
      data: { email: "manager@test.com", password, name: "Samuel Fotso", phone: "+237 655 12 34 56", role: "MANAGER", emailVerified: daysAgo(300) },
    }),
    prisma.user.create({
      data: { email: "tenant@test.com", password, name: "Aminatou Bello", phone: "+237 690 88 77 66", role: "TENANT", emailVerified: daysAgo(600) },
    }),
    prisma.user.create({
      data: { email: "tenant2@test.com", password, name: "Patrick Essomba", phone: "+237 696 55 44 33", role: "TENANT", emailVerified: daysAgo(120) },
    }),
  ])

  // --- Biens ---
  const bonapriso = await prisma.property.create({
    data: {
      name: "Appartement Bonapriso",
      address: "Rue Njo-Njo, immeuble Les Flamboyants, 3e étage",
      city: "Douala",
      state: "Littoral",
      postalCode: "BP 4051",
      country: "Cameroun",
      type: "APARTMENT",
      status: "OCCUPIED",
      bedrooms: 3,
      bathrooms: 2,
      area: 95,
      description:
        "Appartement lumineux de 3 chambres à Bonapriso, proche des commerces et du boulevard de la Liberté. Cuisine équipée, groupe électrogène et forage pour l'eau.",
      monthlyRent: 250000,
      securityDeposit: 500000,
      images: [],
      amenities: ["Climatisation", "Groupe électrogène", "Forage", "Parking", "Gardiennage 24h/24"],
      ownerId: landlord.id,
      managerId: manager.id,
    },
  })

  const bastos = await prisma.property.create({
    data: {
      name: "Villa Bastos",
      address: "Rue 1.750, quartier Bastos (face ambassade)",
      city: "Yaoundé",
      state: "Centre",
      postalCode: "BP 1120",
      country: "Cameroun",
      type: "HOUSE",
      status: "OCCUPIED",
      bedrooms: 4,
      bathrooms: 3,
      area: 220,
      description:
        "Villa duplex de 4 chambres avec jardin clôturé dans le quartier résidentiel de Bastos. Idéale pour une famille ou un cadre expatrié.",
      monthlyRent: 450000,
      securityDeposit: 900000,
      images: [],
      amenities: ["Jardin", "Garage 2 voitures", "Climatisation", "Chauffe-eau", "Groupe électrogène"],
      ownerId: landlord.id,
    },
  })

  const akwa = await prisma.property.create({
    data: {
      name: "Studio Akwa",
      address: "Boulevard de la Liberté, résidence Le Palmier, RDC",
      city: "Douala",
      state: "Littoral",
      postalCode: "BP 2290",
      country: "Cameroun",
      type: "STUDIO",
      status: "AVAILABLE",
      bedrooms: 1,
      bathrooms: 1,
      area: 32,
      description:
        "Studio meublé au cœur d'Akwa, idéal pour un jeune actif. Eau et électricité (ENEO) disponibles, proche des transports.",
      monthlyRent: 85000,
      securityDeposit: 170000,
      availableFrom: monthStart(1),
      images: [],
      amenities: ["Meublé", "Climatisation", "Internet fibre"],
      ownerId: landlord.id,
    },
  })

  // --- Baux ---
  // Bail A : Aminatou Bello à Bonapriso, actif (loyer le 5), caution conservée (HELD) avec une retenue
  const leaseA = await prisma.lease.create({
    data: {
      propertyId: bonapriso.id,
      tenantId: tenant.id,
      startDate: monthStart(-8),
      endDate: endOfMonth(monthStart(3)),
      monthlyRent: 250000,
      securityDeposit: 500000,
      status: "ACTIVE",
      paymentDay: 5,
      terms:
        "Bail d'habitation de 12 mois. Loyer payable d'avance le 5 de chaque mois. Les charges d'eau et d'électricité sont à la charge du locataire.",
      depositStatus: "HELD",
      depositReceivedAmount: 500000,
      depositReceivedAt: monthStart(-8),
      depositPaymentMethod: "MOBILE_MONEY",
      depositReference: "MOMO-CAUTION-BONAPRISO",
    },
  })

  // Bail B : Patrick Essomba à la Villa Bastos, actif (loyer le 1er), caution non encore reçue
  const leaseB = await prisma.lease.create({
    data: {
      propertyId: bastos.id,
      tenantId: tenant2.id,
      startDate: monthStart(-3),
      endDate: endOfMonth(monthStart(8)),
      monthlyRent: 450000,
      securityDeposit: 900000,
      status: "ACTIVE",
      paymentDay: 1,
      terms: "Bail d'habitation de 12 mois renouvelable. Loyer payable le 1er de chaque mois.",
      notes: "Caution à régulariser avant la fin du mois.",
      depositStatus: "NOT_RECEIVED",
    },
  })

  // Bail C : Aminatou Bello au Studio Akwa, expiré (avant son déménagement à Bonapriso), caution restituée
  const leaseC = await prisma.lease.create({
    data: {
      propertyId: akwa.id,
      tenantId: tenant.id,
      startDate: monthStart(-20),
      endDate: endOfMonth(monthStart(-9)),
      monthlyRent: 85000,
      securityDeposit: 170000,
      status: "EXPIRED",
      paymentDay: 1,
      depositStatus: "SETTLED",
      depositReceivedAmount: 170000,
      depositReceivedAt: monthStart(-20),
      depositPaymentMethod: "CASH",
      depositSettledAt: monthStart(-8, 15),
      depositRefundAmount: 170000,
      depositRefundMethod: "MOBILE_MONEY",
    },
  })

  // Retenue sur la caution du bail A
  await prisma.depositDeduction.create({
    data: {
      leaseId: leaseA.id,
      label: "Remplacement de la serrure de la porte d'entrée",
      amount: 25000,
      createdById: landlord.id,
      createdAt: daysAgo(30),
    },
  })

  // --- Échéances de loyer ---
  const paymentsA = buildPaymentSchedule({
    leaseId: leaseA.id,
    tenantId: tenant.id,
    startDate: leaseA.startDate,
    endDate: leaseA.endDate,
    monthlyRent: leaseA.monthlyRent,
    paymentDay: leaseA.paymentDay,
    overdueCount: 2,
    referencePrefix: "MOMO-BELLO",
    paidMethod: "MOBILE_MONEY",
  })
  const paymentsB = buildPaymentSchedule({
    leaseId: leaseB.id,
    tenantId: tenant2.id,
    startDate: leaseB.startDate,
    endDate: leaseB.endDate,
    monthlyRent: leaseB.monthlyRent,
    paymentDay: leaseB.paymentDay,
    overdueCount: 1,
    referencePrefix: "MOMO-ESSOMBA",
    paidMethod: "MOBILE_MONEY",
  })
  const paymentsC = buildPaymentSchedule({
    leaseId: leaseC.id,
    tenantId: tenant.id,
    startDate: leaseC.startDate,
    endDate: leaseC.endDate,
    monthlyRent: leaseC.monthlyRent,
    paymentDay: leaseC.paymentDay,
    overdueCount: 0,
    referencePrefix: "CASH-AKWA",
    paidMethod: "CASH",
  })
  await prisma.payment.createMany({ data: [...paymentsA, ...paymentsB, ...paymentsC] })

  const overdueA = await prisma.payment.findFirst({
    where: { leaseId: leaseA.id, status: "OVERDUE" },
    orderBy: { dueDate: "asc" },
  })
  const lastPaidB = await prisma.payment.findFirst({
    where: { leaseId: leaseB.id, status: "PAID" },
    orderBy: { dueDate: "desc" },
  })

  // --- Demandes de maintenance ---
  const leak = await prisma.maintenanceRequest.create({
    data: {
      title: "Fuite d'eau sous l'évier de la cuisine",
      description:
        "Depuis trois jours, de l'eau s'accumule dans le placard sous l'évier. Le siphon semble fissuré et le sol commence à gonfler.",
      propertyId: bonapriso.id,
      tenantId: tenant.id,
      assignedToId: manager.id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "Plomberie",
      scheduledDate: daysFromNow(2),
      images: [],
      createdAt: daysAgo(5),
    },
  })

  await prisma.maintenanceComment.create({
    data: {
      requestId: leak.id,
      authorId: manager.id,
      authorName: manager.name,
      authorRole: "MANAGER",
      content:
        "Plombier contacté, intervention prévue après-demain dans la matinée. Merci de couper l'arrivée d'eau sous l'évier en attendant.",
      images: [],
      createdAt: daysAgo(3),
    },
  })

  const paint = await prisma.maintenanceRequest.create({
    data: {
      title: "Peinture écaillée sur le balcon",
      description:
        "La peinture du mur du balcon côté jardin s'écaille à cause de l'humidité. Rien d'urgent, mais à prévoir avant la saison des pluies.",
      propertyId: bastos.id,
      tenantId: tenant2.id,
      status: "OPEN",
      priority: "LOW",
      category: "Peinture",
      images: [],
      createdAt: daysAgo(1),
    },
  })

  // --- Notifications ---
  await prisma.notification.createMany({
    data: [
      {
        userId: tenant.id,
        type: "PAYMENT_DUE",
        title: "Loyer en retard",
        message: "Votre loyer de 250 000 FCFA pour l'Appartement Bonapriso est en retard de paiement.",
        link: overdueA ? `/payments/${overdueA.id}` : `/leases/${leaseA.id}`,
        relatedId: overdueA?.id ?? leaseA.id,
        createdAt: daysAgo(2),
      },
      {
        userId: tenant.id,
        type: "MAINTENANCE_UPDATE",
        title: "Mise à jour de votre demande",
        message: "Samuel Fotso a commenté votre demande « Fuite d'eau sous l'évier de la cuisine ».",
        link: `/maintenance/${leak.id}`,
        relatedId: leak.id,
        read: true,
        readAt: daysAgo(2),
        createdAt: daysAgo(3),
      },
      {
        userId: manager.id,
        type: "MAINTENANCE_REQUEST",
        title: "Nouvelle demande de maintenance",
        message: "Aminatou Bello a signalé un problème à l'Appartement Bonapriso : fuite d'eau sous l'évier.",
        link: `/maintenance/${leak.id}`,
        relatedId: leak.id,
        read: true,
        readAt: daysAgo(4),
        createdAt: daysAgo(5),
      },
      {
        userId: landlord.id,
        type: "MAINTENANCE_REQUEST",
        title: "Nouvelle demande de maintenance",
        message: "Patrick Essomba a signalé un problème à la Villa Bastos : peinture écaillée sur le balcon.",
        link: `/maintenance/${paint.id}`,
        relatedId: paint.id,
        createdAt: daysAgo(1),
      },
      {
        userId: landlord.id,
        type: "PAYMENT_RECEIVED",
        title: "Paiement reçu",
        message: "Patrick Essomba a réglé son loyer de 450 000 FCFA pour la Villa Bastos.",
        link: lastPaidB ? `/payments/${lastPaidB.id}` : `/leases/${leaseB.id}`,
        relatedId: lastPaidB?.id ?? leaseB.id,
        read: true,
        readAt: daysAgo(20),
        createdAt: daysAgo(25),
      },
      {
        userId: tenant2.id,
        type: "SYSTEM",
        title: "Caution en attente",
        message: "Le dépôt de garantie de 900 000 FCFA pour la Villa Bastos n'a pas encore été enregistré.",
        link: `/leases/${leaseB.id}`,
        relatedId: leaseB.id,
        createdAt: daysAgo(7),
      },
    ],
  })

  // --- Messages ---
  await prisma.message.createMany({
    data: [
      {
        senderId: tenant.id,
        receiverId: landlord.id,
        subject: "Renouvellement du bail",
        content:
          "Bonjour Madame, mon bail arrive à échéance dans quelques mois. Serait-il possible d'envisager un renouvellement aux mêmes conditions ? Cordialement, Aminatou.",
        read: true,
        readAt: daysAgo(9),
        createdAt: daysAgo(10),
      },
      {
        senderId: landlord.id,
        receiverId: tenant.id,
        subject: "Re: Renouvellement du bail",
        content:
          "Bonjour Aminatou, oui bien sûr. Nous pourrons en discuter dès que les loyers en retard seront régularisés. Bonne journée.",
        createdAt: daysAgo(8),
      },
      {
        senderId: manager.id,
        receiverId: tenant2.id,
        subject: "Visite annuelle de la villa",
        content:
          "Bonjour Monsieur Essomba, nous souhaiterions planifier la visite annuelle de la Villa Bastos la semaine prochaine. Quel créneau vous conviendrait ?",
        createdAt: daysAgo(1),
      },
    ],
  })

  // --- Journal d'activité ---
  const activities: Prisma.ActivityCreateManyInput[] = [
    {
      userId: landlord.id,
      action: "CREATE_LEASE",
      entityType: "LEASE",
      entityId: leaseA.id,
      details: "Bail créé pour Aminatou Bello (Appartement Bonapriso)",
      createdAt: leaseA.startDate,
    },
    {
      userId: landlord.id,
      action: "CREATE_LEASE",
      entityType: "LEASE",
      entityId: leaseB.id,
      details: "Bail créé pour Patrick Essomba (Villa Bastos)",
      createdAt: leaseB.startDate,
    },
  ]
  if (lastPaidB) {
    activities.push({
      userId: landlord.id,
      action: "MARK_PAYMENT_PAID",
      entityType: "PAYMENT",
      entityId: lastPaidB.id,
      details: "Loyer de 450 000 FCFA marqué comme payé (Villa Bastos)",
      createdAt: lastPaidB.paidDate ?? daysAgo(25),
    })
  }
  await prisma.activity.createMany({ data: activities })

  // --- Récapitulatif ---
  const counts = {
    utilisateurs: await prisma.user.count(),
    biens: await prisma.property.count(),
    baux: await prisma.lease.count(),
    paiements: await prisma.payment.count(),
    maintenance: await prisma.maintenanceRequest.count(),
    notifications: await prisma.notification.count(),
    messages: await prisma.message.count(),
  }
  console.log("Seed terminé :", counts)
  console.log("")
  console.log(`Comptes de test (mot de passe : ${PASSWORD})`)
  console.log(`  ADMIN     admin@test.com      (${admin.name})`)
  console.log(`  LANDLORD  landlord@test.com   (${landlord.name})`)
  console.log(`  MANAGER   manager@test.com    (${manager.name})`)
  console.log(`  TENANT    tenant@test.com     (${tenant.name})`)
  console.log(`  TENANT    tenant2@test.com    (${tenant2.name})`)
}

main()
  .catch((error) => {
    console.error("Échec du seed :", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
