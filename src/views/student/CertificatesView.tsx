import React, { useState, useRef } from 'react';
import {
  Award,
  Download,
  Share2,
  Calendar,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Eye,
  X,
  Printer,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { sbVerifyCertificateOnline } from '../../services/supabaseDb';
import { Certificate } from '../../types';

export const CertificatesView: React.FC = () => {
  const { user } = useAuth();
  const certificates = user ? db.getCertificates(user.id) : [];
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const certificateRef = useRef<HTMLDivElement | null>(null);

  // Online / Database Verification State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ cert: Certificate | null; searched: boolean }>({
    cert: null,
    searched: false,
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!verifyInput.trim()) return;
    setIsVerifying(true);
    let found = db.getCertificateById(verifyInput.trim());
    if (!found) {
      found = await sbVerifyCertificateOnline(verifyInput.trim());
    }
    setVerifyResult({ cert: found, searched: true });
    setIsVerifying(false);
  };

  const handlePrintOrDownload = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="rounded-3xl glass-card p-6 sm:p-8 border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-400" />
              <h1 className="text-2xl font-bold text-white font-alexandria">
                سجل شهادات التفوق والتميز
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              شهادات رسمية صادرة عن منصة «كوكب تالتة إعدادي» برقم تسلسلي موثق ورمز QR للتحقق
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowVerifyModal(true);
                setVerifyResult({ cert: null, searched: false });
                setVerifyInput('');
              }}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>التحقق من صحة شهادة</span>
            </button>

            <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl text-center">
              <span className="text-[11px] text-amber-300 block">الشهادات المكتسبة</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {certificates.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Certificates Gallery */}
      {certificates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-card border border-slate-800 space-y-3">
          <Award className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">لم يتم إصدار شهادات بعد</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            اجتز امتحانات المواد الرسمية بدرجة 60% فأكثر وستصدر شهادة تفوقك الفورية تلقائياً هنا!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="rounded-2xl glass-card p-5 border border-amber-500/20 hover:border-amber-500/50 transition-all shadow-lg flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {cert.certificateNumber}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    النتيجة: {cert.scorePercentage}%
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-white">{cert.examTitle}</h3>
                  <p className="text-xs text-slate-400 mt-1">المادة: {cert.subjectName}</p>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    تاريخ الإصدار: {new Date(cert.issuedAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  معاينة وتحميل الشهادة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Preview of Certificate */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-amber-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                شهادة إلكترونية رسمية موثقة
              </span>
              <button
                onClick={() => setSelectedCert(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable High-Resolution Certificate Canvas */}
            <div
              ref={certificateRef}
              className="relative p-8 rounded-2xl bg-[#090e1c] border-4 border-amber-500/40 text-center space-y-6 shadow-inner print:m-0 print:border-2"
              style={{
                backgroundImage: 'radial-gradient(ellipse at center, #101c3d 0%, #070b14 100%)',
              }}
            >
              {/* Outer decorative borders */}
              <div className="border border-amber-400/30 p-6 rounded-xl space-y-5">
                
                {/* Header Logo */}
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <span className="text-xs font-bold text-cyan-400 block font-alexandria">
                      منصة كوكب تالتة إعدادي
                    </span>
                    <span className="text-[10px] text-slate-400">الشهادة الإعدادية العامة 2026</span>
                  </div>

                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/50 shadow-lg shadow-amber-500/20">
                    <img src="/logo.jpg" alt="كوكب تالتة" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-amber-300 font-alexandria tracking-wide">
                    شهادة تفوق وتميز
                  </h2>
                  <p className="text-xs text-slate-300">Certificate of Academic Excellence</p>
                </div>

                <p className="text-xs text-slate-300">
                  تشهد إدارة منصة «كوكب تالتة إعدادي» بأن الطالب / الطالبة:
                </p>

                <div className="py-2 border-b-2 border-dashed border-amber-500/40 max-w-md mx-auto">
                  <h3 className="text-2xl font-black text-white font-alexandria">
                    {selectedCert.studentName}
                  </h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed max-w-lg mx-auto">
                  قد اجتاز بنجاح وتفوق اختبار مادة <strong>({selectedCert.subjectName})</strong> بعنوان:{' '}
                  <span className="text-cyan-300 font-bold">{selectedCert.examTitle}</span> وحصل على تقدير ممتاز بنسبة نجاح:{' '}
                  <strong className="text-amber-400 font-mono text-base">{selectedCert.scorePercentage}%</strong>.
                </p>

                {/* Footer with Serial, QR, and Seal */}
                <div className="pt-4 border-t border-slate-800 flex items-end justify-between text-right text-[11px] text-slate-400">
                  <div className="space-y-1">
                    <p className="font-mono text-amber-300 font-bold">
                      الرقم التسلسلي: {selectedCert.certificateNumber}
                    </p>
                    <p>التاريخ: {new Date(selectedCert.issuedAt).toLocaleDateString('ar-EG')}</p>
                  </div>

                  {/* Real Scannable High-Res QR Code */}
                  <div className="p-2 bg-white rounded-xl inline-block shadow-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=${encodeURIComponent(selectedCert.qrCodeData)}`}
                      alt={`QR Code ${selectedCert.certificateNumber}`}
                      className="w-14 h-14 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                    <QrCode className="w-14 h-14 text-slate-950 hidden" />
                  </div>

                  <div className="text-left space-y-1">
                    <p className="font-bold text-white">إدارة التقييم الأكاديمي</p>
                    <p className="text-[10px] text-cyan-400 font-mono">VERIFIED BY KAWKAB</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                يمكنك طباعة الشهادة مباشرة أو حفظها بصيغة PDF عالية الدقة
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintOrDownload}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  طباعة / تحميل الشهادة
                </button>

                <button
                  onClick={() => setSelectedCert(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Online & Database Certificate Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-alexandria">
                  التحقق من صحة شهادة التفوق
                </h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              أدخل الرقم التسلسلي للشهادة للتحقق من اعتمادها وصحتها في قاعدة بيانات المنصة وسجل الأوائل الرسمي:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="مثال: CERT_17298..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleVerify}
                disabled={isVerifying || !verifyInput.trim()}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Search className="w-4 h-4" />
                <span>{isVerifying ? 'جار التحقق...' : 'فحص'}</span>
              </button>
            </div>

            {verifyResult.searched && (
              <div className="pt-2">
                {verifyResult.cert ? (
                  verifyResult.cert.isRevoked ? (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 font-bold text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>❌ تنبيه: هذه الشهادة ملغاة رسمياً</span>
                      </div>
                      <p>تم سحب وإلغاء هذه الشهادة من قِبل إدارة منصة كوكب تالتة إعدادي.</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✓ شهادة أصلية ومعتمدة رسمياً</span>
                      </div>
                      <div className="space-y-1 text-slate-300 pt-1 border-t border-emerald-500/20">
                        <p><strong>اسم الطالب:</strong> {verifyResult.cert.studentName}</p>
                        <p><strong>المادة:</strong> {verifyResult.cert.subjectName}</p>
                        <p><strong>الاختبار:</strong> {verifyResult.cert.examTitle}</p>
                        <p><strong>الدرجة المحققة:</strong> <span className="font-mono text-emerald-400">{verifyResult.cert.scorePercentage}%</span></p>
                        <p><strong>تاريخ الإصدار:</strong> {new Date(verifyResult.cert.issuedAt).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center">
                    لم يتم العثور على شهادة تطابق هذا الرقم التسلسلي. يرجى التحقق من الرقم المدخل.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
