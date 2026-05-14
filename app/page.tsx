"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  History,
  DollarSign,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Member, 
  Payment, 
  MONTHLY_FEE, 
  formatCurrency, 
  calculateStatus 
} from "./lib/utils";
import { api } from "./lib/api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function NetflopDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>(MONTHLY_FEE.toString());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ name: "", initialBalance: "0", startDate: "" });
  const [isClient, setIsClient] = useState(false);

  // Persistence
  useEffect(() => {
    setIsClient(true);
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

  const addPayment = async () => {
    if (!selectedMember) return;
    const amount = parseInt(paymentAmount);
    if (isNaN(amount)) return;

    try {
      await api.addPayment(selectedMember.id, amount);
      await fetchMembers(); // Refresh data
      setIsPaymentModalOpen(false);
      setSelectedMember(null);
      setPaymentAmount(MONTHLY_FEE.toString());
    } catch (error) {
      console.error("Failed to add payment:", error);
    }
  };

  const updateMember = async () => {
    if (!editingMember) return;
    try {
      await api.updateMember(editingMember.id, {
        name: editForm.name,
        initialBalance: parseInt(editForm.initialBalance) || 0,
        startDate: editForm.startDate
      });
      await fetchMembers(); // Refresh data
      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error("Failed to update member:", error);
    }
  };

  const totalCollected = members.reduce((sum, m) => sum + calculateStatus(m).totalPaid, 0);
  const totalOwed = members.reduce((sum, m) => sum + calculateStatus(m).totalOwed, 0);

  if (!isClient) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="relative group">
          <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-6xl font-black text-primary tracking-tighter mb-2 relative"
          >
            NETFLOP
          </motion.h1>
          <p className="text-zinc-500 font-medium tracking-tight relative">Hệ thống quản lý quỹ Netflix gia đình</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-4">
            <StatCard 
              icon={<TrendingUp className="text-green-500" />}
              label="Tổng đã thu"
              value={formatCurrency(totalCollected)}
            />
            <StatCard 
              icon={<AlertCircle className="text-red-500" />}
              label="Tổng phí Netflix"
              value={formatCurrency(totalOwed)}
            />
          </div>
          
          <button 
            onClick={() => {
              const earliestDate = members.reduce((min, m) => {
                const date = new Date(m.startDate);
                return date < min ? date : min;
              }, new Date());
              
              const now = new Date();
              const formatMonthYear = (date: Date) => `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
              
              let text = `netflix từ ${formatMonthYear(earliestDate)} - ${formatMonthYear(now)} nhé:\n`;
              members.forEach(m => {
                const status = calculateStatus(m);
                const statusText = status.balance >= 0 
                  ? "Đã thu" 
                  : `${(Math.abs(status.balance) / 1000)}k`;
                text += `- ${m.name}: ${statusText}\n`;
              });
              
              navigator.clipboard.writeText(text);
              alert("Đã copy nội dung tổng kết vào bộ nhớ tạm!");
            }}
            className="bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-2 font-bold transition-all group active:scale-95"
          >
            <History className="text-primary group-hover:rotate-180 transition-transform duration-500" size={20} />
            TỔNG KẾT & COPY
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member, index) => (
          <MemberCard 
            key={member.id} 
            member={member} 
            index={index}
            onAddPayment={() => {
              setSelectedMember(member);
              setIsPaymentModalOpen(true);
            }}
            onEdit={() => {
              setEditingMember(member);
              setEditForm({
                name: member.name,
                initialBalance: member.initialBalance.toString(),
                startDate: member.startDate.split('T')[0]
              });
              setIsEditModalOpen(true);
            }}
          />
        ))}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <Modal onClose={() => setIsPaymentModalOpen(false)}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="text-primary" />
              Thu tiền: {selectedMember?.name}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold uppercase tracking-wider">Số tiền (VND)</label>
                <input 
                  type="number" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xl font-black focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[30000, 90000, 180000, 360000].map(val => (
                  <button 
                    key={val}
                    onClick={() => setPaymentAmount(val.toString())}
                    className="bg-white/5 hover:bg-zinc-800 py-3 rounded-xl text-xs font-bold transition-colors border border-white/5"
                  >
                    {val/1000}k
                  </button>
                ))}
              </div>

              <button 
                onClick={addPayment}
                className="w-full bg-primary hover:bg-red-700 py-4 rounded-xl font-black text-lg mt-4 transition-all shadow-lg shadow-primary/20"
              >
                XÁC NHẬN THU TIỀN
              </button>
            </div>
          </Modal>
        )}

        {isEditModalOpen && (
          <Modal onClose={() => setIsEditModalOpen(false)}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Settings className="text-primary" />
              Cài đặt: {editingMember?.name}
            </h2>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2 font-bold uppercase tracking-wider">Tên thành viên</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-bold focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2 font-bold uppercase tracking-wider">Số dư hiện có (VND)</label>
                  <input 
                    type="number" 
                    value={editForm.initialBalance}
                    onChange={(e) => setEditForm({ ...editForm, initialBalance: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-bold focus:border-primary outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 italic">* Nhập số tiền họ đang dư (ví dụ đã đóng trước 1 năm).</p>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2 font-bold uppercase tracking-wider">Ngày bắt đầu tính tiền</label>
                  <input 
                    type="date" 
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>

              {editingMember && editingMember.payments.length > 0 && (
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                    <History size={14} />
                    Lịch sử đóng tiền
                  </h3>
                  <div className="space-y-2">
                    {editingMember.payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <div>
                          <p className="font-bold text-sm">{formatCurrency(p.amount)}</p>
                          <p className="text-[10px] text-zinc-500">{new Date(p.date).toLocaleString('vi-VN')}</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (confirm("Xóa lịch sử này?")) {
                              try {
                                if (editingMember) {
                                  await api.deletePayment(p.id, editingMember.id);
                                  await fetchMembers(); // Refresh data
                                  // Update local editing member state to reflect deletion
                                  setEditingMember({ 
                                    ...editingMember, 
                                    payments: editingMember.payments.filter(pay => pay.id !== p.id) 
                                  });
                                }
                              } catch (error) {
                                console.error("Failed to delete payment:", error);
                              }
                            }
                          }}
                          className="text-[10px] text-red-500 hover:underline uppercase font-bold"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={updateMember}
                className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-black text-lg mt-4 transition-all sticky bottom-0"
              >
                LƯU THAY ĐỔI
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass relative w-full max-w-md rounded-3xl p-8 border-white/10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        {children}
      </motion.div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="glass px-6 py-4 rounded-2xl flex items-center gap-4 border-white/5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="bg-white/5 p-3 rounded-xl relative">{icon}</div>
      <div className="relative">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-black mb-0.5">{label}</p>
        <p className="text-2xl font-black tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function MemberCard({ member, index, onAddPayment, onEdit }: { member: Member, index: number, onAddPayment: () => void, onEdit: () => void }) {
  const status = calculateStatus(member);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass group relative overflow-hidden rounded-3xl p-7 border-white/5 hover:border-primary/40 transition-all duration-500"
    >
      <div className="absolute -right-24 -top-24 w-48 h-48 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />
      
      <div className="flex justify-between items-start mb-8 relative">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-all group-hover:scale-105 duration-500">
            <Users size={28} className="text-zinc-500 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="font-black text-xl tracking-tight group-hover:text-primary transition-colors">{member.name}</h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-tighter">Từ: {new Date(member.startDate).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
        
        <div className={cn(
          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border",
          status.isOverdue 
            ? "bg-red-500/10 text-red-500 border-red-500/20" 
            : "bg-green-500/10 text-green-500 border-green-500/20"
        )}>
          {status.isOverdue ? "Đang nợ" : "Đã đóng dư"}
        </div>
      </div>

      <div className="space-y-5 mb-8 relative">
        <div className="flex justify-between items-end">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Số dư hiện tại</span>
          <span className={cn(
            "text-3xl font-black tracking-tighter tabular-nums",
            status.isOverdue ? "text-red-500" : "text-green-500"
          )}>
            {formatCurrency(status.balance)}
          </span>
        </div>
        
        <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: status.isOverdue ? "30%" : "100%" }}
            className={cn(
              "h-full rounded-full",
              status.isOverdue ? "bg-red-500" : "bg-green-500"
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-[10px] uppercase font-black text-zinc-500 tracking-wider">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <p className="mb-1 opacity-50">Đã đóng</p>
            <p className="text-white text-sm">{formatCurrency(status.totalPaid)}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-right">
            <p className="mb-1 opacity-50">Chu kỳ</p>
            <p className="text-white text-sm">{status.monthsElapsed} tháng</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 relative">
        <button 
          onClick={onAddPayment}
          className="flex-[2] bg-primary hover:bg-red-700 text-white py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-primary/10 active:scale-95"
        >
          <DollarSign size={18} className="group-hover/btn:scale-125 transition-transform" />
          THU TIỀN
        </button>
        <button 
          onClick={onEdit}
          className="flex-1 bg-white/5 hover:bg-zinc-800 rounded-2xl flex items-center justify-center transition-all border border-white/5 active:scale-95"
        >
          <Settings size={20} className="text-zinc-500 group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>
    </motion.div>
  );
}
