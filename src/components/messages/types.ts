export interface MessageParticipant {
  id: string
  name: string
  email: string
  role: string
}

export interface MessageItem {
  id: string
  subject: string
  content: string
  senderId: string
  receiverId: string
  read: boolean
  readAt: string | null
  createdAt: string
  sender: MessageParticipant
  receiver: MessageParticipant
}

export type MessageFilter = "all" | "received" | "sent"
