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
    id: 'south_east',
    name: 'South-East District',
    nameSetswana: 'Kgaolo ya Borwa-Botlhaba',
    towns: ['Gaborone', 'Ramotswa', 'Tlokweng', 'Otse', 'Mogobane']
  },
  {
    id: 'north_west',
    name: 'North-West (Ngamiland & Chobe)',
    nameSetswana: 'Kgaolo ya Bokone-Bophirima',
    towns: ['Maun', 'Kasane', 'Shakawe', 'Gumare', 'Pandamatenga', 'Sehithwa']
  },
  {
    id: 'central',
    name: 'Central District',
    nameSetswana: 'Kgaolo ya Legare',
    towns: ['Serowe', 'Palapye', 'Mahalapye', 'Selibe Phikwe', 'Letlhakane', 'Bobonong', 'Tutume']
  },
  {
    id: 'north_east',
    name: 'North-East District',
    nameSetswana: 'Kgaolo ya Bokone-Botlhaba',
    towns: ['Francistown', 'Masunga', 'Tshesebe', 'Zwenshambe', 'Matsiloje']
  },
  {
    id: 'kgatleng',
    name: 'Kgatleng District',
    nameSetswana: 'Kgaolo ya Kgatleng',
    towns: ['Mochudi', 'Oodi', 'Bokaa', 'Morwa', 'Malolwane', 'Mmathubudukwane']
  },
  {
    id: 'kweneng',
    name: 'Kweneng District',
    nameSetswana: 'Kgaolo ya Kweneng',
    towns: ['Molepolole', 'Mogoditshane', 'Thamaga', 'Gabane', 'Lentsweletau', 'Letlhakeng']
  },
  {
    id: 'southern',
    name: 'Southern District',
    nameSetswana: 'Kgaolo ya Borwa',
    towns: ['Kanye', 'Lobatse', 'Goodhope', 'Moshupa', 'Sedibeng', 'Pitsane']
  },
  {
    id: 'kgalagadi',
    name: 'Kgalagadi District',
    nameSetswana: 'Kgaolo ya Kgalagadi',
    towns: ['Tsabong', 'Hukuntsi', 'Kang', 'Werda', 'Bokspits', 'Middlepits']
  },
  {
    id: 'ghanzi',
    name: 'Ghanzi District',
    nameSetswana: 'Kgaolo ya Ghanzi',
    towns: ['Ghanzi', 'Charleshill', 'Kalkfontein', 'Dekar', 'New Xade']
  },
  {
    id: 'jwaneng',
    name: 'Jwaneng Municipality',
    nameSetswana: 'Toropo ya Jwaneng',
    towns: ['Jwaneng Township', 'Sese', 'Lefhoko']
  }
];

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
