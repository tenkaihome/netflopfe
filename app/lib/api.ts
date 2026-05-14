import { Member, Payment } from "./utils";

const API_BASE = "http://localhost:4000/api";

export const api = {
  getMembers: async (): Promise<Member[]> => {
    const res = await fetch(`${API_BASE}/members`);
    return res.json();
  },

  addMember: async (name: string, startDate: string): Promise<Member> => {
    const res = await fetch(`${API_BASE}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate }),
    });
    return res.json();
  },

  deleteMember: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/members/${id}`, { method: "DELETE" });
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
