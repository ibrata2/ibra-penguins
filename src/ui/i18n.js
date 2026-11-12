// UI strings. Add a language by adding a column.
export const STR = {
  play: ['العب', 'Play'], help: ['المساعدة', 'Help'], options: ['الخيارات', 'Options'], editor: ['محرر المراحل', 'Level Editor'], quit: ['خروج', 'Quit'],
  profiles: ['الملفات', 'Profiles'], empty: ['فارغ', 'Empty'], create: ['إنشاء', 'Create'], del: ['حذف', 'Delete'], back: ['رجوع', 'Back'],
  newProfile: ['ملف لاعب جديد', 'New Profile'], enterName: ['اكتب اسمك', 'Enter your name'], ok: ['موافق', 'OK'], cancel: ['إلغاء', 'Cancel'],
  levelsDone: ['المراحل المنجزة', 'Levels completed'], coins: ['العملات', 'Coins'], rating: ['التقييم', 'Rating'],
  sound: ['الصوت', 'Sound'], music: ['الموسيقى', 'Music'], effects: ['المؤثرات', 'Effects'], fullscreen: ['ملء الشاشة', 'Fullscreen'], language: ['اللغة', 'Language'],
  backToGame: ['رجوع', 'Back'], resume: ['متابعة', 'Resume'], restart: ['إعادة', 'Restart'], map: ['الخريطة', 'Map'], menu: ['القائمة', 'Menu'],
  goal: ['الهدف', 'Goal'], saveN: ['أنقذ {need} من {total} بطريق', 'Save {need} of {total} penguins'],
  start: ['ابدأ', 'Start'], next: ['التالي', 'Next'], retry: ['أعد المحاولة', 'Retry'], shop: ['متجر الهدايا', 'Gift Shop'],
  passed: ['نجحت', 'PASSED'], failed: ['فشلت', 'FAILED'],
  yourGoal: ['هدفك كان', 'Your goal was'], youSaved: ['أنقذت', 'You saved'], penguins: ['بطريق', 'penguins'], allSaved: ['أنقذت كل البطاريق!', 'You saved all the penguins!'],
  timeToBeat: ['الوقت المطلوب', 'Time to beat'], yourTime: ['وقتك', 'Your time'], collected: ['جمعت', 'Collected'], total: ['المجموع', 'Total'],
  dragHint: ['اسحب الأدوات إلى المرحلة', 'Drag gadgets into the level'], speedHint: ['تغيير سرعة اللعب', 'Change the game speed'],
  resetHint: ['إعادة المرحلة', 'Reset the level'], hintHint: ['تلميح: أين تضع الأداة', 'Hint: where to put a gadget'],
  rotateHint: ['كلك يمين للتدوير — العجلة لتغيير قوة المدفع', 'Right-click rotates — mouse wheel changes cannon power'],
  savedHint: ['البطاريق الناجية / المطلوب', 'Saved / needed'],
  rotate: ['تدوير', 'Rotate'], power: ['القوة', 'Power'], remove: ['إزالة', 'Remove'],
  locked: ['مقفلة', 'Locked'], best: ['أفضل وقت', 'Best time'], owned: ['تملكها', 'Owned'], equip: ['ارتداء', 'Wear'], equipped: ['مرتدية', 'Wearing'], buy: ['شراء', 'Buy'], notEnough: ['العملات لا تكفي', 'Not enough coins'],
  tutorial: ['شرح', 'Tutorial'], story: ['القصة', 'Story'],
  storyText: ['صديقنا <b>ثلجي</b> ضاع في حديقة الحيوانات الكبيرة! 🐧<br>آخر مرة شافوه قرب كهوف الخفافيش...<br>ساعد البطاريق يعبرون كل مناطق الحديقة حتى يلقون صديقهم.<br>كل مرحلة تخبرك كم بطريق لازم توصله لباب الخروج.',
    'Our friend <b>Snowy</b> went missing in the big zoo! 🐧<br>He was last seen near the Bat Caves...<br>Help the penguins cross every area of the zoo to find their friend.<br>Each level tells you how many penguins must reach the exit.'],
  endText: ['🎉 لقيتوا ثلجي! 🎉<br>البطاريق رجعت سوا للبركة، وكل الحديقة احتفلت.<br>شكراً لأنك أنقذت الجميع!', '🎉 You found Snowy! 🎉<br>The penguins are back together at the pond and the whole zoo celebrates.<br>Thanks for saving everyone!'],
  credits: ['برمجة وتطوير إبراهيم الخزرجي', 'Programming & development: Ibrahim Al-Khazraji'],
  about: ['حول', 'About'], upChecking: ['جاري فحص التحديث…', 'Checking for updates…'], upOk: ['النسخة حديثة', 'You have the latest version'], upNew: ['توجد نسخة جديدة', 'New version available'], upFail: ['تعذر فحص التحديث', 'Could not check for updates'], aboutGame: ['لعبة ألغاز البطاريق — أوصل البطاريق إلى باب الخروج باستخدام الأدوات', 'A penguin puzzle game — guide the penguins to the exit with gadgets'], version: ['الإصدار', 'Version'], telegram: ['قناة التليكرام', 'Telegram channel'], tiktok: ['تيك توك', 'TikTok'],
  friendName: ['ثلجي', 'Snowy'],
  myLevels: ['مراحلي', 'My Levels'], extraLevels: ['مراحل إضافية', 'Extra Levels'],
  // editor
  edTerrain: ['الأرض', 'Terrain'], edRect: ['مستطيل', 'Rectangle'], edEllipse: ['بيضوي', 'Ellipse'], edBrush: ['فرشاة', 'Brush'], edErase: ['ممحاة', 'Eraser'],
  edEntry: ['البداية', 'Entry'], edExit: ['الخروج', 'Exit'], edCoin: ['عملة', 'Coin'], edSpikes: ['أشواك', 'Spikes'], edDecor: ['زينة', 'Decor'], edSelect: ['تحريك/حذف', 'Move/Delete'],
  edMaterial: ['المادة', 'Material'], edTheme: ['المنطقة', 'Theme'], edName: ['اسم المرحلة', 'Level name'], edPenguins: ['عدد البطاريق', 'Penguins'], edNeed: ['المطلوب', 'Needed'],
  edRate: ['سرعة الخروج', 'Release gap'], edTime: ['الوقت (ثانية)', 'Time (s)'], edGadgets: ['الأدوات المتاحة', 'Available gadgets'],
  edTest: ['جرّب', 'Test'], edSave: ['حفظ', 'Save'], edNew: ['جديد', 'New'], edLoad: ['فتح', 'Open'], edExport: ['تصدير JSON', 'Export JSON'], edImport: ['استيراد', 'Import'], edUndo: ['تراجع', 'Undo'], edSize: ['الحجم', 'Size'],
  edSaved: ['تم الحفظ ✔', 'Saved ✔'], edTip: ['ارسم الأرض، ضع البداية والخروج، حدد الأدوات ثم جرّب. الحل الذي تنجح به يُحفظ كتلميح.', 'Draw terrain, place entry & exit, set gadgets, then test. The solution you win with becomes the hint.'],
  edDelete: ['حذف المرحلة', 'Delete level'], edEdit: ['تعديل', 'Edit'], edSolutionSaved: ['حُفظ حلّك كتلميح للمرحلة', 'Your solution was saved as the hint'],
  theme_ice: ['ثلج', 'Ice'], theme_jungle: ['غابة', 'Jungle'], theme_desert: ['صحراء', 'Desert'], theme_cave: ['كهف', 'Cave'], theme_night: ['ليل', 'Night'],
  helpText: [
    `<h3>طريقة اللعب</h3><p>البطاريق تمشي وحدها. مهمتك توصلها لباب <b>الخروج</b> باستخدام الأدوات.</p>
     <p>🖱️ <b>اسحب</b> الأداة من الشريط السفلي إلى المرحلة. <b>كلك يمين</b> يدوّرها. <b>عجلة الماوس</b> تغير قوة المدفع. اسحب أداة موجودة لتحريكها.</p>
     <p>⌨️ مسافة = إيقاف مؤقت · 1/2/3 = السرعة · R = تدوير · Delete = إزالة · H = تلميح · Esc = القائمة</p>
     <h3>الأدوات</h3>`,
    `<h3>How to play</h3><p>Penguins walk on their own. Get them to the <b>EXIT</b> using gadgets.</p>
     <p>🖱️ <b>Drag</b> a gadget from the bottom tray into the level. <b>Right-click</b> rotates it. <b>Mouse wheel</b> changes cannon power. Drag a placed gadget to move it.</p>
     <p>⌨️ Space = pause · 1/2/3 = speed · R = rotate · Delete = remove · H = hint · Esc = menu</p>
     <h3>Gadgets</h3>`],
  g_cannon: ['مدفع', 'Cannon'], g_spring: ['نابض', 'Spring'], g_bridge: ['جسر', 'Bridge'], g_fan: ['مروحة', 'Fan'], g_turner: ['لافتة اتجاه', 'Direction Sign'],
  gd_cannon: ['يقذف البطاريق بالزاوية والقوة التي تختارها', 'Launches penguins at the angle and power you choose'],
  gd_spring: ['يقفز بالبطاريق فوق الجدران القصيرة', 'Bounces penguins over short walls'],
  gd_bridge: ['لوح خشبي للعبور فوق الحفر أو كمنحدر', 'A plank to cross gaps or make a ramp'],
  gd_fan: ['يرفع البطاريق ويحميها من السقوط العالي', 'Lifts penguins and protects them from long falls'],
  gd_turner: ['يجعل البطاريق تمشي باتجاه السهم', 'Makes penguins walk the way the arrow points'],
  gd_fall: ['السقوط من ارتفاع كبير يؤذي البطاريق!', 'Falling from too high hurts penguins!'],
};

let lang = 'ar';
export const setLang = (l) => { lang = l; document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'; };
export const getLang = () => lang;
export function t(key, vars) {
  const row = STR[key];
  let s = row ? row[lang === 'ar' ? 0 : 1] : key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
export const tn = (obj) => (obj && (obj[lang] || obj.ar || obj.en)) || '';
