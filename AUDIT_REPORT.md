# تقرير التدقيق التقني — Kawkab Talta E3dadi

تاريخ الفحص: 2026-11-03  
نطاق الفحص: ملفات المشروع، React/TypeScript، Supabase client calls، migrations والسياسات، Edge Function، Vercel API route، Auth/session، Storage ومواضع localStorage. لم يتم الاتصال بمشروع Supabase الحي، ولم تُقرأ أي قيمة سرية من `.env` أو تُجرّب بيانات اعتماد.

## ملخص تنفيذي

المشروع يستخدم Supabase في عدة وظائف، لكنه يظل هجينًا بشكل واسع؛ كثير من عمليات التخزين تحفظ محليًا أولًا ثم ترسل طلبًا سحابيًا في الخلفية، وأخطاء بعض عمليات المزامنة تُبتلع. لهذا لا يكفي نجاح واجهة المستخدم أو الـ Build لإثبات وصول البيانات للسحابة.

أعلى الأسباب المرتبطة بالأعراض:

1. `sbSaveConversation` يستخدم `upsert` للجدولين، بينما Migration السياسات لا تعرف سياسات `UPDATE` لهما. عند تعارض المعرف، `upsert` يحتاج صلاحية تحديث، فتُرفض الكتابة بـ 4xx رغم وجود سياسة INSERT.
2. رسائل ومحادثات روبو تُحفظ fire-and-forget وتُهمل أخطاؤها؛ كما أن `sbSaveConversation` لا يفحص أخطاء Supabase الناتجة ويعيد `true` حتى عند فشل الطلب.
3. في المصدر الحالي، `ensureUUID` يحوّل أي معرف مثل `conv-1793730502909-6jb6h` إلى UUID قبل الإرسال في `sbSaveConversation`. لذلك لا يفسر هذا المسار وحده ظهور 22P02 الآن؛ قد يكون الخطأ من نسخة منشورة قديمة/مسار آخر أو من قيمة تُرسل مباشرة. يلزم فحص طلب REST الفاشل في سجلات Supabase/المتصفح لتحديده نهائيًا.
4. CORS في Edge Function يرد على OPTIONS لكنه لا يحدد `Access-Control-Allow-Methods`. لا تسمح السياسة المفتوحة `*` بأذونات قاعدة بيانات، لكنها تسمح باستدعاء الوظيفة من أي Origin، كما أن الإعداد الحالي لا يحدد Origins الإنتاج المعتمدة.

## النتائج التفصيلية

