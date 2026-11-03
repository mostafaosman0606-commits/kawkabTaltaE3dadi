import React from 'react';
import {
  Feather,
  Calculator,
  FlaskConical,
  Atom,
  Globe,
  Languages,
  Moon,
  Cpu,
  Palette,
  BookOpen,
} from 'lucide-react';
import { Subject } from '../types';

interface SubjectIconProps {
  subject: Partial<Subject> | { id?: string; slug?: string; nameAr?: string; icon?: string };
  className?: string;
  size?: number;
}

export const getSubjectLucideIcon = (
  subject: Partial<Subject> | { id?: string; slug?: string; nameAr?: string; icon?: string }
): React.ComponentType<{ className?: string; size?: number }> => {
  const slug = (subject.slug || '').toLowerCase();
  const id = (subject.id || '').toLowerCase();
  const nameAr = (subject.nameAr || '').toLowerCase();
  const iconName = (subject.icon || '').toLowerCase();

  // 1. اللغة العربية
  if (slug.includes('arabic') || id.includes('arabic') || nameAr.includes('عرب') || iconName.includes('feather')) {
    return Feather;
  }

  // 2. الرياضيات / Math
  if (
    slug.includes('math') ||
    id.includes('math') ||
    nameAr.includes('رياضيات') ||
    nameAr.includes('math') ||
    iconName.includes('calc') ||
    iconName.includes('sigma')
  ) {
    return Calculator;
  }

  // 3. العلوم / Science
  if (slug.includes('science-en') || id.includes('science-en')) {
    return Atom;
  }
  if (slug.includes('science') || id.includes('science') || nameAr.includes('علوم') || iconName.includes('flask')) {
    return FlaskConical;
  }

  // 4. التربية الدينية
  if (
    slug.includes('religion') ||
    slug.includes('islamic') ||
    id.includes('religion') ||
    nameAr.includes('دين') ||
    iconName.includes('moon')
  ) {
    return Moon;
  }

  // 5. التربية الفنية
  if (slug.includes('art') || id.includes('art') || nameAr.includes('فني') || iconName.includes('palette')) {
    return Palette;
  }

  // 6. اللغة الإنجليزية
  if (slug.includes('english') || id.includes('english') || nameAr.includes('إنجليز') || iconName.includes('language')) {
    return Languages;
  }

  // 7. الدراسات الاجتماعية
  if (slug.includes('social') || id.includes('social') || nameAr.includes('دراسات') || iconName.includes('globe')) {
    return Globe;
  }

  // 8. الحاسب وتكنولوجيا المعلومات
  if (slug.includes('computer') || id.includes('computer') || nameAr.includes('حاسب') || iconName.includes('cpu')) {
    return Cpu;
  }

  return BookOpen;
};

export const SubjectIcon: React.FC<SubjectIconProps> = ({ subject, className = 'w-5 h-5', size }) => {
  const IconComponent = getSubjectLucideIcon(subject);
  return <IconComponent className={className} size={size} />;
};
