import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  BookOpen,
  ArrowRight,
  Flame,
  Star,
  X,
  Sparkles,
  CalendarDays,
  ListTodo,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { StudentScheduleSlot, StudentTask } from '../../types';

interface StudentScheduleViewProps {
  onBack?: () => void;
}

const DAYS_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const StudentScheduleView: React.FC<StudentScheduleViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const studentId = user?.id || 'guest-student';
  const subjects = db.getSubjects();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'schedule' | 'tasks'>('schedule');

  // Schedule State
  const [scheduleSlots, setScheduleSlots] = useState<StudentScheduleSlot[]>(() =>
    db.getStudentSchedule(studentId)
  );
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);

  // New Slot Form State
  const [slotDay, setSlotDay] = useState<number>(new Date().getDay());
  const [slotSubjectId, setSlotSubjectId] = useState(subjects[0]?.id || 'sub-math');
  const [slotTitle, setSlotTitle] = useState('');
  const [slotStart, setSlotStart] = useState('17:00');
  const [slotEnd, setSlotEnd] = useState('18:30');
  const [slotNotes, setSlotNotes] = useState('');

  // Tasks State
  const [tasks, setTasks] = useState<StudentTask[]>(() => db.getStudentTasks(studentId));
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState(subjects[0]?.nameAr || 'الرياضيات');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const reloadData = () => {
    setScheduleSlots(db.getStudentSchedule(studentId));
    setTasks(db.getStudentTasks(studentId));
  };

  // Add Schedule Slot Handler
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTitle.trim()) return;

    const targetSub = subjects.find((s) => s.id === slotSubjectId);

    db.saveStudentScheduleSlot({
      studentId,
      dayOfWeek: slotDay as any,
      subjectId: slotSubjectId,
      subjectName: targetSub?.nameAr || 'المادة',
      title: slotTitle.trim(),
      startTime: slotStart,
      endTime: slotEnd,
      notes: slotNotes.trim() || undefined,
      color: 'from-cyan-600 to-blue-600',
    });

    setShowAddSlotModal(false);
    setSlotTitle('');
    setSlotNotes('');
    reloadData();
  };

  // Delete Schedule Slot Handler
  const handleDeleteSlot = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الحصة من جدولك؟')) {
      db.deleteStudentScheduleSlot(id);
      reloadData();
    }
  };

  // Add Task Handler
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    db.saveStudentTask({
      studentId,
      title: taskTitle.trim(),
      subjectName: taskSubject,
      priority: taskPriority,
      completed: false,
    });

    setShowAddTaskModal(false);
    setTaskTitle('');
    reloadData();
  };

  // Toggle Task Completion
  const handleToggleTask = (taskId: string) => {
    const isNowCompleted = db.toggleStudentTask(taskId);
    if (isNowCompleted) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Confetti fallback
      }
    }
    reloadData();
  };

  // Delete Task Handler
  const handleDeleteTask = (taskId: string) => {
    db.deleteStudentTask(taskId);
    reloadData();
  };

  // Metrics
  const filteredSlotsForDay = scheduleSlots.filter((s) => s.dayOfWeek === selectedDay);
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const progressPercentage =
    tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-cyan-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>مخطط المذاكرة وتنظيم الوقت الذكي</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-alexandria">
              جدولي الدراسي اليومي والأسبوعي 📅
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              نظم جدول حصصك، وحدد أوقات مذاكرة مواد الشهادة الإعدادية، وتابع مهامك اليومية أولاً بأول لتصل للقمة.
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 self-start transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </button>
          )}
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>جدول الحصص والمذاكرة الأسبوعي ({scheduleSlots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tasks'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>مهام ومذاكرة اليوم ({tasks.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WEEKLY STUDY TIMETABLE */}
      {/* ======================================================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Days of week selector bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
              {DAYS_NAMES.map((dayName, idx) => {
                const count = scheduleSlots.filter((s) => s.dayOfWeek === idx).length;
                const isSelected = selectedDay === idx;
                const isToday = new Date().getDay() === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{dayName}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      {count} حصص {isToday ? '• اليوم' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setSlotDay(selectedDay);
                setShowAddSlotModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة موعد مذاكرة</span>
            </button>
          </div>

          {/* Slots list for selected day */}
          <div className="bg-[#0c1427]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">
                  مواعيد يوم {DAYS_NAMES[selectedDay]} ({filteredSlotsForDay.length} أوقات مذاكرة)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                منهج الشهادة الإعدادية المعتمد
              </span>
            </div>

            {filteredSlotsForDay.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <CalendarDays className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white text-sm">
                  لا توجد حصص أو مواعيد مذاكرة مسجلة ليوم {DAYS_NAMES[selectedDay]}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  اضغط على زر "إضافة موعد مذاكرة" لتحديد أوقات دروسك وواجباتك لهذا اليوم.
                </p>
                <button
                  onClick={() => {
                    setSlotDay(selectedDay);
                    setShowAddSlotModal(true);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/30 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة وقت مذاكرة الآن
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredSlotsForDay.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3 group shadow-md"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {slot.subjectName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            title="حذف الحصة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-white">{slot.title}</h4>
                      {slot.notes && (
                        <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                          {slot.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DAILY STUDY TASKS & TO-DO */}
      {/* ======================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="rounded-3xl bg-[#0c1427]/90 border border-cyan-500/30 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-base font-alexandria">
                    إنجاز المهام الدراسية اليومية
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  أنجزت {completedTasksCount} من إجمالي {tasks.length} مهمة
                </p>
              </div>

              <div className="text-xl font-extrabold text-cyan-400 font-mono">
                {progressPercentage}%
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-3 p-0.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 h-full rounded-full transition-all duration-500 shadow-sm shadow-cyan-400"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Actions & Filters */}
            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {(['all', 'pending', 'completed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      taskFilter === filter
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                    }`}
                  >
                    {filter === 'all' && 'جميع المهام'}
                    {filter === 'pending' && 'قيد التنفيذ'}
                    {filter === 'completed' && 'المكتملة'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAddTaskModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مهمة جديدة</span>
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-2.5">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 bg-[#0c1427]/80 border border-slate-800 rounded-3xl p-6 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-white text-sm">
                  {taskFilter === 'pending'
                    ? 'رائع! لا توجد مهام معلقة حالياً'
                    : 'لا توجد مهام في هذه القائمة'}
                </h4>
                <p className="text-xs text-slate-400">
                  أضف مهاماً جديدة لتبقى منظماً دائماً في مذاكرة الشهادة الإعدادية.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-slate-950/60 border-slate-900 opacity-70'
                      : 'bg-[#0c1427]/90 border-slate-800 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                          : 'border-slate-600 hover:border-cyan-400 bg-slate-900'
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs sm:text-sm font-bold block truncate ${
                          task.completed
                            ? 'line-through text-slate-500'
                            : 'text-white'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.subjectName && (
                        <span className="text-[10px] text-cyan-400 mt-0.5 inline-block font-medium">
                          {task.subjectName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        task.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {task.priority === 'high' ? 'أولوية قصوى' : task.priority === 'medium' ? 'متوسطة' : 'عادية'}
                    </span>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="حذف المهمة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                إضافة موعد مذاكرة أو حصة
              </h3>
              <button
                onClick={() => setShowAddSlotModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">اليوم:</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(Number(e.target.value))}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {DAYS_NAMES.map((d, i) => (
                      <option key={i} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">المادة:</label>
                  <select
                    value={slotSubjectId}
                    onChange={(e) => setSlotSubjectId(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">عنوان الحصة / المذاكرة:</label>
                <input
                  type="text"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  placeholder="مثال: مذاكرة درس النصوص وحل تدريباته..."
                  required
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">من الساعة:</label>
                  <input
                    type="time"
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    required
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">إلى الساعة:</label>
                  <input
                    type="time"
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    required
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">ملاحظات إضافية (اختياري):</label>
                <textarea
                  rows={2}
                  value={slotNotes}
                  onChange={(e) => setSlotNotes(e.target.value)}
                  placeholder="الصفحات المطلوب حلها، كتاب الوزارة..."
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-600/20"
                >
                  حفظ في الجدول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-cyan-400" />
                إضافة مهمة مذاكرة جديدة
              </h3>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">عنوان المهمة:</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="مثال: حل تدريبات النحو ص 45 في كتاب الأضواء..."
                  required
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">المادة الدراسية:</label>
                  <select
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.nameAr}>
                        {s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">الأولوية:</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="high">قصوى 🔴</option>
                    <option value="medium">متوسطة 🟡</option>
                    <option value="low">عادية 🟢</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-600/20"
                >
                  إضافة المهمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
