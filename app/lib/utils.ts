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
  const totalMonths = Math.max(0, years * 12 + months);
  
  let billingCycles = totalMonths;
  if (now.getDate() >= start.getDate()) {
    billingCycles += 1;
  }
  
  const totalOwed = billingCycles * MONTHLY_FEE;
  const totalPaid = member.initialBalance + member.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalPaid - totalOwed;
  
  // Tính chu kỳ thu tiếp theo
  // Số tháng đã được cover = tổng đã đóng / phí hàng tháng
  const monthsCovered = Math.floor(totalPaid / MONTHLY_FEE);
  // Tháng thu tiếp theo = startDate + monthsCovered tháng
  const nextDate = new Date(start);
  nextDate.setMonth(nextDate.getMonth() + monthsCovered);
  // Số dư còn lại sau khi trừ hết các tháng đã cover
  const remainingAfterCovered = totalPaid - (monthsCovered * MONTHLY_FEE);
  
  return {
    totalOwed,
    totalPaid,
    balance,
    isOverdue: balance < 0,
    monthsElapsed: billingCycles,
    nextCollectionDate: nextDate,
    monthsCovered,
    remainingBalance: remainingAfterCovered
  };
};
