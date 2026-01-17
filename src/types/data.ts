export interface ExternalData {
  key: number;
  profile_id: string;
  profile_name: string;
  completed: number;
  version: string;
}

// Master Data Types
export interface Factory {
  _id: string;
  pabrik_id: number;
  name: string;
}

export interface Part {
  _id: string;
  bagian_id: number;
  name: string;
  pabrik_id: number;
  pabrik_name: string;
  status?: string;
}

export interface Lab {
  _id: string;
  lab_id: number;
  name: string;
  pabrik_id: number;
  bagian_id: number;
  jenis_lab_id: number;
  pabrik_name: string;
}

export interface CleansingStatus {
  pabrik_name: string;
  bagian_name: string;
  tanggal: string;
  time_taken: number;
  last_run: number;
  status: string;
  user_profile_picture: string;
}

// Cleansing Data Types
export interface RawData {
  tag: string;
  unit: string;
  total: number;
  difference: number;
  average: number;
  tda: number;
  hours: Record<string, number>;
}

export interface CleanData {
  _id: string;
  name_alias: string;
  unit?: string;
  total?: number;
  difference?: number;
  average?: number;
  tda?: number;
  data: Array<{
    time: string;
    value: number | null;
  }>;
  affected_times?: string[];
  affected_fields?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // untuk time_0..time_24, time_0_is_same, dll
}

// Lab Data Types
export interface DataPoint {
  value: number;
  time: string;
  is_same?: boolean;
}

export interface LabSpec {
  id_spec_uji: number;
  nama_spec_uji: string;
  data: DataPoint[];
}

export interface RawLabData {
  _id: string;
  tanggal: string;
  id_item: number;
  tag_name: string;
  item_name: string;
  data: LabSpec[];
  cleaned: boolean;
  lab_id: number;
}
