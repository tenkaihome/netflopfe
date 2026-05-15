"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  History,
  DollarSign,
  Settings,
  Plus,
  Trash2,
  ClipboardList
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'history'>('members');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // Persistence
  useEffect(() => {
    setIsClient(true);
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setIsLoading(false);
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

  const addNewMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      await api.addMember(newMemberName, new Date().toISOString().split('T')[0]);
      await fetchMembers();
      setIsAddModalOpen(false);
      setNewMemberName('');
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Xóa thành viên này? Tất cả lịch sử thanh toán sẽ bị mất.")) return;
    try {
      await api.deleteMember(id);
      await fetchMembers();
      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error("Failed to delete member:", error);
    }
  };

  const totalCollected = members.reduce((sum, m) => sum + calculateStatus(m).totalPaid, 0);
  // Phí thu: chỉ tính những người đang nợ
  const totalToCollect = members.reduce((sum, m) => {
    const status = calculateStatus(m);
    return sum + (status.isOverdue ? Math.abs(status.balance) : 0);
  }, 0);

  if (!isClient || isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8 p-4 md:p-8 font-sans selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="relative group">
          <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl md:text-6xl font-black text-primary tracking-tighter mb-1 relative"
          >
            NETFLOP
          </motion.h1>
          <p className="text-xs md:text-sm text-zinc-500 font-medium tracking-tight relative">Quản lý quỹ Netflix gia đình</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
            <StatCard 
              icon={<TrendingUp className="text-green-500" size={16} />}
              label="Đã thu"
              value={formatCurrency(totalCollected)}
            />
            <StatCard 
              icon={<AlertCircle className="text-red-500" size={16} />}
              label="Phí thu"
              value={formatCurrency(totalToCollect)}
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
            className="bg-primary hover:bg-red-700 text-white px-5 py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 font-black text-xs md:text-sm transition-all group active:scale-95 shadow-lg shadow-primary/20"
          >
            <History size={18} />
            TỔNG KẾT & COPY
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center gap-3">
        <button onClick={() => setActiveTab('members')} className={cn("px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all", activeTab === 'members' ? "bg-primary text-white" : "bg-white/5 text-zinc-500 hover:bg-white/10")}>
          <Users size={14} className="inline mr-2 -mt-0.5" />Thành viên
        </button>
        <button onClick={() => setActiveTab('history')} className={cn("px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all", activeTab === 'history' ? "bg-primary text-white" : "bg-white/5 text-zinc-500 hover:bg-white/10")}>
          <ClipboardList size={14} className="inline mr-2 -mt-0.5" />Lịch sử thu
        </button>
      </div>

      {/* Main Content */}
      {activeTab === 'members' ? (
        <main className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {members.map((member, index) => (
            <MemberCard 
              key={member.id} 
              member={member} 
              index={index}
              onAddPayment={() => {
                setSelectedMember(member);
                const status = calculateStatus(member);
                setPaymentAmount(status.isOverdue ? Math.abs(status.balance).toString() : MONTHLY_FEE.toString());
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

          {/* Nút thêm thành viên - nằm trong grid */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: members.length * 0.05 }}
            onClick={() => setIsAddModalOpen(true)}
            className="glass group relative overflow-hidden rounded-[2rem] p-6 md:p-7 border-white/5 border-dashed border-2 hover:border-green-500/40 transition-all duration-500 flex flex-col items-center justify-center gap-3 min-h-[200px] cursor-pointer active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:scale-110 transition-transform">
              <Plus size={28} className="text-green-500" />
            </div>
            <p className="font-black text-sm text-zinc-500 group-hover:text-green-500 transition-colors uppercase tracking-wider">Thêm thành viên</p>
          </motion.button>
          </div>
        </main>
      ) : (
        <HistoryTab members={members} />
      )}

      {/* Modals */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <Modal onClose={() => setIsPaymentModalOpen(false)}>
            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="text-primary" />
              Thu tiền: {selectedMember?.name}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-2 font-bold uppercase tracking-wider">Số tiền (VND)</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={Number(paymentAmount).toLocaleString('vi-VN')}
                  onChange={(e) => setPaymentAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xl md:text-2xl font-black focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[30000, 90000, 180000, 360000].map(val => (
                  <button 
                    key={val}
                    onClick={() => setPaymentAmount(val.toString())}
                    className="bg-white/5 hover:bg-zinc-800 py-3 rounded-xl text-xs font-bold transition-colors border border-white/5"
                  >
                    {val.toLocaleString('vi-VN')}
                  </button>
                ))}
              </div>

              <button 
                onClick={addPayment}
                className="w-full bg-primary hover:bg-red-700 py-4 rounded-xl font-black text-lg mt-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                XÁC NHẬN
              </button>
            </div>
          </Modal>
        )}

        {isEditModalOpen && (
          <Modal onClose={() => setIsEditModalOpen(false)}>
            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
              <Settings className="text-primary" />
              Cài đặt: {editingMember?.name}
            </h2>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 font-bold uppercase tracking-wider">Tên thành viên</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 font-bold focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 font-bold uppercase tracking-wider">Số dư hiện có (VND)</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    value={editForm.initialBalance}
                    onChange={(e) => setEditForm({ ...editForm, initialBalance: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 font-bold focus:border-primary outline-none"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1 italic">* Nhập số tiền họ đang dư.</p>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 font-bold uppercase tracking-wider">Ngày bắt đầu tính tiền</label>
                  <input 
                    type="date" 
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>

              {editingMember && editingMember.payments.length > 0 && (
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                    <History size={14} />
                    Lịch sử
                  </h3>
                  <div className="space-y-2">
                    {editingMember.payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <div>
                          <p className="font-bold text-sm">{formatCurrency(p.amount)}</p>
                          <p className="text-[10px] text-zinc-600">{new Date(p.date).toLocaleString('vi-VN')}</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (confirm("Xóa lịch sử này?")) {
                              try {
                                if (editingMember) {
                                  await api.deletePayment(p.id, editingMember.id);
                                  await fetchMembers();
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

              <div className="flex gap-2 mt-4 sticky bottom-0">
                <button 
                  onClick={updateMember}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-black text-lg transition-all active:scale-95"
                >
                  LƯU THAY ĐỔI
                </button>
                <button 
                  onClick={() => editingMember && removeMember(editingMember.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-4 rounded-xl transition-all active:scale-95"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </Modal>
        )}

        {isAddModalOpen && (
          <Modal onClose={() => setIsAddModalOpen(false)}>
            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-green-500" />
              Thêm thành viên
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-2 font-bold uppercase tracking-wider">Tên thành viên</label>
                <input 
                  type="text" 
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-bold focus:border-green-500 outline-none"
                />
              </div>
              <button 
                onClick={addNewMember}
                className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-black text-lg transition-all active:scale-95"
              >
                THÊM THÀNH VIÊN
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  const touchStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      <motion.div 
        ref={modalRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="glass relative w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 border-white/10 overflow-hidden max-h-[90vh] md:max-h-[80vh] overflow-y-auto custom-scrollbar"
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full md:hidden" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        {children}
      </motion.div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="glass px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 border-white/5 relative overflow-hidden group shrink-0 min-w-[140px] md:min-w-0">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="bg-white/5 p-2 md:p-3 rounded-lg md:rounded-xl relative">{icon}</div>
      <div className="relative">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-0.5">{label}</p>
        <p className="text-sm md:text-xl font-black tabular-nums">{value}</p>
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
      className="glass group relative overflow-hidden rounded-[2rem] p-6 md:p-7 border-white/5 hover:border-primary/40 transition-all duration-500"
    >
      <div className="absolute -right-24 -top-24 w-48 h-48 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />
      
      <div className="flex justify-between items-start mb-6 md:mb-8 relative">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-all group-hover:scale-105 duration-500">
            <Users size={24} className="text-zinc-600 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="font-black text-lg md:text-xl tracking-tight group-hover:text-primary transition-colors truncate max-w-[120px] md:max-w-none">{member.name}</h3>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">Từ: {new Date(member.startDate).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
        
        <div className={cn(
          "px-2 md:px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tighter border",
          status.isOverdue 
            ? "bg-red-500/10 text-red-500 border-red-500/20" 
            : "bg-green-500/10 text-green-500 border-green-500/20"
        )}>
          {status.isOverdue ? "Nợ" : "Dư"}
        </div>
      </div>

      <div className="space-y-4 mb-6 md:mb-8 relative">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Hiện tại</span>
          <span className={cn(
            "text-2xl md:text-3xl font-black tracking-tighter tabular-nums",
            status.isOverdue ? "text-red-500" : "text-green-500"
          )}>
            {formatCurrency(status.balance)}
          </span>
        </div>
        
        <div className="h-1.5 md:h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: status.isOverdue ? "30%" : "100%" }}
            className={cn(
              "h-full rounded-full",
              status.isOverdue ? "bg-red-500" : "bg-green-500"
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3 md:gap-4 text-[9px] md:text-[10px] uppercase font-black text-zinc-600 tracking-wider">
          <div className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/5">
            <p className="mb-0.5 opacity-50">Đã đóng</p>
            <p className="text-white text-xs md:text-sm">{formatCurrency(status.totalPaid)}</p>
          </div>
          <div className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/5 text-right">
            <p className="mb-0.5 opacity-50">Chu kỳ</p>
            <p className="text-white text-xs md:text-sm">{status.monthsElapsed} thg</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 relative">
        <button 
          onClick={onAddPayment}
          className="flex-[3] bg-primary hover:bg-red-700 text-white py-3.5 md:py-4 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-primary/10 active:scale-95"
        >
          <DollarSign size={16} className="group-hover/btn:scale-125 transition-transform" />
          THU TIỀN
        </button>
        <button 
          onClick={onEdit}
          className="flex-1 bg-white/5 hover:bg-zinc-800 rounded-2xl flex items-center justify-center transition-all border border-white/5 active:scale-95"
        >
          <Settings size={18} className="text-zinc-600" />
        </button>
      </div>
    </motion.div>
  );
}

function HistoryTab({ members }: { members: Member[] }) {
  const allPayments = members.flatMap(m => 
    m.payments.map(p => ({ ...p, memberName: m.name, memberId: m.id }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allPayments.length === 0) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20 text-zinc-600">
        <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
        <p className="font-bold">Chưa có lịch sử thu tiền nào</p>
      </div>
    );
  }

  // Nhóm theo tháng
  const grouped: Record<string, typeof allPayments> = {};
  allPayments.forEach(p => {
    const d = new Date(p.date);
    const key = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {Object.entries(grouped).map(([month, payments]) => {
        const totalMonth = payments.reduce((s, p) => s + p.amount, 0);
        return (
          <div key={month} className="glass rounded-2xl border-white/5 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h3 className="font-black text-sm uppercase tracking-wider">Tháng {month}</h3>
              <div className="text-right">
                <p className="text-[10px] text-zinc-600 uppercase font-bold">Tổng thu</p>
                <p className="font-black text-green-500">{formatCurrency(totalMonth)}</p>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {payments.map((p, i) => (
                <div key={`${p.id}-${i}`} className="flex justify-between items-center px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Users size={14} className="text-zinc-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{p.memberName}</p>
                      <p className="text-[10px] text-zinc-600">{new Date(p.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <p className="font-black text-green-500">+{formatCurrency(p.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
