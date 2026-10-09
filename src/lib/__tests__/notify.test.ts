/**
 * @jest-environment node
 */
import type { PrismaClient } from "@prisma/client"
import { createElement } from "react"
import { notify, recipientIds } from "@/lib/notify"
import { sendEmail } from "@/lib/email"

jest.mock("@/lib/prisma", () => ({ prisma: {} }))
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(async () => ({ success: true, data: {} })),
}))

const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>

const prefs = {
  emailNotifications: true,
  emailPayments: true,
  emailLeases: true,
  emailMaintenance: true,
  emailMessages: true,
}

function fakeDb(users: Record<string, Partial<typeof prefs>>) {
  return {
    notification: { createMany: jest.fn(async () => ({ count: 0 })) },
    user: {
      findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, name: `Name ${id}`, email: `${id}@test.com`, ...prefs, ...users[id] }))
      ),
    },
  } as unknown as PrismaClient & {
    notification: { createMany: jest.Mock }
    user: { findMany: jest.Mock }
  }
}

beforeEach(() => sendEmailMock.mockClear())

describe("recipientIds", () => {
  it("deduplicates and drops empty ids", () => {
    expect(recipientIds({ userId: "a", userIds: ["b", "a", null, undefined, ""] })).toEqual(["a", "b"])
  })
})

describe("notify", () => {
  it("creates in-app notifications for everyone and emails only those who accept", async () => {
    const db = fakeDb({ b: { emailMessages: false } })
    const result = await notify(
      {
        userIds: ["a", "b"],
        type: "MESSAGE",
        title: "Nouveau message",
        message: "Hello",
        link: "/messages/1",
        relatedId: "1",
        email: {
          subject: "Nouveau message",
          react: (recipient) => createElement("p", null, `Bonjour ${recipient.name}`),
        },
      },
      db
    )

    expect(result).toEqual({ notified: 2, emailed: 1 })
    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "a", type: "MESSAGE", title: "Nouveau message", message: "Hello", link: "/messages/1", relatedId: "1" },
        { userId: "b", type: "MESSAGE", title: "Nouveau message", message: "Hello", link: "/messages/1", relatedId: "1" },
      ],
    })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ to: "a@test.com", subject: "Nouveau message" })
    )
  })

  it("sends no email without email content or when globally disabled", async () => {
    const db = fakeDb({ a: { emailNotifications: false } })
    await notify({ userId: "b", type: "PAYMENT_DUE", title: "t", message: "m" }, db)
    await notify(
      {
        userId: "a",
        type: "PAYMENT_DUE",
        title: "t",
        message: "m",
        email: { subject: "s", react: createElement("p") },
      },
      db
    )
    expect(db.notification.createMany).toHaveBeenCalledTimes(2)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("never fails because of the email step", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    const db = fakeDb({})
    db.user.findMany.mockRejectedValueOnce(new Error("db down"))
    const result = await notify(
      { userId: "a", type: "SYSTEM", title: "t", message: "m", email: { subject: "s", react: createElement("p") } },
      db
    )
    expect(result).toEqual({ notified: 1, emailed: 0 })
  })

  it("does nothing without recipients", async () => {
    const db = fakeDb({})
    expect(await notify({ userIds: [], type: "SYSTEM", title: "t", message: "m" }, db)).toEqual({
      notified: 0,
      emailed: 0,
    })
    expect(db.notification.createMany).not.toHaveBeenCalled()
  })
})
