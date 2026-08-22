import type { Reciter, Track } from '../types';

function makeAvatar(initials: string, arabic: string, bg = '#059669', gold = '#f59e0b'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <rect width="120" height="120" rx="36" fill="${bg}"/>
    <circle cx="60" cy="60" r="46" fill="#047857" stroke="${gold}" stroke-width="3" stroke-dasharray="4 2"/>
    <circle cx="60" cy="60" r="34" fill="#064e3b"/>
    <text x="60" y="56" font-family="'Amiri', serif" font-size="24" font-weight="bold" fill="${gold}" text-anchor="middle">${arabic}</text>
    <text x="60" y="78" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const RECITERS: Reciter[] = [
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    arabicName: 'مشاري بن راشد العفاسي',
    style: 'Murattal',
    photoUrl: makeAvatar('MRA', 'العفاسي'),
    serverUrl: 'https://server8.mp3quran.net/afs/'
  },
  {
    id: 'minshawi_murattal',
    name: 'Mohamed Siddiq Al-Minshawi',
    arabicName: 'محمد صديق المنشاوي (مرتل)',
    style: 'Murattal',
    photoUrl: makeAvatar('MSM', 'المنشاوي'),
    serverUrl: 'https://server10.mp3quran.net/minsh/'
  },
  {
    id: 'minshawi_mujawwad',
    name: 'Al-Minshawi (Mujawwad)',
    arabicName: 'محمد صديق المنشاوي (مجود)',
    style: 'Mujawwad',
    photoUrl: makeAvatar('MSM', 'المنشاوي'),
    serverUrl: 'https://server10.mp3quran.net/minsh/Almusshaf-Al-Mojawwad/'
  },
  {
    id: 'husary',
    name: 'Mahmoud Khalil Al-Husary',
    arabicName: 'محمود خليل الحصري',
    style: 'Murattal (Tajweed Master)',
    photoUrl: makeAvatar('MKH', 'الحصري'),
    serverUrl: 'https://server13.mp3quran.net/husr/'
  },
  {
    id: 'abdulbasit',
    name: 'Abdulbasit Abdulsamad',
    arabicName: 'عبد الباسط عبد الصمد',
    style: 'Mujawwad',
    photoUrl: makeAvatar('ABA', 'عبد الباسط'),
    serverUrl: 'https://server7.mp3quran.net/basit/'
  },
  {
    id: 'sudais',
    name: 'Abdul Rahman Al-Sudais',
    arabicName: 'عبد الرحمن السديس',
    style: 'Murattal (Haram Makkah)',
    photoUrl: makeAvatar('ARS', 'السديس'),
    serverUrl: 'https://server11.mp3quran.net/sds/'
  },
  {
    id: 'shuraim',
    name: 'Saud Al-Shuraim',
    arabicName: 'سعود الشريم',
    style: 'Murattal (Haram Makkah)',
    photoUrl: makeAvatar('SAS', 'الشريم'),
    serverUrl: 'https://server7.mp3quran.net/shur/'
  },
  {
    id: 'muaiqly',
    name: 'Maher Al-Muaiqly',
    arabicName: 'ماهر المعيقلي',
    style: 'Murattal',
    photoUrl: makeAvatar('MAM', 'المعيقلي'),
    serverUrl: 'https://server12.mp3quran.net/maher/'
  },
  {
    id: 'dosari',
    name: 'Yasser Al-Dosari',
    arabicName: 'ياسر الدوسري',
    style: 'Murattal',
    photoUrl: makeAvatar('YAD', 'الدوسري'),
    serverUrl: 'https://server11.mp3quran.net/yasser/'
  },
  {
    id: 'noreen',
    name: 'Noreen Mohammad Siddiq',
    arabicName: 'نورين محمد صديق',
    style: 'Murattal (Sudanese Al-Duri)',
    photoUrl: makeAvatar('NMS', 'نورين'),
    serverUrl: 'https://server16.mp3quran.net/nourin_siddig/Rewayat-Aldori-A-n-Abi-Amr/'
  },
  {
    id: 'banna',
    name: 'Mahmoud Ali Al-Banna',
    arabicName: 'محمود علي البنا',
    style: 'Murattal',
    photoUrl: makeAvatar('MAB', 'البنا'),
    serverUrl: 'https://server8.mp3quran.net/bna/'
  },
  {
    id: 'jaber',
    name: 'Ali Jaber',
    arabicName: 'علي جابر',
    style: 'Murattal',
    photoUrl: makeAvatar('AJ', 'علي جابر'),
    serverUrl: 'https://server11.mp3quran.net/a_jbr/'
  },
  {
    id: 'shatri',
    name: 'Abu Bakr Al-Shatri',
    arabicName: 'أبو بكر الشاطري',
    style: 'Murattal',
    photoUrl: makeAvatar('ABS', 'الشاطري'),
    serverUrl: 'https://server11.mp3quran.net/shatri/'
  },
  {
    id: 'ghamdi',
    name: 'Saad Al-Ghamdi',
    arabicName: 'سعد الغامدي',
    style: 'Murattal',
    photoUrl: makeAvatar('SAG', 'الغامدي'),
    serverUrl: 'https://server7.mp3quran.net/s_gmd/'
  },
  {
    id: 'abkar',
    name: 'Idris Abkar',
    arabicName: 'إدريس أبكر',
    style: 'Murattal',
    photoUrl: makeAvatar('IA', 'إدريس أبكر'),
    serverUrl: 'https://server6.mp3quran.net/abkr/'
  }
];

