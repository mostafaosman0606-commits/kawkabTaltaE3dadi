-- ==============================================================================
-- KAWKAB TALTA E3DADI — SUPABASE SQL SEED SCRIPT (PRODUCTION REAL CURRICULUM)
-- Seeds official users, subjects, units, lessons, exams, and settings
-- ==============================================================================

-- 1. Insert Initial Profiles
INSERT INTO public.profiles (id, email, full_name, role, phone_number, governorate, school_name, subscription_tier, subscription_status, subscription_expires_at)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ahmed@kawkab.edu.eg', 'أحمد محمود رضوان', 'student', '01012345678', 'القاهرة', 'مدرسة الشهداء الإعدادية بنين - الزيتون', 'premium', 'active', '2027-06-30 23:59:59+00'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'sara@kawkab.edu.eg', 'سارة خالد الدسوقي', 'student', '01123456789', 'الجيزة', 'مدرسة الزهور الإعدادية بنات - الدقي', 'standard', 'active', '2027-05-30 23:59:59+00'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'omar@kawkab.edu.eg', 'عمر شريف حسنين', 'student', '01234567890', 'الإسكندرية', 'مدرسة النصر الإعدادية بنين - سموحة', 'free', 'active', NULL),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'mariam@kawkab.edu.eg', 'مريم عمرو الشناوي', 'student', '01099881122', 'الدقهلية', 'مدرسة المنصورة الإعدادية بنات الحديثة', 'premium', 'active', '2027-06-30 23:59:59+00'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'youssef@kawkab.edu.eg', 'يوسف كريم عبد الله', 'student', '01555443322', 'الغربية', 'مدرسة طنطا الإعدادية بنين النموذجية', 'standard', 'active', '2027-05-15 23:59:59+00'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'nour@kawkab.edu.eg', 'نور الدين حسام فهمي', 'student', '01066778899', 'الشرقية', 'مدرسة الزقازيق الإعدادية بنين', 'premium', 'active', '2027-06-30 23:59:59+00'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'fatma@kawkab.edu.eg', 'فاطمة الزهراء علي ممدوح', 'student', '01199887766', 'أسيوط', 'مدرسة أسيوط الإعدادية النموذجية بنات', 'premium', 'active', '2027-06-30 23:59:59+00'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'teacher@kawkab.edu.eg', 'أستاذ محمد إبراهيم السيد', 'teacher', '01098765432', 'القاهرة', 'كبير معلمين - لغة عربية ودراسات إسلامية', 'premium', 'active', NULL),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'teacher.math@kawkab.edu.eg', 'أستاذة هبة أحمد مصطفى', 'teacher', '01288776655', 'الجيزة', 'معلم خبير رياضيات وعلوم - الشهادة الإعدادية', 'premium', 'active', NULL),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00', 'admin@kawkab.edu.eg', 'إدارة كوكب تالتة إعدادي (م. خالد عبد الرحمن)', 'admin', '01000000000', 'القاهرة', 'الإدارة العامة للمنصة التعليمية 2026', 'premium', 'active', NULL)
ON CONFLICT (email) DO NOTHING;

-- 2. Insert The Eight Official Subjects
INSERT INTO public.subjects (id, slug, name_ar, description, icon, color_primary, color_secondary, order_index, is_published)
VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'arabic', 'اللغة العربية', 'شرح فروع النحو، القراءة، النصوص الأدبية، والقصة المقررة (طموح جارية) مع تدريبات وزارية مكثفة.', 'BookOpen', '#10B981', '#059669', 1, TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'mathematics', 'الرياضيات', 'الجبر والإحصاء، حساب المثلثات، والهندسة التحليلية بحلول نموذجية وامتحانات المحافظات.', 'Calculator', '#0EA5E9', '#0284C7', 2, TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'english', 'اللغة الإنجليزية', 'منهج New Hello! Prep 3: القواعد اللغوية، الكلمات والمصطلحات، المحادثات، والتدريب على فقرات الكتابة.', 'Languages', '#6366F1', '#4F46E5', 3, TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'science', 'العلوم', 'القوى والحركة، الطاقة الضوئية والمرايا والعدسات، الكون والنظام الشمسي، والتكاثر والانقسام الخلوي.', 'Atom', '#06B6D4', '#0891B2', 4, TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'social-studies', 'الدراسات الاجتماعية', 'جغرافية العالم الطبيعية والبشرية والأقاليم المناخية، وتاريخ مصر الحديث والمعاصر وثورة 1952 وحرب أكتوبر.', 'Compass', '#F59E0B', '#D97706', 5, TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', 'islamic-studies', 'التربية الدينية', 'سورة لقمان وتفسير الوصايا، أحكام التجويد والمدود، الإيمان بالقضاء والقدر، وسيرة الصحابي أبو ذر الغفاري.', 'Sparkles', '#14B8A6', '#0D9488', 6, TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b07', 'computer-it', 'الحاسب وتكنولوجيا المعلومات', 'مفاهيم حل المشكلات، الرموز القياسية لخرائط التدفق (Flowcharts)، وأساسيات لغة البرمجة Visual Basic.NET.', 'Cpu', '#3B82F6', '#1D4ED8', 7, TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b08', 'art-education', 'التربية الفنية', 'الفن الشعبي المصري ورموزه الأصيلة، تاريخ الفن القبطي، أسس التصميم الابتكاري والتوافق اللوني والأشغال الفنية.', 'Palette', '#EC4899', '#DB2777', 8, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 3. Teacher Subject Assignments
INSERT INTO public.teacher_assignments (teacher_id, subject_id)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b06'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04')
ON CONFLICT DO NOTHING;

-- 4. Subscription Plans
INSERT INTO public.subscription_plans (id, tier, name_ar, price_egp, period_days, features, is_active)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'free', 'الباقة المجانية الاستكشافية', 0, 365, '["درس تجريبي مجاني في كل مادة", "دخول الامتحانات التدريبية", "5 أسئلة استرشادية مع روبو"]'::jsonb, TRUE),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'standard', 'الباقة القياسية (نجم الكوكب)', 150, 30, '["الوصول لجميع الدروس", "فيديوهات الشرح وملازم PDF", "امتحانات غير محدودة", "ملاحظات الدروس الدائمة"]'::jsonb, TRUE),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'premium', 'الباقة الذهبية الملكية (سيد الكوكب)', 250, 30, '["جميع مزايا القياسية", "غرف التحدي المباشر", "شهادات التفوق المعتمدة", "مساعد روبو غير محدود", "أولوية تصحيح المقالي"]'::jsonb, TRUE)
ON CONFLICT (tier) DO NOTHING;
