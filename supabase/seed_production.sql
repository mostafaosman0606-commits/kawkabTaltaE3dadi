-- ==============================================================================
-- KAWKAB TALTA E3DADI — PRODUCTION SEED (SAFE & APPROVED PRICING)
-- File: supabase/seed_production.sql
-- 
-- ⚠️  هذا الملف للإنتاج فقط — لا يحتوي على حسابات وهمية أو بيانات تجريبية.
-- ✅  يحتوي على: المواد الدراسية الثمانية الرسمية + خطط الاشتراك المعتمدة + الإعدادات الأساسية.
-- ❌  لا يحتوي على: مستخدمين وهميين، أرقام هواتف، إيميلات تجريبية، درجات، امتحانات.
--
-- الحسابات الحقيقية تُنشأ عبر Supabase Auth فقط.
-- المشرف الأول: يُنشئ حسابه عبر Auth ثم يُفعّل كمسؤول عبر:
--    SELECT public.set_user_as_admin('your-admin@email.com');
-- ==============================================================================

-- 1. المواد الدراسية الثمانية الرسمية للصف الثالث الإعدادي
INSERT INTO public.subjects (id, slug, name_ar, description, icon, color_primary, color_secondary, order_index, is_published)
VALUES
  (uuid_generate_v4(), 'arabic',          'اللغة العربية',              'شرح فروع النحو والصرف، القراءة، النصوص الأدبية، القصة المقررة، مع تدريبات وزارية مكثفة.',                                    'BookOpen',   '#10B981', '#059669', 1, TRUE),
  (uuid_generate_v4(), 'mathematics',     'الرياضيات',                  'الجبر والإحصاء، حساب المثلثات، والهندسة التحليلية بحلول نموذجية وامتحانات المحافظات.',                                        'Calculator', '#0EA5E9', '#0284C7', 2, TRUE),
  (uuid_generate_v4(), 'english',         'اللغة الإنجليزية',           'منهج New Hello! Prep 3: القواعد اللغوية، المفردات، المحادثات، والتدريب على الكتابة.',                                          'Languages',  '#6366F1', '#4F46E5', 3, TRUE),
  (uuid_generate_v4(), 'science',         'العلوم',                     'القوى والحركة، الطاقة الضوئية والمرايا والعدسات، الكون والنظام الشمسي، التكاثر والانقسام الخلوي.',                            'Atom',       '#06B6D4', '#0891B2', 4, TRUE),
  (uuid_generate_v4(), 'social-studies',  'الدراسات الاجتماعية',        'جغرافية العالم الطبيعية والبشرية، تاريخ مصر الحديث، ثورة 1952، حرب أكتوبر.',                                                  'Compass',    '#F59E0B', '#D97706', 5, TRUE),
  (uuid_generate_v4(), 'islamic-studies', 'التربية الدينية الإسلامية',  'سورة لقمان، أحكام التجويد والمدود، الإيمان بالقضاء والقدر، سيرة الصحابة.',                                                     'Sparkles',   '#14B8A6', '#0D9488', 6, TRUE),
  (uuid_generate_v4(), 'computer-it',     'الحاسب وتكنولوجيا المعلومات','مفاهيم حل المشكلات، الرموز القياسية لخرائط التدفق (Flowcharts)، أساسيات Visual Basic.NET.',                                  'Cpu',        '#3B82F6', '#1D4ED8', 7, TRUE),
  (uuid_generate_v4(), 'art-education',   'التربية الفنية',              'الفن الشعبي المصري، تاريخ الفن القبطي، أسس التصميم الابتكاري والتوافق اللوني والأشغال الفنية.',                               'Palette',    '#EC4899', '#DB2777', 8, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 2. خطط الاشتراك الثلاث (الأسعار الرسمية المعتمدة في كود المنصة: القياسية 90 ج.م، الملكية 150 ج.م)
INSERT INTO public.subscription_plans (tier, name_ar, price_egp, period_days, features, is_active)
VALUES
  ('free',     'الباقة المجانية الاستكشافية',       0,   365,
   '["درس تجريبي مجاني في كل مادة", "دخول الامتحانات التدريبية", "أسئلة يومية مع روبو"]'::jsonb,
   TRUE),
  ('standard', 'الباقة القياسية (نجم الكوكب)',    90,  30,
   '["الوصول لجميع الدروس في المواد الثمانية", "مذكرات وملخصات وملازم PDF", "امتحانات واختبارات تدريبية غير محدودة", "ملاحظات الدروس الدائمة"]'::jsonb,
   TRUE),
  ('premium',  'الباقة الذهبية الملكية (سيد الكوكب)', 150,  30,
   '["جميع مزايا الباقة القياسية", "غرف التحدي والمنافسة الحية المباشرة", "شهادات النجاح والتفوق المعتمدة", "مساعد روبو الذكي غير المحدود", "أولوية تصحيح الأسئلة المقالية"]'::jsonb,
   TRUE)
ON CONFLICT (tier) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  price_egp = EXCLUDED.price_egp,
  period_days = EXCLUDED.period_days,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- 3. إعدادات النظام الأساسية
INSERT INTO public.system_settings (key, value)
VALUES
  ('platform_name',       '"كوكب تالتة إعدادي"'),
  ('contact_whatsapp',    '"01000000000"'),
  ('contact_facebook',    '"https://facebook.com/kawkab.prep3"'),
  ('platform_active',     'true'),
  ('maintenance_mode',    'false'),
  ('ai_monthly_limits',   '{"free": 5, "standard": 30, "premium": -1}')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- ملاحظات ما بعد التثبيت:
-- ==============================================================================
-- 1. لإنشاء أول حساب مشرف:
--    أ. سجّل عبر Supabase Auth (عبر المنصة أو Dashboard → Auth)
--    ب. شغّل في SQL Editor:
--       SELECT public.set_user_as_admin('your-admin@email.com');
--
-- 2. لإنشاء حسابات المعلمين:
--    أ. المعلم يسجّل عبر صفحة التسجيل العادية
--    ب. المشرف يغيّر دوره:
--       UPDATE public.profiles SET role = 'teacher' WHERE email = 'teacher@email.com';
--    ج. المشرف يعيّن المادة للمعلم:
--       INSERT INTO public.teacher_assignments (teacher_id, subject_id)
--       SELECT p.id, s.id FROM public.profiles p, public.subjects s
--       WHERE p.email = 'teacher@email.com' AND s.slug = 'arabic'
--       ON CONFLICT (teacher_id, subject_id) DO NOTHING;
-- ==============================================================================
