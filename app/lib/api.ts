import { Member, Payment } from "./utils";

const API_BASE = "https://netflopbe.vercel.app/api";

export const api = {
  getMembers: async (): Promise<Member[]> => {
    const res = await fetch(`${API_BASE}/members`);
    return res.json();
  },

  updateMember: async (id: string, data: Partial<Member>): Promise<Member> => {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  addPayment: async (memberId: string, amount: number): Promise<Payment> => {
    const res = await fetch(`${API_BASE}/members/${memberId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date: new Date().toISOString() }),
    });
    return res.json();
  },

  deletePayment: async (id: string, memberId: string): Promise<void> => {
    await fetch(`${API_BASE}/payments/${id}?memberId=${memberId}`, {
      method: "DELETE"
    });
  }
};