| الخطورة | المشكلة والسبب الجذري | الملفات والأسطر | الحل المقترح | أثر الحل على البيانات الحالية |
|---|---|---|---|---|
| عالية | `upsert` المحادثة والرسائل يصطدم بسياسات RLS الناقصة: كانت توجد SELECT/INSERT/DELETE فقط ولا توجد UPDATE. عند وجود صف بنفس UUID يتطلب upsert UPDATE فيُرفض؛ أُعدت سياسة إصلاح مقيدة في Migration جديدة غير مطبقة. | `src/services/supabaseDb.ts:716-755`؛ `supabase/migrations/20261015000001_secure_kawkab_schema.sql:1062-1078` | Migration جديدة تضيف UPDATE للمالك فقط للمحادثات، وللرسائل المرتبطة بمحادثاته فقط، مع `USING` و`WITH CHECK`. تُراجع ثم تُطبّق يدويًا على المشروع المقصود. | لا حذف أو إعادة كتابة للصفوف. السياسة تغيّر الصلاحيات للمالك على صفوفه فقط. لن يظهر أثر حتى تطبيق Migration.
| عالية | نتيجة الكتابة السحابية لا يمكن الوثوق بها: كان `error` من upsert يُهمل، والاستدعاء fire-and-forget مع catch فارغ؛ أُضيف فحص الأخطاء وتسجيل رفض المزامنة في التعديل الحالي. | `src/services/supabaseDb.ts:716-755`؛ `src/services/storage.ts:82-89,2435,2462,2556` | فحص الأخطاء لكل طلب وإرجاع `false` عند الفشل؛ يسجل مخزن الواجهة الآن تعذر المزامنة مع الاحتفاظ بالنسخة المحلية. | لا تعديل للبيانات الموجودة؛ يمنع الإبلاغ الكاذب عن نجاح الكتابة.
| عالية | خطأ UUID لا يمكن نسبه للمصدر الحالي وحده: الحفظ يطبّع `conv.id` و`message.id`، ومخزن الواجهة يرقّي IDs legacy عند تحميل المحادثات. ظهور `conv-...` في Postgres يعني أن مسارًا آخر/نسخة منشورة لم تمر بهذا التطبيع أو أن التطبيق الحي يختلف عن الملفات المفحوصة. | `src/services/uuid.ts:1-18; src/services/supabaseDb.ts:716-755`؛ `src/services/storage.ts:2281-2307` | فرض تحقق/تطبيع UUID عند حد قاعدة البيانات واختبار regression للمعرف legacy، وتحديد طلب REST الذي يرسل القيمة قبل نشر التعديل. | استبدال معرف legacy محليًا فقط قبل الكتابة؛ لا تتغير معرفات UUID الصحيحة ولا توجد عملية ترحيل للصفوف الحالية.
| عالية | مفتاح Gemini اختياري لكن اسمه `VITE_GEMINI_API_KEY`، والواجهة تتصل بمزود الذكاء مباشرة عند تعذر Edge Function. أي قيمة تُبنى بـ VITE مرئية للمستخدم في bundle؛ أزيل اتصال الواجهة المباشر ومفتاح VITE في التعديل الحالي. | `src/services/aiService.ts:18-18,35-156,190-447`; `.env.example:16-21` | إزالة استدعاء Gemini من المتصفح وعدم قبول مفتاح عميل؛ إبقاء معالجة AI بالخادم فقط، مع fallback محلي لا يرسل المفتاح أو محتوى الطالب إلى طرف غير موثوق. | لا أثر على البيانات المحفوظة؛ عند فشل الخادم لن تعمل الإجابة التوليدية حتى إصلاح Edge Function وإعداد server secret.
| عالية | كان تسجيل الدخول يقبل حسابات localStorage بعد فشل Supabase Auth أو غياب profile، كما كان يستعيد جلسة محلية عند بدء الإنتاج؛ قُصر ذلك الآن على development. | `src/services/authContext.tsx:149-180`; مسار التخزين المحلي `182-191` | الإصلاح موجود في `src/services/authContext.tsx`: جلسات وحسابات localStorage وquick role switch تعمل في development فقط. | قد يمنع مستخدمين محليين غير مربوطين بـ Supabase من الدخول؛ لا يحذف بياناتهم. لا تُحذف حسابات محلية، لكن يلزم ربط الحسابات التي لا تملك Supabase Auth قبل نشر هذا التغيير.
| عالية | سياسة `system_settings` تسمح SELECT بـ `TRUE` على جدول Admin-controlled. إذا كان فيه أي قيم حساسة، يمكن لأي دور يملك صلاحية الجدول قراءتها وفق grants الفعلية. | `supabase/migrations/20261015000001_secure_kawkab_schema.sql:343-348,1080-1084` | أضيفت Migration تقصر SELECT على `is_admin()` لأن واجهة العميل لا تقرأ الجدول. يجب مراجعة القيم/grants الحية قبل تطبيقها؛ لم تُطبق migration. | لا تغييرات على البيانات؛ لا توجد قراءة للجدول من تطبيق الواجهة الحالي.
| متوسطة | CORS كان ينقصه تحديد الطرق وأصل السماح `*` واسع؛ أضيفت قائمة Origins صريحة وطرق POST/OPTIONS في التعديل الحالي. | `supabase/functions/robo-tutor/index.ts:11-27` | رد OPTIONS بـ 204 وتضمين `Access-Control-Allow-Methods`، واستخدام قائمة Origins الإنتاج/المعاينة المعتمدة من إعداد خادمي بعد حصر نطاقات Vercel. | لا أثر على بيانات DB. قد تُرفض Origins غير المدرجة؛ يلزم إدراج نطاقات Vercel الصحيحة قبل نشر الوظيفة.
| متوسطة | طبقة حفظ روبو تعتمد localStorage كمصدر محلي؛ التزامن السحابي غير مضمون تلقائيًا عند فشل الشبكة. أضيف تسجيل فشل الإرسال، لكن لا توجد queue/retry أو إشارة حالة في الواجهة بعد. | `src/services/storage.ts:2243-2462`; `src/services/supabaseDb.ts:1075-1077` | اعتبار السحابة مصدرًا أساسيًا للمستخدم المصادق، وجعل مزامنة المحلي صريحة مع queue/retry وحالة نجاح مرئية. عدم حذف النسخة المحلية أثناء الترحيل. | بيانات الأجهزة الحالية تبقى محليًا، وأضيف تسجيل فشل الإرسال؛ لا توجد queue/retry بعد.
| متوسطة | سياسة قراءة الوحدات عامة بـ `TRUE` وقد تكون مقصودة للمحتوى؛ `system_settings` لها migration تقييد منفصلة غير مطبقة حتى الآن. | Migration نفسها `:815,1082` | إبقاء الوحدات العامة فقط إن كانت منشورة/غير حساسة، ومراجعة system_settings/grants كما سبق. | لا أثر إذا بقيت سياسة الوحدات؛ تشديدها قد يمنع تصفح المحتوى للزائر.
| متوسطة | التعامل مع الصور: رفع Supabase يفشل ثم يُحوّل الملف إلى DataURL محليًا، ما يخفي عدم نجاح التخزين السحابي وقد يخلق روابط غير قابلة للمشاركة/ضخمة. حذف صورة التخزين يعتمد فك URL وقد لا يعالج المسارات ذات query/encoding بشكل سليم. | `src/services/supabaseDb.ts:1060-1132`; `supabase/migrations/20261028120000_lesson_storage_bucket.sql:1-70` | الإصلاح موجود: عند إعداد Supabase يرجع الرفع خطأ بدل fallback محلي، ومسار الحذف يتحقق من أصل URL والمسار. ما زال يلزم التحقق من سياسات bucket الحية. | لا حذف بيانات؛ تحسين سلوك الرفع الجديد. الصور المحلية الموجودة تبقى كما هي.
| متوسطة | `ensureInitialized` يمسح كل مفاتيح `kawkab_` في localStorage عند اختلاف version، ما قد يفقد بيانات محلية عند ترقية الإصدار. كما توجد مسارات `resetToEmptyState` وتهيئة أسئلة تمسح/تعيد بيانات محلية. | `src/services/storage.ts:832-844,863-867,909-918` | الإصلاح موجود: لا تُمسح مفاتيح localStorage عند اختلاف الإصدار ولا تُمسح الأسئلة تلقائيًا؛ `resetToEmptyState` محصور في development. | التعديل المقترح يحافظ على البيانات؛ السلوك الحالي قد يزيل نسخًا محلية سابقة عند اختلاف الإصدار.
| متوسطة | لم يكن في `package.json` script للاختبارات قبل إضافة اختبار UUID. سكربت `scripts/verify-backend.mjs` يبدو فحصًا ساكنًا (لا يثبت اتصال Auth/REST أو نجاح RLS)، وملفات schema/migrations وحدها لا تثبت أنها طُبقت على الإنتاج. | `package.json`; `scripts/verify-backend.mjs` | أضيف اختبار وحدة يمنع UUID legacy من المرور، واختبار تكامل منفصل يتطلب بيئة Supabase اختبارية ومستخدمين بأدوار محددة؛ لا تعتبر build إثبات backend. | لا أثر على البيانات.

