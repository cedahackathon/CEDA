/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BotswanaDistrict {
  id: string;
  name: string;
  nameSetswana: string;
  towns: string[];
}

export const BOTSWANA_DISTRICTS: BotswanaDistrict[] = [
  {
    id: 'bobirwa',
    name: 'Bobirwa District Council',
    nameSetswana: 'Kgaolo ya Bobirwa',
    towns: ['Bobonong', 'Mmadinare', 'Sefophe', 'Tsetsebjwe', 'Kobojango', 'Semolale'],
  },
  {
    id: 'boteti',
    name: 'Boteti District Council',
    nameSetswana: 'Kgaolo ya Boteti',
    towns: ['Letlhakane', 'Orapa', 'Rakops', 'Mopipi', 'Xhumo'],
  },
  {
    id: 'central',
    name: 'Central District Council',
    nameSetswana: 'Kgaolo ya Legare',
    towns: ['Serowe', 'Paje', 'Mabeleapudi', 'Moiyabana'],
  },
  {
    id: 'charleshill',
    name: 'Charleshill District Council',
    nameSetswana: 'Kgaolo ya Charleshill',
    towns: ['Charleshill', 'Ncojane', 'Makunda', 'Kule', 'Karakobis'],
  },
  {
    id: 'chobe',
    name: 'Chobe District Council',
    nameSetswana: 'Kgaolo ya Chobe',
    towns: ['Kasane', 'Kazungula', 'Pandamatenga', 'Kavimba', 'Kachikau'],
  },
  {
    id: 'francistown',
    name: 'Francistown City Council',
    nameSetswana: 'Toropokgolo ya Francistown',
    towns: ['Francistown', 'Monarch', 'Donga', 'Area W', 'Somerset'],
  },
  {
    id: 'gaborone',
    name: 'Gaborone City Council',
    nameSetswana: 'Toropokgolo ya Gaborone',
    towns: ['Gaborone', 'Phakalane', 'Broadhurst', 'Gaborone West', 'Block 8'],
  },
  {
    id: 'ghanzi',
    name: 'Ghanzi District Council',
    nameSetswana: 'Kgaolo ya Ghanzi',
    towns: ['Ghanzi', 'Kalkfontein', 'Dekar', 'New Xade', 'West Hanahai'],
  },
  {
    id: 'goodhope',
    name: 'Goodhope District Council',
    nameSetswana: 'Kgaolo ya Goodhope',
    towns: ['Goodhope', 'Pitsane', 'Ramatlabama', 'Metlojane', 'Sedibeng'],
  },
  {
    id: 'hukuntsi',
    name: 'Hukuntsi District Council',
    nameSetswana: 'Kgaolo ya Hukuntsi',
    towns: ['Hukuntsi', 'Kang', 'Lehututu', 'Tshane', 'Lokgwabe'],
  },
  {
    id: 'jwaneng',
    name: 'Jwaneng Town Council',
    nameSetswana: 'Toropo ya Jwaneng',
    towns: ['Jwaneng', 'Sese', 'Lefhoko'],
  },
  {
    id: 'kgalagadi',
    name: 'Kgalagadi District Council',
    nameSetswana: 'Kgaolo ya Kgalagadi',
    towns: ['Tsabong', 'Werda', 'Bokspits', 'Middlepits', 'Makopong'],
  },
  {
    id: 'kgatleng',
    name: 'Kgatleng District Council',
    nameSetswana: 'Kgaolo ya Kgatleng',
    towns: ['Mochudi', 'Oodi', 'Bokaa', 'Morwa', 'Malolwane', 'Mmathubudukwane'],
  },
  {
    id: 'kweneng',
    name: 'Kweneng District Council',
    nameSetswana: 'Kgaolo ya Kweneng',
    towns: ['Molepolole', 'Lentsweletau', 'Kopong', 'Hatsalatladi', 'Sojwe'],
  },
  {
    id: 'letlhakeng',
    name: 'Letlhakeng District Council',
    nameSetswana: 'Kgaolo ya Letlhakeng',
    towns: ['Letlhakeng', 'Takatokwane', 'Khudumelapye', 'Ditshegwane', 'Salajwe'],
  },
  {
    id: 'lobatse',
    name: 'Lobatse Town Council',
    nameSetswana: 'Toropo ya Lobatse',
    towns: ['Lobatse', 'Woodhall', 'Peleng', 'Boswelatlou'],
  },
  {
    id: 'mabutsane',
    name: 'Mabutsane District Council',
    nameSetswana: 'Kgaolo ya Mabutsane',
    towns: ['Mabutsane', 'Khakhea', 'Kokong', 'Morwamosu', 'Sekoma'],
  },
  {
    id: 'mahalapye',
    name: 'Mahalapye District Council',
    nameSetswana: 'Kgaolo ya Mahalapye',
    towns: ['Mahalapye', 'Shoshong', 'Machaneng', 'Kalamare', 'Sefhare'],
  },
  {
    id: 'mogoditshane_thamaga',
    name: 'Mogoditshane-Thamaga District Council',
    nameSetswana: 'Kgaolo ya Mogoditshane-Thamaga',
    towns: ['Mogoditshane', 'Thamaga', 'Gabane', 'Mmopane', 'Mankgodi', 'Metsimotlhabe'],
  },
  {
    id: 'moshupa',
    name: 'Moshupa District Council',
    nameSetswana: 'Kgaolo ya Moshupa',
    towns: ['Moshupa', 'Lotlhakane West', 'Manyana', 'Ranaka', 'Ntlhantlhe'],
  },
  {
    id: 'north_east',
    name: 'North-East District Council',
    nameSetswana: 'Kgaolo ya Bokone-Botlhaba',
    towns: ['Masunga', 'Tshesebe', 'Zwenshambe', 'Matsiloje', 'Makaleng'],
  },
  {
    id: 'north_west',
    name: 'North-West District Council',
    nameSetswana: 'Kgaolo ya Bokone-Bophirima',
    towns: ['Maun', 'Sehithwa', 'Toteng', 'Shorobe', 'Chanoga'],
  },
  {
    id: 'okavango',
    name: 'Okavango District Council',
    nameSetswana: 'Kgaolo ya Okavango',
    towns: ['Gumare', 'Shakawe', 'Sepopa', 'Etsha 6', 'Nokaneng', 'Seronga'],
  },
  {
    id: 'palapye',
    name: 'Palapye District Council',
    nameSetswana: 'Kgaolo ya Palapye',
    towns: ['Palapye', 'Lerala', 'Maunatlala', 'Moremi', 'Lecheng'],
  },
  {
    id: 'selebi_phikwe',
    name: 'Selebi-Phikwe Town Council',
    nameSetswana: 'Toropo ya Selebi-Phikwe',
    towns: ['Selebi-Phikwe', 'Botshabelo', 'Ikageleng', 'Sesame'],
  },
  {
    id: 'south_east',
    name: 'South-East District Council',
    nameSetswana: 'Kgaolo ya Borwa-Botlhaba',
    towns: ['Ramotswa', 'Otse', 'Mogobane', 'Taung'],
  },
  {
    id: 'southern',
    name: 'Southern District Council',
    nameSetswana: 'Kgaolo ya Borwa',
    towns: ['Kanye', 'Molapowabojang', 'Digawana', 'Lorwana'],
  },
  {
    id: 'sowa',
    name: 'Sowa Town Council',
    nameSetswana: 'Toropo ya Sowa',
    towns: ['Sowa Town', 'Dukwi', 'Nata'],
  },
  {
    id: 'tlokweng',
    name: 'Tlokweng District Council',
    nameSetswana: 'Kgaolo ya Tlokweng',
    towns: ['Tlokweng', 'Mafitlhakgosi', 'Lenganeng'],
  },
  {
    id: 'tonota',
    name: 'Tonota District Council',
    nameSetswana: 'Kgaolo ya Tonota',
    towns: ['Tonota', 'Shashe Mooke', 'Mandunyane', 'Borolong', 'Chadibe'],
  },
];