export interface SurahMeta {
  number: number;
  name: string;
  arabicName: string;
  englishName: string;
  versesCount: number;
  revelationType: 'Meccan' | 'Medinan';
}

export const SURAH_METADATA: SurahMeta[] = [
  { number: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة', englishName: 'The Opening', versesCount: 7, revelationType: 'Meccan' },
  { number: 2, name: 'Al-Baqarah', arabicName: 'البقرة', englishName: 'The Cow', versesCount: 286, revelationType: 'Medinan' },
  { number: 3, name: 'Ali \'Imran', arabicName: 'آل عمران', englishName: 'Family of Imran', versesCount: 200, revelationType: 'Medinan' },
  { number: 4, name: 'An-Nisa', arabicName: 'النساء', englishName: 'The Women', versesCount: 176, revelationType: 'Medinan' },
  { number: 5, name: 'Al-Ma\'idah', arabicName: 'المائدة', englishName: 'The Table Spread', versesCount: 120, revelationType: 'Medinan' },
  { number: 6, name: 'Al-An\'am', arabicName: 'الأنعام', englishName: 'The Cattle', versesCount: 165, revelationType: 'Meccan' },
  { number: 7, name: 'Al-A\'raf', arabicName: 'الأعراف', englishName: 'The Heights', versesCount: 206, revelationType: 'Meccan' },
  { number: 8, name: 'Al-Anfal', arabicName: 'الأنفال', englishName: 'The Spoils of War', versesCount: 75, revelationType: 'Medinan' },
  { number: 9, name: 'At-Tawbah', arabicName: 'التوبة', englishName: 'The Repentance', versesCount: 129, revelationType: 'Medinan' },
  { number: 10, name: 'Yunus', arabicName: 'يونس', englishName: 'Jonah', versesCount: 109, revelationType: 'Meccan' },
  { number: 11, name: 'Hud', arabicName: 'هود', englishName: 'Hud', versesCount: 123, revelationType: 'Meccan' },
  { number: 12, name: 'Yusuf', arabicName: 'يوسف', englishName: 'Joseph', versesCount: 111, revelationType: 'Meccan' },
  { number: 13, name: 'Ar-Ra\'d', arabicName: 'الرعد', englishName: 'The Thunder', versesCount: 43, revelationType: 'Medinan' },
  { number: 14, name: 'Ibrahim', arabicName: 'إبراهيم', englishName: 'Abraham', versesCount: 52, revelationType: 'Meccan' },
  { number: 15, name: 'Al-Hijr', arabicName: 'الحجر', englishName: 'The Rocky Tract', versesCount: 99, revelationType: 'Meccan' },
  { number: 16, name: 'An-Nahl', arabicName: 'النحل', englishName: 'The Bee', versesCount: 128, revelationType: 'Meccan' },
  { number: 17, name: 'Al-Isra', arabicName: 'الإسراء', englishName: 'The Night Journey', versesCount: 111, revelationType: 'Meccan' },
  { number: 18, name: 'Al-Kahf', arabicName: 'الكهف', englishName: 'The Cave', versesCount: 110, revelationType: 'Meccan' },
  { number: 19, name: 'Maryam', arabicName: 'مريم', englishName: 'Mary', versesCount: 98, revelationType: 'Meccan' },
  { number: 20, name: 'Ta-Ha', arabicName: 'طه', englishName: 'Ta-Ha', versesCount: 135, revelationType: 'Meccan' },
  { number: 21, name: 'Al-Anbiya', arabicName: 'الأنبياء', englishName: 'The Prophets', versesCount: 112, revelationType: 'Meccan' },
  { number: 22, name: 'Al-Hajj', arabicName: 'الحج', englishName: 'The Pilgrimage', versesCount: 78, revelationType: 'Medinan' },
  { number: 23, name: 'Al-Mu\'minun', arabicName: 'المؤمنون', englishName: 'The Believers', versesCount: 118, revelationType: 'Meccan' },
  { number: 24, name: 'An-Nur', arabicName: 'النور', englishName: 'The Light', versesCount: 64, revelationType: 'Medinan' },
  { number: 25, name: 'Al-Furqan', arabicName: 'الفرقان', englishName: 'The Criterion', versesCount: 77, revelationType: 'Meccan' },
  { number: 26, name: 'Ash-Shu\'ara', arabicName: 'الشعراء', englishName: 'The Poets', versesCount: 227, revelationType: 'Meccan' },
  { number: 27, name: 'An-Naml', arabicName: 'النمل', englishName: 'The Ant', versesCount: 93, revelationType: 'Meccan' },
  { number: 28, name: 'Al-Qasas', arabicName: 'القصص', englishName: 'The Stories', versesCount: 88, revelationType: 'Meccan' },
  { number: 29, name: 'Al-\'Ankabut', arabicName: 'العنكبوت', englishName: 'The Spider', versesCount: 69, revelationType: 'Meccan' },
  { number: 30, name: 'Ar-Rum', arabicName: 'الروم', englishName: 'The Romans', versesCount: 60, revelationType: 'Meccan' },
  { number: 31, name: 'Luqman', arabicName: 'لقمان', englishName: 'Luqman', versesCount: 34, revelationType: 'Meccan' },
  { number: 32, name: 'As-Sajdah', arabicName: 'السجدة', englishName: 'The Prostration', versesCount: 30, revelationType: 'Meccan' },
  { number: 33, name: 'Al-Ahzab', arabicName: 'الأحزاب', englishName: 'The Combined Forces', versesCount: 73, revelationType: 'Medinan' },
  { number: 34, name: 'Saba', arabicName: 'سبإ', englishName: 'Sheba', versesCount: 54, revelationType: 'Meccan' },
  { number: 35, name: 'Fatir', arabicName: 'فاطر', englishName: 'Originator', versesCount: 45, revelationType: 'Meccan' },
  { number: 36, name: 'Ya-Sin', arabicName: 'يس', englishName: 'Ya-Sin', versesCount: 83, revelationType: 'Meccan' },
  { number: 37, name: 'As-Saffat', arabicName: 'الصافات', englishName: 'Those Who Set The Ranks', versesCount: 182, revelationType: 'Meccan' },
  { number: 38, name: 'Sad', arabicName: 'ص', englishName: 'The Letter Sad', versesCount: 88, revelationType: 'Meccan' },
  { number: 39, name: 'Az-Zumar', arabicName: 'الزمر', englishName: 'The Troops', versesCount: 75, revelationType: 'Meccan' },
  { number: 40, name: 'Ghafir', arabicName: 'غافر', englishName: 'The Forgiver', versesCount: 85, revelationType: 'Meccan' },
  { number: 41, name: 'Fussilat', arabicName: 'فصلت', englishName: 'Explained In Detail', versesCount: 54, revelationType: 'Meccan' },
  { number: 42, name: 'Ash-Shura', arabicName: 'الشورى', englishName: 'The Consultation', versesCount: 53, revelationType: 'Meccan' },
  { number: 43, name: 'Az-Zukhruf', arabicName: 'الزخرف', englishName: 'The Ornaments of Gold', versesCount: 89, revelationType: 'Meccan' },
  { number: 44, name: 'Ad-Dukhan', arabicName: 'الدخان', englishName: 'The Smoke', versesCount: 59, revelationType: 'Meccan' },
  { number: 45, name: 'Al-Jathiyah', arabicName: 'الجاثية', englishName: 'The Crouching', versesCount: 37, revelationType: 'Meccan' },
  { number: 46, name: 'Al-Ahqaf', arabicName: 'الأحقاف', englishName: 'The Wind-Curved Sandhills', versesCount: 35, revelationType: 'Meccan' },
  { number: 47, name: 'Muhammad', arabicName: 'محمد', englishName: 'Muhammad', versesCount: 38, revelationType: 'Medinan' },
  { number: 48, name: 'Al-Fath', arabicName: 'الفتح', englishName: 'The Victory', versesCount: 29, revelationType: 'Medinan' },
  { number: 49, name: 'Al-Hujurat', arabicName: 'الحجرات', englishName: 'The Rooms', versesCount: 18, revelationType: 'Medinan' },
  { number: 50, name: 'Qaf', arabicName: 'ق', englishName: 'The Letter Qaf', versesCount: 45, revelationType: 'Meccan' },
  { number: 51, name: 'Adh-Dhariyat', arabicName: 'الذاريات', englishName: 'The Winnowing Winds', versesCount: 60, revelationType: 'Meccan' },
  { number: 52, name: 'At-Tur', arabicName: 'الطور', englishName: 'The Mount', versesCount: 49, revelationType: 'Meccan' },
  { number: 53, name: 'An-Najm', arabicName: 'النجم', englishName: 'The Star', versesCount: 62, revelationType: 'Meccan' },
  { number: 54, name: 'Al-Qamar', arabicName: 'القمر', englishName: 'The Moon', versesCount: 55, revelationType: 'Meccan' },
  { number: 55, name: 'Ar-Rahman', arabicName: 'الرحمن', englishName: 'The Beneficent', versesCount: 78, revelationType: 'Medinan' },
  { number: 56, name: 'Al-Waqi\'ah', arabicName: 'الواقعة', englishName: 'The Inevitable', versesCount: 96, revelationType: 'Meccan' },
  { number: 57, name: 'Al-Hadid', arabicName: 'الحديد', englishName: 'The Iron', versesCount: 29, revelationType: 'Medinan' },
  { number: 58, name: 'Al-Mujadila', arabicName: 'المجادلة', englishName: 'The Pleading Woman', versesCount: 22, revelationType: 'Medinan' },
  { number: 59, name: 'Al-Hashr', arabicName: 'الحشر', englishName: 'The Exile', versesCount: 24, revelationType: 'Medinan' },
  { number: 60, name: 'Al-Mumtahanah', arabicName: 'الممتحنة', englishName: 'She That Is To Be Examined', versesCount: 13, revelationType: 'Medinan' },
  { number: 61, name: 'As-Saf', arabicName: 'الصف', englishName: 'The Ranks', versesCount: 14, revelationType: 'Medinan' },
  { number: 62, name: 'Al-Jumu\'ah', arabicName: 'الجمعة', englishName: 'Friday', versesCount: 11, revelationType: 'Medinan' },
  { number: 63, name: 'Al-Munafiqun', arabicName: 'المنافقون', englishName: 'The Hypocrites', versesCount: 11, revelationType: 'Medinan' },
  { number: 64, name: 'At-Taghabun', arabicName: 'التغابن', englishName: 'Mutual Disillusion', versesCount: 18, revelationType: 'Medinan' },
  { number: 65, name: 'At-Talaq', arabicName: 'الطلاق', englishName: 'Divorce', versesCount: 12, revelationType: 'Medinan' },
  { number: 66, name: 'At-Tahrim', arabicName: 'التحريم', englishName: 'The Prohibition', versesCount: 12, revelationType: 'Medinan' },
  { number: 67, name: 'Al-Mulk', arabicName: 'الملك', englishName: 'The Sovereignty', versesCount: 30, revelationType: 'Meccan' },
  { number: 68, name: 'Al-Qalam', arabicName: 'القلم', englishName: 'The Pen', versesCount: 52, revelationType: 'Meccan' },
  { number: 69, name: 'Al-Haqqah', arabicName: 'الحاقة', englishName: 'The Reality', versesCount: 52, revelationType: 'Meccan' },
  { number: 70, name: 'Al-Ma\'arij', arabicName: 'المعارج', englishName: 'The Ascending Stairways', versesCount: 44, revelationType: 'Meccan' },
  { number: 71, name: 'Nuh', arabicName: 'نوح', englishName: 'Noah', versesCount: 28, revelationType: 'Meccan' },
  { number: 72, name: 'Al-Jinn', arabicName: 'الجن', englishName: 'The Jinn', versesCount: 28, revelationType: 'Meccan' },
  { number: 73, name: 'Al-Muzzammil', arabicName: 'المزمل', englishName: 'The Enshrouded One', versesCount: 20, revelationType: 'Meccan' },
  { number: 74, name: 'Al-Muddaththir', arabicName: 'المدثر', englishName: 'The Cloaked One', versesCount: 56, revelationType: 'Meccan' },
  { number: 75, name: 'Al-Qiyamah', arabicName: 'القيامة', englishName: 'The Resurrection', versesCount: 40, revelationType: 'Meccan' },
  { number: 76, name: 'Al-Insan', arabicName: 'الإنسان', englishName: 'Man', versesCount: 31, revelationType: 'Medinan' },
  { number: 77, name: 'Al-Mursalat', arabicName: 'المرسلات', englishName: 'The Emissaries', versesCount: 50, revelationType: 'Meccan' },
  { number: 78, name: 'An-Naba', arabicName: 'النبأ', englishName: 'The Tidings', versesCount: 40, revelationType: 'Meccan' },
  { number: 79, name: 'An-Nazi\'at', arabicName: 'النازعات', englishName: 'Those Who Drag Forth', versesCount: 46, revelationType: 'Meccan' },
  { number: 80, name: '\'Abasa', arabicName: 'عبس', englishName: 'He Frowned', versesCount: 42, revelationType: 'Meccan' },
  { number: 81, name: 'At-Takwir', arabicName: 'التكوير', englishName: 'The Overthrowing', versesCount: 29, revelationType: 'Meccan' },
  { number: 82, name: 'Al-Infitar', arabicName: 'الانفطار', englishName: 'The Cleaving', versesCount: 19, revelationType: 'Meccan' },
  { number: 83, name: 'Al-Mutaffifin', arabicName: 'المطففين', englishName: 'Defrauding', versesCount: 36, revelationType: 'Meccan' },
  { number: 84, name: 'Al-Inshiqaq', arabicName: 'الانشقاق', englishName: 'The Splitting Open', versesCount: 25, revelationType: 'Meccan' },
  { number: 85, name: 'Al-Buruj', arabicName: 'البروج', englishName: 'The Mansions of the Stars', versesCount: 22, revelationType: 'Meccan' },
  { number: 86, name: 'At-Tariq', arabicName: 'الطارق', englishName: 'The Nightcomer', versesCount: 17, revelationType: 'Meccan' },
  { number: 87, name: 'Al-A\'la', arabicName: 'الأعلى', englishName: 'The Most High', versesCount: 19, revelationType: 'Meccan' },
  { number: 88, name: 'Al-Ghashiyah', arabicName: 'الغاشية', englishName: 'The Overwhelming', versesCount: 26, revelationType: 'Meccan' },
  { number: 89, name: 'Al-Fajr', arabicName: 'الفجر', englishName: 'The Dawn', versesCount: 30, revelationType: 'Meccan' },
  { number: 90, name: 'Al-Balad', arabicName: 'البلد', englishName: 'The City', versesCount: 20, revelationType: 'Meccan' },
  { number: 91, name: 'Ash-Shams', arabicName: 'الشمس', englishName: 'The Sun', versesCount: 15, revelationType: 'Meccan' },
  { number: 92, name: 'Al-Layl', arabicName: 'الليل', englishName: 'The Night', versesCount: 21, revelationType: 'Meccan' },
  { number: 93, name: 'Ad-Duhaa', arabicName: 'الضحى', englishName: 'The Morning Hours', versesCount: 11, revelationType: 'Meccan' },
  { number: 94, name: 'Ash-Sharh', arabicName: 'الشرح', englishName: 'The Relief', versesCount: 8, revelationType: 'Meccan' },
  { number: 95, name: 'At-Tin', arabicName: 'التين', englishName: 'The Fig', versesCount: 8, revelationType: 'Meccan' },
  { number: 96, name: 'Al-\'Alaq', arabicName: 'العلق', englishName: 'The Clot', versesCount: 19, revelationType: 'Meccan' },
  { number: 97, name: 'Al-Qadr', arabicName: 'القدر', englishName: 'The Power', versesCount: 5, revelationType: 'Meccan' },
  { number: 98, name: 'Al-Bayyinah', arabicName: 'البينة', englishName: 'The Clear Proof', versesCount: 8, revelationType: 'Medinan' },
  { number: 99, name: 'Az-Zalzalah', arabicName: 'الزلزلة', englishName: 'The Earthquake', versesCount: 8, revelationType: 'Medinan' },
  { number: 100, name: 'Al-\'Adiyat', arabicName: 'العاديات', englishName: 'The Courser', versesCount: 11, revelationType: 'Meccan' },
  { number: 101, name: 'Al-Qari\'ah', arabicName: 'القارعة', englishName: 'The Calamity', versesCount: 11, revelationType: 'Meccan' },
  { number: 102, name: 'At-Takathur', arabicName: 'التكاثر', englishName: 'Competition in Increase', versesCount: 8, revelationType: 'Meccan' },
  { number: 103, name: 'Al-\'Asr', arabicName: 'العصر', englishName: 'The Declining Day', versesCount: 3, revelationType: 'Meccan' },
  { number: 104, name: 'Al-Humazah', arabicName: 'الهمزة', englishName: 'The Traducer', versesCount: 9, revelationType: 'Meccan' },
  { number: 105, name: 'Al-Fil', arabicName: 'الفيل', englishName: 'The Elephant', versesCount: 5, revelationType: 'Meccan' },
  { number: 106, name: 'Quraysh', arabicName: 'قريش', englishName: 'Quraysh', versesCount: 4, revelationType: 'Meccan' },
  { number: 107, name: 'Al-Ma\'un', arabicName: 'الماعون', englishName: 'Small Kindnesses', versesCount: 7, revelationType: 'Meccan' },
  { number: 108, name: 'Al-Kawthar', arabicName: 'الكوثر', englishName: 'Abundance', versesCount: 3, revelationType: 'Meccan' },
  { number: 109, name: 'Al-Kafirun', arabicName: 'الكافرون', englishName: 'The Disbelievers', versesCount: 6, revelationType: 'Meccan' },
  { number: 110, name: 'An-Nasr', arabicName: 'النصر', englishName: 'Divine Support', versesCount: 3, revelationType: 'Medinan' },
  { number: 111, name: 'Al-Masad', arabicName: 'المسد', englishName: 'Palm Fibre', versesCount: 5, revelationType: 'Meccan' },
  { number: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', englishName: 'The Sincerity', versesCount: 4, revelationType: 'Meccan' },
  { number: 113, name: 'Al-Falaq', arabicName: 'الفلق', englishName: 'The Daybreak', versesCount: 5, revelationType: 'Meccan' },
  { number: 114, name: 'An-Nas', arabicName: 'الناس', englishName: 'Mankind', versesCount: 6, revelationType: 'Meccan' }
];

export function getSurahPaddedNumber(num: number): string {
  return num.toString().padStart(3, '0');
}

export function generateTrackForSurah(surah: SurahMeta, reciter: Reciter): Track {
  const padded = getSurahPaddedNumber(surah.number);
  const streamUrl = `${reciter.serverUrl}${padded}.mp3`;
  return {
    id: `${reciter.id}_${surah.number}`,
    surahNumber: surah.number,
    name: surah.name,
    arabicName: surah.arabicName,
    englishName: surah.englishName,
    duration: 0,
    stream_url: streamUrl,
    reciterId: reciter.id,
    reciterName: reciter.name,
    artwork_url: reciter.photoUrl,
    versesCount: surah.versesCount,
    revelationType: surah.revelationType
  };
}

export function getTracksForReciter(reciter: Reciter): Track[] {
  return SURAH_METADATA.map((surah) => generateTrackForSurah(surah, reciter));
}