## UUID والعلاقات

- `ai_conversations.id` و`ai_messages.id` و`ai_messages.conversation_id` كلها UUID، والعلاقة FK مع `ON DELETE CASCADE` في migration.
- `ai_conversations.user_id` مرتبط بـ `profiles.id` وRLS يقيده بـ `auth.uid()` للإدخال.
- `sbSaveConversation` يربط الرسالة بمعرف المحادثة المطبّع ويقص النص إلى 5000 حرف، لكنه لا يتحقق من أخطاء قاعدة البيانات قبل القول بالنجاح.
- المشروع ينشئ معظم مفاتيح جداول Postgres كـ UUID، لكن نماذج localStorage تحتوي IDs نصية legacy لكثير من الكيانات. تمرير أي ID محلي مثل `usr-*` إلى FK UUID قد ينتج 22P02 في مسارات غير المحادثات أيضًا. يجب فحص IDs لكل mutation قبل إرسالها؛ لم أتعامل مع كل مسارات الجداول بالتساوي في هذه الجولة.

## مصفوفة الخدمات

- **Auth:** Supabase persist/refresh session مفعّل (`src/services/supabase.ts:19-27`)، أصبح fallback المحلي development-only؛ `checkSupabaseHealth` يفحص Auth session فقط ولا يختبر REST أو Edge Function.
- **Database CRUD:** مركّز غالبًا في `src/services/supabaseDb.ts` ويغطي profiles، subjects/lessons، progress/attempts، certificates، challenges، notifications، goals، flashcards، المحادثات، group messages. بعض الدوال تعيد `false` عند الخطأ، لكن كثيرًا من callers يتجاهلون هذا الرد.
- **RLS:** migration الآمنة تفعّل RLS على الجداول المعرفة (الأسطر 731-761) وتعرّف سياسات مقيدة. Migration جديدة تقيد `system_settings` وتضيف تحديثًا لمالك محادثات Robo؛ لم تُطبق أي منهما على الإنتاج.
- **Edge Function:** يتحقق من Bearer JWT وينفذ quota RPC؛ صار quota fail-closed وCORS يتطلب `ALLOWED_ORIGINS`. يلزم ضبط النطاقات وSecrets والنشر الفعلي للتحقق.
- **Vercel API:** `api/robo-tutor.ts` مسار منفصل عن الواجهة؛ أضيف إليه JWT validation وفحص quota وحدود الرسالة، ويستخدم secrets خادمية. يلزم إعداد متغيرات Vercel، ولا يغني عن نشر Edge Function الحالية.
- **Storage:** bucket lesson-media وسياسات رفع/تعديل/حذف موجودة في Migration؛ الرفع العام القراءة يبدو مقصودًا لمحتوى الدروس، لكن لا يمكن إثبات وجود bucket/policies الفعلية على الإنتاج من الملفات.
- **localStorage:** مستخدم للمظهر/تذكيرات مناسبة محليًا، وكذلك كطبقة حفظ احتياطية لبيانات ذات طبيعة سحابية (محادثات، ملفات شخصية، تقدم، محاولات، شهادات، إشعارات، أهداف، بطاقات، محتوى). هذا يجعل cross-device sync تابعًا لنجاح كل mutation السحابي.

