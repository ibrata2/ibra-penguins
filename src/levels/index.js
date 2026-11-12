import world1 from './world1.js';
import world2 from './world2.js';
import world3 from './world3.js';
import world4 from './world4.js';
import world5 from './world5.js';
export const WORLDS = [
  { id: 'ice', name: { ar: 'بركة البطاريق', en: 'Penguin Pond' }, theme: 'ice', levels: world1 },
  { id: 'jungle', name: { ar: 'غابة المايا', en: 'Mayan Jungle' }, theme: 'jungle', levels: world2 },
  { id: 'desert', name: { ar: 'سهول الأسود', en: 'Lion Fields' }, theme: 'desert', levels: world3 },
  { id: 'cave', name: { ar: 'كهوف الخفافيش', en: 'Bat Caves' }, theme: 'cave', levels: world4 },
  { id: 'night', name: { ar: 'تحدي الليل', en: 'Night Challenge' }, theme: 'night', levels: world5 },
];
for (const w of WORLDS) for (const l of w.levels) l.theme = l.theme || w.theme;
export const ALL_LEVELS = WORLDS.flatMap((w) => w.levels);
