import { Employee } from './types';

export const INITIAL_SHEET_DATA: Employee[] = [
  { 
    id: '1', 
    firstName: 'Юрий', 
    lastName: 'Станиславский', 
    phone: '+79214388883', 
    email: 'marketing@kom3.ru', 
    title: 'Директор по маркетингу', 
    website: 'www.magmahome.ru', 
    address: 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1',
    department: 'Маркетинг',
    telegram: 'yur_stan', 
    whatsapp: '79214388883' 
  },
  { 
    id: '2', 
    firstName: 'Анастасия', 
    lastName: 'Ковалева', 
    phone: '+79210001122', 
    email: 'kovaleva@magmahome.ru', 
    title: 'Ведущий дизайнер интерьеров', 
    website: 'www.magmahome.ru', 
    address: 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1',
    department: 'Дизайн',
    telegram: 'nastya_magma', 
    whatsapp: '79210001122' 
  },
  { 
    id: '3', 
    firstName: 'Михаил', 
    lastName: 'Вершинин', 
    phone: '+79213334455', 
    email: 'stone@magmahome.ru', 
    title: 'Руководитель каменного производства', 
    website: 'www.magmahome.ru', 
    address: 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1',
    department: 'Производство',
    telegram: 'mikhail_stone', 
    whatsapp: '79213334455' 
  }
];

export const DEPARTMENTS = [
  'Все', 
  'Управление', 
  'Продажи', 
  'Маркетинг', 
  'Производство', 
  'Кадры', 
  'Финансы', 
  'Дизайн'
];