## ما يتطلب تحققًا يدويًا في Supabase/Vercel

1. التحقق من migration history الفعلية، وجود الجداول والأعمدة والفهارس/grants؛ خصوصًا سياسات UPDATE لـ `ai_conversations` و`ai_messages`.
2. فتح Network request الفاشل ونسخ endpoint/table/status/body بعد إزالة أي JWT أو بيانات طالب؛ هذا يحسم من أرسل UUID النصي ولماذا ظهرت 400.
3. تشغيل استعلامات قراءة فقط لاختبار RLS بمستخدم طالب ومستخدم admin: قراءة/إضافة/تحديث محادثة ورسائل، والتأكد أن طالبًا لا يصل لمحادثة آخر.
4. فحص Edge Function logs وdeployment status وSecrets دون مشاركة قيمها، وتجربة OPTIONS ثم POST من نطاق Vercel.
5. مراجعة `system_settings` grants/values، وOrigins الخاصة بـ Vercel production/preview، وسياسات Storage المنشورة.
6. فحص Vercel Environment Variables والتأكد من عدم وجود `VITE_GEMINI_API_KEY`؛ إن كان قد نُشر سابقًا، تدوير المفتاح من مزوده.

## حدود هذا التقرير

هذا تدقيق ساكن للنسخة الموجودة في مسار المشروع. لا يثبت حالة الإنتاج أو أي Migration مطبقة بالفعل، ولم تُنفذ تغييرات مباشرة في قاعدة البيانات أو Vercel. يلزم اختبار تكامل على Supabase غير إنتاجي بعد إعداد بيئة اختبار مصرح بها.

