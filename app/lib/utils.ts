export interface Payment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  startDate: string;
  initialBalance: number;
  payments: Payment[];
}

export const MONTHLY_FEE = 30000;

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const calculateStatus = (member: Member) => {
  const start = new Date(member.startDate);
  const now = new Date();
  
  // Calculate months difference
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const totalMonths = Math.max(0, years * 12 + months); // Current month is considered "in progress"
  
  // If we want to be precise: if today's day is >= start day, it's a full month.
  // But usually, subscription is billed at the start of the period.
  // Let's assume billing happens on the same day every month.
  let billingCycles = totalMonths;
  if (now.getDate() >= start.getDate()) {
    billingCycles += 1;
  }
  
  const totalOwed = billingCycles * MONTHLY_FEE;
  const totalPaid = member.initialBalance + member.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalPaid - totalOwed;
  
  return {
    totalOwed,
    totalPaid,
    balance,
    isOverdue: balance < 0,
    monthsElapsed: billingCycles
  };
};
