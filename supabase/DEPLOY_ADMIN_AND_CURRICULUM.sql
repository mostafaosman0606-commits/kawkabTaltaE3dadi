-- ==============================================================================
-- KAWKAB TALTA E3DADI — UPDATE ADMIN & SEED CURRICULUM (FIXED UUIDs)
-- ==============================================================================

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update existing Admin in auth.users (Fix Password & Confirm Email immediately)
UPDATE auth.users
SET 
  encrypted_password = crypt('06062012@Mostafa', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = '2ndprepplanet@gmail.com';

-- 3. Link or update the Admin Profile in public.profiles with role = 'admin'
INSERT INTO public.profiles (
  id, email, full_name, role, phone_number, governorate, school_name, subscription_tier, subscription_status
)
SELECT 
  u.id,
  u.email,
  'مصطفى عثمان (الإدارة)',
  'admin',
  '01103075485',
  'القاهرة',
  'الإدارة العامة لمنصة كوكب تالتة إعدادي',
  'premium',
  'active'
FROM auth.users u
WHERE u.email = '2ndprepplanet@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  subscription_tier = 'premium',
  subscription_status = 'active';

-- Also run helper function to ensure role is admin
SELECT public.set_user_as_admin('2ndprepplanet@gmail.com');

-- 4. Seed core units using valid gen_random_uuid()
INSERT INTO public.units (id, subject_id, title, order_index, description)
SELECT gen_random_uuid(), s.id, 'الوحدة الأولى: المشتقات وأعمالها الأدبية', 1, 'اسم الفاعل وصوغه، صيغ المبالغة، واسم المفعول وفق المنهج الوزاري المصري.'
FROM public.subjects s WHERE s.slug = 'arabic'
AND NOT EXISTS (SELECT 1 FROM public.units u WHERE u.subject_id = s.id AND u.order_index = 1);

INSERT INTO public.units (id, subject_id, title, order_index, description)
SELECT gen_random_uuid(), s.id, 'الوحدة الأولى: القوى والحركة', 1, 'الحركة في اتجاه واحد، السرعة القياسية والمتجهة، التمثيل البياني للعجلة المنتظمة.'
FROM public.subjects s WHERE s.slug = 'science'
AND NOT EXISTS (SELECT 1 FROM public.units u WHERE u.subject_id = s.id AND u.order_index = 1);

INSERT INTO public.units (id, subject_id, title, order_index, description)
SELECT gen_random_uuid(), s.id, 'الوحدة الأولى: العلاقات والدوال', 1, 'حاصل الضرب الديكارتي، العلاقات، والدوال وكثيرات الحدود وتمثيلها البياني.'
FROM public.subjects s WHERE s.slug = 'mathematics'
AND NOT EXISTS (SELECT 1 FROM public.units u WHERE u.subject_id = s.id AND u.order_index = 1);

-- 5. Seed core lessons linked to the units
INSERT INTO public.lessons (id, unit_id, subject_id, title, order_index, teacher_name, summary, content_html, video_url, is_published)
SELECT gen_random_uuid(), u.id, u.subject_id, 'اسم الفاعل وصوغه وإعماله', 1, 'أ/ مصطفى عثمان',
  'شرح طريقة صوغ اسم الفاعل من الثلاثي وغير الثلاثي وشروط إعماله عمل فعله مع أمثلة إعرابية كاملة.',
  '<div class="space-y-4"><h3 class="text-base font-bold text-cyan-300">مفهوم اسم الفاعل:</h3><p class="text-sm text-slate-200">اسم مشتق من حروف الفعل المبني للمعلوم ليدل على من قام بالفعل أو اتصف به.</p></div>',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', TRUE
FROM public.units u JOIN public.subjects s ON u.subject_id = s.id 
WHERE s.slug = 'arabic' AND u.order_index = 1
AND NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.unit_id = u.id AND l.order_index = 1);

INSERT INTO public.lessons (id, unit_id, subject_id, title, order_index, teacher_name, summary, content_html, video_url, is_published)
SELECT gen_random_uuid(), u.id, u.subject_id, 'الحركة في اتجاه واحد ومفهوم السرعة', 1, 'د/ أحمد الشناوي',
  'التمييز بين السرعة المنتظمة وغير المنتظمة وحساب السرعة المتوسطة مع مسائل تفاعلية.',
  '<div class="space-y-4"><h3 class="text-base font-bold text-cyan-300">مفهوم الحركة:</h3><p class="text-sm text-slate-200">تغير موضع الجسم بمرور الزمن بالنسبة لموضع جسم آخر ثابت.</p></div>',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', TRUE
FROM public.units u JOIN public.subjects s ON u.subject_id = s.id 
WHERE s.slug = 'science' AND u.order_index = 1
AND NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.unit_id = u.id AND l.order_index = 1);

-- 6. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