## تغييرات أُعدّت للمراجعة (لم تُنشر)

- أضيف `src/services/uuid.ts` كموضع واحد للتحقق/توليد UUID، وأضيفت اختبارات `tests/uuid.test.mjs` للحالة `conv-1793730502909-6jb6h` وللمعرف الصحيح/غير الصحيح، مع script `npm run test:uuid`.
- أصبح `sbSaveConversation` يرفض `userId` غير UUID، ويطبّع معرف المحادثة والرسائل، ويفحص كل استجابة Supabase ويعيد `false` عند فشل الجدول المقابل بدل إرجاع نجاح كاذب.
- استدعاءات حفظ Robo المحلية ما زالت تحفظ نسخة localStorage، لكنها تسجل الآن فشل المزامنة السحابية بدل ابتلاعه.
- أضيفت Migration `20261103000000_ai_conversation_owner_updates.sql` لسياسات UPDATE المقيدة بملكية الطالب. **لم تُطبق** على أي قاعدة بيانات.
- Edge Function صارت تطلب Origin ضمن `ALLOWED_ORIGINS` المحددة وتعلن POST/OPTIONS في preflight. يجب ضبط قائمة Origins الفعلية قبل نشرها.
- أزيل استخدام `VITE_GEMINI_API_KEY` واتصال Gemini من الواجهة؛ Robo يبقى على Edge Function، وتوليد الأسئلة يستخدم parser محليًا إلى أن يوجد endpoint خادمي لهذا الغرض.

## نتائج التحقق

- `git diff --check`: لم يجد whitespace errors.
- `npm run test:uuid`: **لم يُقيّم ملف الاختبار**؛ Node.js توقف أثناء حل المسار الرئيسي بخطأ `EPERM` على `C:\Users\EL-Dawlia`.
- `npm run build`: **لم يبدأ المترجم** للسبب نفسه؛ لم يصل التنفيذ إلى TypeScript أو Vite. تكرر العائق حتى بعد منح صلاحية قراءة للمسار الأب، ولذلك لا أعده نجاحًا أو فشلًا برمجيًا.
- لم يُختبر اتصال Auth/REST/Storage/Edge Function أو سياسات RLS على Supabase حي؛ يتطلب ذلك بيئة اختبار وOrigins/Secrets صحيحة. لا توجد تغييرات إنتاجية من هذه الجولة.

## قائمة العمل اليدوي المتبقية

