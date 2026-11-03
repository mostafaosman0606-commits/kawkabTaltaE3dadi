import React, { useState, useRef } from 'react';
import {
  User,
  CreditCard,
  Crown,
  Sparkles,
  CheckCircle2,
  Upload,
  Phone,
  AlertCircle,
  Clock,
  Send,
  Building,
  MapPin,
  Save,
  Camera,
  Image as ImageIcon,
  Trash2,
  X,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { SubscriptionPlan, SubscriptionTier, SubscriptionRequest } from '../../types';
import { EGYPT_GOVERNORATES } from '../../constants/governorates';

export const ProfileView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const plans = db.getPlans();
  const requests = user ? db.getSubscriptionRequests().filter((r) => r.studentId === user.id) : [];

  // Edit Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [governorate, setGovernorate] = useState(user?.governorate || 'القاهرة');
  const [schoolName, setSchoolName] = useState(user?.schoolName || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Avatar Management State
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  // Preset Cosmic Avatars for instant selection
  const COSMIC_AVATARS = [
    { id: 'av-1', name: 'رائد فضاء 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
    { id: 'av-2', name: 'رائد فضاء 2', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200' },
    { id: 'av-3', name: 'بطل الفضاء', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
    { id: 'av-4', name: 'نجم كوكب تالتة', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
    { id: 'av-5', name: 'شعار كوكب تالتة', url: '/logo.jpg' },
  ];

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleSaveAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = (newUrl: string) => {
    if (!user) return;
    setAvatarUrl(newUrl);
    db.updateProfile(user.id, { avatarUrl: newUrl });
    refreshUser();
    setIsAvatarModalOpen(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleResetAvatar = () => {
    if (!user) return;
    const defaultAvatar = '/logo.png';
    handleSaveAvatar(defaultAvatar);
  };

  // Upgrade / Subscription Modal State
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'vodafone_cash' | 'instapay' | 'fawry' | 'whatsapp'>('vodafone_cash');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    db.updateProfile(user.id, {
      fullName,
      phoneNumber,
      governorate,
      schoolName,
      avatarUrl: avatarUrl || user.avatarUrl,
    });
    refreshUser();
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleProofFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendSubscriptionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPlan) return;

    db.createSubscriptionRequest({
      studentId: user.id,
      studentName: user.fullName,
      studentEmail: user.email,
      studentPhone: phoneNumber || user.phoneNumber || '',
      planId: selectedPlan.id,
      tier: selectedPlan.tier,
      paymentMethod,
      senderPhone,
      transactionRef,
      paymentProofUrl: proofUrl || undefined,
    });

    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestSubmitted(false);
      setSelectedPlan(null);
      setProofUrl(null);
      setSenderPhone('');
      setTransactionRef('');
    }, 2500);
  };

  const governorates = EGYPT_GOVERNORATES;

  return (
    <div className="space-y-8">
      
      {/* 1. Header & Active Subscription Card */}
      <div className="rounded-3xl glass-card p-6 sm:p-8 border border-cyan-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
          <div className="relative group/avatar cursor-pointer shrink-0" onClick={() => setIsAvatarModalOpen(true)}>
            <img
              src={user?.avatarUrl || '/logo.png'}
              alt={user?.fullName}
              className="w-20 h-20 rounded-2xl border-2 border-cyan-400 object-cover shadow-lg shadow-cyan-500/20 group-hover/avatar:scale-105 transition-all"
            />
            <div className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity text-white text-[10px] font-bold gap-1">
              <Camera className="w-5 h-5 text-cyan-300" />
              <span>تغيير</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAvatarModalOpen(true);
              }}
              className="absolute -bottom-1 -left-1 p-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md border border-cyan-400 transition-transform hover:scale-110"
              title="تعديل الصورة الشخصية"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white font-alexandria">
                {user?.fullName}
              </h1>
              {user?.subscriptionTier === 'premium' && (
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {user?.schoolName} — محافظة {user?.governorate}
            </p>
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold mx-auto sm:mx-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>تغيير / رفع صورة للملف الشخصي</span>
            </button>
          </div>
        </div>

        {/* Current Tier Badge */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-right space-y-1">
          <span className="text-[11px] text-slate-400 block">باقتك الحالية</span>
          <span className="text-sm font-bold text-cyan-300 block">
            {user?.subscriptionTier === 'premium'
              ? 'الباقة المميزة (كل المزايا + روبو + التحديات + الشهادات)'
              : user?.subscriptionTier === 'standard'
              ? 'الباقة القياسية (كل الدروس والفيديوهات والملخصات)'
              : 'الباقة المجانية (درس مجاني واختبارات تجريبية)'}
          </span>
          {user?.subscriptionExpiresAt && (
            <span className="text-[10px] text-slate-500 block">
              صالحة حتى: {new Date(user.subscriptionExpiresAt).toLocaleDateString('ar-EG')}
            </span>
          )}
        </div>
      </div>

      {/* 2. Subscriptions & Pricing Plans (Configurable & Tier Restrictions) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-alexandria flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              باقات الاشتراك والترقية
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              اختر الباقة المناسبة لاحتياجاتك واستمتع بالميزات الحصرية وتصحيح الواجبات والتحديات المباشرة
            </p>
          </div>

          {/* Direct WhatsApp Subscription Button */}
          <a
            href="https://wa.me/201103075485?text=مرحباً%20أرغب%20في%20الاشتراك%20في%20منصة%20كوكب%20تالتة%20إعدادي"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0 border border-emerald-400/40 hover:scale-[1.02]"
          >
            <Phone className="w-4 h-4" />
            <span>اشتراك وتنسيق فوري عبر واتساب 💬</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = user?.subscriptionTier === plan.tier;
            const isPremium = plan.tier === 'premium';

            return (
              <div
                key={plan.id}
                className={`rounded-3xl glass-card p-6 border flex flex-col justify-between transition-all relative overflow-hidden ${
                  isPremium
                    ? 'border-amber-500/50 shadow-xl shadow-amber-500/10 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900'
                    : isCurrent
                    ? 'border-cyan-500/50'
                    : 'border-slate-800'
                }`}
              >
                {isPremium && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black text-[10px] px-3 py-1 rounded-br-xl">
                    الأكثر تميزاً 👑
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-white">{plan.nameAr}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-black text-white font-mono">
                        {plan.priceEgp}
                      </span>
                      <span className="text-xs text-slate-400">جنيه مصري / شهرياً</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-center text-xs font-bold border border-slate-700">
                      باقتك المفعلة حالياً ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      ترقية إلى هذه الباقة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Pending or Previous Subscription Requests History */}
      {requests.length > 0 && (
        <div className="rounded-2xl glass-card p-6 border border-cyan-500/15 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">سجل طلبات الاشتراكات السابقة</h3>
          </div>

          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      طلب ترقية: {req.tier === 'premium' ? 'الباقة الذهبية الملكية' : 'الباقة القياسية'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : req.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {req.status === 'approved' ? 'تمت الموافقة والتفعيل' : req.status === 'rejected' ? 'تم الرفض' : 'قيد المراجعة الإدارية'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    طريقة الدفع: {req.paymentMethod} • التاريخ: {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                  </p>
                  {req.adminNotes && (
                    <p className="text-[11px] text-cyan-300 mt-1">
                      ملاحظة الإدارة: {req.adminNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Edit Personal Profile Form */}
      <div className="rounded-2xl glass-card p-6 border border-cyan-500/20 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">تعديل البيانات الشخصية والمدرسة</h3>
          </div>

          {saveSuccessMsg && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              تم حفظ البيانات بنجاح
            </span>
          )}
        </div>

        <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex items-center gap-4 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <img
              src={user?.avatarUrl || avatarUrl || '/logo.png'}
              alt={fullName}
              className="w-14 h-14 rounded-2xl border-2 border-cyan-400 object-cover shadow-md shrink-0"
            />
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">صورة الملف الشخصي</span>
              <p className="text-[11px] text-slate-400">يمكنك رفع صورتك الخاصة من جهازك أو اختيار شخصية فضائية</p>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>تغيير / رفع صورة</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">الاسم الكامل (ثلاثي أو رباعي):</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">رقم الهاتف (واتساب):</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="010xxxxxxxx"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 text-left font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">المحافظة:</label>
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
            >
              {governorates.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">اسم المدرسة الإعدادية:</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="مدرسة ..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>

      {/* 5. Upgrade Subscription Modal Workflow */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base font-alexandria">
                  طلب ترقية إلى {selectedPlan.nameAr}
                </h3>
                <span className="text-xs text-cyan-300 font-mono font-bold">
                  القيمة: {selectedPlan.priceEgp} جنيه مصري
                </span>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {requestSubmitted ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-base">تم إرسال طلب الاشتراك بنجاح!</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يقوم مسؤولو المنصة الآن بمراجعة إيصال التحويل، وسيتم تفعيل حسابك مباشرة فور التحقق.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSubscriptionRequest} className="space-y-4">
                
                {/* WhatsApp Step Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="font-bold text-emerald-300 text-sm">خطوة واحدة سهلة للاشتراك:</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    تواصل مباشرة مع فريق المنصة عبر واتساب على الرقم{' '}
                    <strong className="text-emerald-400 font-mono text-sm underline">01103075485</strong>{' '}
                    لإرسال تفاصيل الدفع وإتمام تفعيل الباقة فوراً، أو املأ بيانات التحويل بالأسفل لإرسال إشعار للإدارة.
                  </p>
                  <a
                    href={`https://wa.me/201103075485?text=${encodeURIComponent(
                      `مرحباً منصة كوكب تالتة إعدادي، أود الاشتراك وتفعيل ${selectedPlan?.nameAr || 'الباقة'} (قيمة: ${selectedPlan?.priceEgp || ''} جنيه) - اسم الطالب: ${user?.fullName || ''}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>📱</span>
                    <span>التواصل مع رقم الواتساب ثم إكمال الإجراءات (01103075485)</span>
                  </a>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">رقم الهاتف المحول منه:</label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 text-left font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">الرقم المرجعي أو كود العملية (اختياري):</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="مثال: TXN-89304"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Proof image upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">صورة إيصال التحويل (سكرين شوت):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-300 hover:file:bg-slate-700"
                  />
                  {proofUrl && (
                    <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تم إرفاق صورة الإيصال بنجاح
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    إرسال طلب التفعيل
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* 6. Avatar Upload & Preset Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base font-alexandria">
                  تعديل صورة الملف الشخصي
                </h3>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Avatar Display */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <img
                src={user?.avatarUrl || avatarUrl || '/logo.png'}
                alt="الصورة الحالية"
                className="w-24 h-24 rounded-2xl border-2 border-cyan-400 object-cover shadow-xl shadow-cyan-500/20"
              />
              <span className="text-xs text-slate-400">الصورة الحالية لملفك الشخصي</span>
            </div>

            {/* Action 1: Upload from device */}
            <div className="space-y-2">
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>رفع صورة من جهازك (كمبيوتر / هاتف)</span>
              </button>
            </div>

            {/* Action 2: Choose from cosmic presets */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-300 font-semibold block">
                أو اختر شخصية فضائية جاهزة:
              </span>
              <div className="grid grid-cols-5 gap-2.5">
                {COSMIC_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => handleSaveAvatar(av.url)}
                    className="p-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 hover:scale-105 transition-all flex flex-col items-center group/av"
                    title={av.name}
                  >
                    <img
                      src={av.url}
                      alt={av.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Action 3: Reset / Close */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={handleResetAvatar}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إعادة تعيين للصورة الافتراضية</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