const LEGACY_DISTRICT_TO_COUNCIL: Record<string, string> = {
  'south-east district': 'South-East District Council',
  'north-west (ngamiland & chobe)': 'North-West District Council',
  'north-west district': 'North-West District Council',
  'central district': 'Central District Council',
  'north-east district': 'North-East District Council',
  'kgatleng district': 'Kgatleng District Council',
  'kweneng district': 'Kweneng District Council',
  'southern district': 'Southern District Council',
  'kgalagadi district': 'Kgalagadi District Council',
  'ghanzi district': 'Ghanzi District Council',
  'jwaneng municipality': 'Jwaneng Town Council',
};

export function normalizeDistrictCouncilName(rawDistrict: string | undefined | null): string {
  const trimmed = (rawDistrict || '').trim();
  if (!trimmed) return '';
  const exact = BOTSWANA_DISTRICTS.find(
    (d) => d.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact.name;
  const legacy = LEGACY_DISTRICT_TO_COUNCIL[trimmed.toLowerCase()];
  if (legacy) return legacy;
  return trimmed;
}

/**
 * Top 100 Most Common Passwords (Secured against enumeration & dictionary attacks)
 */
export const TOP_COMMON_PASSWORDS: Set<string> = new Set([
  '123456', '123456789', 'password', 'password1', 'password123', '12345678', 'qwerty',
  '12345', '1234567', '111111', '123123', 'admin', 'admin123', 'welcome', 'welcome1',
  'login', 'secret', 'pass123', 'abc123', 'master', 'football', 'monkey', 'letmein',
  'iloveyou', 'sunshine', 'princess', 'solo', 'dragon', 'computer', 'superman',
  'freedom', 'starwars', 'killer', 'trustno1', 'shadow', 'charlie', 'michael',
  'jennifer', 'chelsea', 'arsenal', 'liverpool', 'barcelona', 'manchester',
  'botswana', 'gaborone', 'ceda123', 'cedapass', 'francistown', 'pula123',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', '000000', '666666',
  '112233', '987654321', '654321', '123321', 'test123', 'testing', 'guest',
  'operator', 'manager', 'root', 'user123', 'pass@123', 'Pass@123', 'Password@1',
  'P@ssw0rd', 'P@ssword', 'ChangeMe', 'changeme', 'Default1', 'default',
  'access', 'oracle', 'cisco', 'database', 'system', 'service', 'internet',
  'network', 'security', 'secure123', 'diamond', 'copper', 'nickel', 'kalahari',
  'okavango', 'chobe', 'makgadikgadi', 'kgalipass', 'botswana1', 'africa123'
]);