1. مراجعة Migration الجديدة ثم تطبيقها يدويًا على مشروع Supabase الصحيح، وبعدها اختبار upsert كطالب واختبار منع الوصول بين طالبين.
2. ضبط `ALLOWED_ORIGINS` في Supabase Function Secrets على Origins الحقيقية لـ Vercel (وتضمين نطاقات preview المطلوبة)، ثم نشر Edge Function بموافقتك واختبار OPTIONS/POST.
3. فحص Vercel build/deployment وSupabase logs لإثبات سبب 22P02 و400 الفعلي، دون مشاركة JWT أو محتوى محادثات طلاب.
4. تشغيل `npm run test:uuid` و`npm run build` في بيئة التنفيذ التي تسمح لـ Node بحل مسار المشروع، ثم اختبار database reads/writes على مشروع Supabase غير إنتاجي.
5. تقرير مصير حسابات localStorage قبل تعطيل fallback الدخول، ومراجعة `system_settings` grants والبيانات الفعلية قبل تشديد سياسة القراءة.
6. إذا سبق استخدام `VITE_GEMINI_API_KEY` في Vercel، تدوير المفتاح عند مزوده وإزالة المتغير من إعدادات Vercel.




## استكمال إصلاحات الجولة الثانية

- أضيف تحقق UUID قبل معاملات Postgres التي تستخدم معرفات في أعمدة UUID (الملفات الشخصية، المواد/الدروس، التقدم والمحاولات، الشهادات، التحديات، الإشعارات، الطلبات، gamification، البطاقات، محادثات روبو ورسائل المجموعة). أي قيمة legacy غير صالحة تُسجّل كاسم الحقل وتُرفض محليًا قبل REST/RPC، بدل إرسال طلب ينتج 22P02/400.
- حصة AI أصبحت fail-closed: أخطاء RPC في المتصفح أو Edge Function أو Vercel endpoint توقف الطلب ولا تمنحه حصة مجانية.
- مسار Vercel القديم `/api/robo-tutor` كان غير مستخدم من الواجهة لكن عامًّا بلا مصادقة أو حصة؛ أصبح يتطلب Bearer session صالحًا، يتحقق من المستخدم عبر Supabase، يطبق RPC الحصة، ويتطلب Secrets خادمية، مع حدود للرسالة ومهلة للاتصال بالمزود.
- تسجيل الدخول/الجلسة المحلية وتبديل الدور المحلي أصبح تطويريًا فقط. في الإنتاج يلزم Supabase Auth وملف profile فعلي؛ التسجيل الذي يتطلب تأكيد بريد لا ينشئ جلسة محلية بديلة.
- أزيلت عمليات حذف الحساب التجريبي والمحاولات/المواعيد من constructor، وأزيلت tombstones التي كان التطبيق يضيفها تلقائيًا لحساب بعينه، وأزيل مسح الأسئلة عند التشغيل. عند اختلاف إصدار localStorage تُحفظ المفاتيح القديمة ويُهيأ الناقص فقط؛ `resetToEmptyState` محصور في development، وفشل quota لا يحذف محادثات أو مرفقات أو سجلات.
- رفع صورة الدرس عند إعداد Supabase لا يعود إلى DataURL محلي عند فشل السحابة؛ يرجع خطأ واضحًا. حذف الصور يتحقق من Origin ومسار bucket ويتجاهل query string.
- Migration `20261103000002_restrict_system_settings_read.sql` تقصر قراءة `system_settings` على المدير، بجانب Migration سياسات Robo السابقة. كلاهما ملفات مراجعة ولم يُطبّقا.
- Vercel server function يحتاج `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` في إعدادات الخادم؛ Edge Function يحتاج `ALLOWED_ORIGINS` exact origins. لا تضع هذه القيم ضمن متغيرات `VITE_`.

الأثر التشغيلي المتوقع: الحسابات التي كانت تدخل في الإنتاج من localStorage فقط لن تتمكن من المصادقة حتى تُنشأ/تُربط في Supabase Auth، ولا يتم حذف حساباتها المحلية بواسطة هذه التغييرات. يجب ترحيلها/التحقق منها يدويًا قبل نشر التغيير على Production.




