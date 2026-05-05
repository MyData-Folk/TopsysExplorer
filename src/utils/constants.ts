import { RoomType, HotelConfig, AppConfig } from '../types';

export const DAYS_FR = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
export const MONTHS_FR = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

export const JOUR_ABBR: Record<string, number> = {
  lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 0,
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

export const MONTH_MAP: Record<string, number> = {
  jan: 0, 'fév': 1, feb: 1, mar: 2, avr: 3, apr: 3, mai: 4, may: 4,
  juin: 5, jun: 5, juil: 6, jul: 6, 'aoû': 7, aou: 7, aug: 7,
  sep: 8, oct: 9, nov: 10, 'déc': 11, dec: 11,
};

export const DEFAULT_TYPES: RoomType[] = [
  { code: '13 DCLA', label: 'DCLA', description: 'Double Classique', capacity: 13 },
  { code: '5 DDLX', label: 'DDLX', description: 'Double Deluxe', capacity: 5 },
  { code: '8 TCLA', label: 'TCLA', description: 'Twin Classique', capacity: 8 },
  { code: '2 TDLX', label: 'TDLX', description: 'Twin Deluxe', capacity: 2 },
  { code: '2 TRCL', label: 'TRCL', description: 'Double Classique + Terrasse', capacity: 2 },
  { code: '1 TRDL', label: 'TRDL', description: 'Deluxe + Terrasse', capacity: 1 },
  { code: '14 DCAD', label: 'DCAD', description: 'Double Classique Adjacente', capacity: 14 },
];

export const DEFAULT_IGNORE_PREFIXES: string[] = [
  'Saisons', 'Prix-réf', 'Scénarios', 'Evènem', 'Non-Conf',
  'Allotem', 'Lib-Allot', '(c) Topsys', 'Mauvais', 'PLANNING', 'du ', 'FICT',
];

export const DEFAULT_HOTEL: HotelConfig = {
  id: 'default',
  name: 'Folkestone Opera',
  address: '75008 Paris',
  reference: 'Réf. 21006',
  totalCapacity: 45,
  types: [...DEFAULT_TYPES],
  defaultRoomPrice: 150,
  ignorePrefixes: [...DEFAULT_IGNORE_PREFIXES],
};

export const DEFAULT_CONFIG: AppConfig = {
  selectedHotelId: 'default',
  hotels: [DEFAULT_HOTEL],
  pms: 'topsys',
  highOccupancyThreshold: 70,
  lowOccupancyThreshold: 40,
  currency: '€',
  showCategoryLibres: true,
  dateFormat: 'full',
  xlsxName: 'Analyse_Occupation',
  useAveragePriceForRevenue: false,
  autoSave: true,
  theme: 'dark',
  archiveFolderName: 'topsys_archives',
  cloudSync: false,
};
