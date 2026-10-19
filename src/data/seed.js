// Sample data a new account can load from the dashboard, generated relative to today.
import { addDays, startOfWeek, toKey } from '../utils/date';

// Database ids are UUIDs, generated here so the screen can update before the save finishes.
export const newId = () => crypto.randomUUID();

const id = () => newId();

function seedEvents() {
  const monday = startOfWeek(new Date());
  const day = (n) => toKey(addDays(monday, n));
  return [
    { date: day(0), title: 'Virginia booking Morningside', start: '10:00', end: '12:30', person: 'Sarah J', category: 'booking' },
    { date: day(0), title: 'Team stand-up', start: '08:30', end: '09:00', category: 'meeting' },
    { date: day(0), title: 'Send monthly invoices', start: '14:00', end: '15:00', category: 'work' },
    { date: day(0), title: 'Gym session', start: '17:30', end: '18:30', category: 'personal' },
    { date: day(1), title: 'Meeting with Harold Smith', start: '10:00', end: '11:00', category: 'meeting' },
    { date: day(1), title: 'Work on work.com project', category: 'work' },
    { date: day(2), title: 'Breakfast with Monika', start: '09:00', end: '10:00', category: 'personal' },
    { date: day(2), title: 'Sunshine project catch up', start: '12:30', end: '13:00', category: 'meeting' },
    { date: day(2), title: 'Call with Telcom', start: '15:00', end: '15:30', category: 'meeting' },
    { date: day(3), title: 'Finish up website for The Fire Pit', category: 'work' },
    { date: day(4), title: 'Lenete Booking Greenside', start: '09:00', end: '13:00', person: 'Jade G', category: 'booking' },
    { date: day(4), title: 'Lunch with Leon', start: '14:00', end: '15:00', category: 'personal' },
    { date: day(6), title: "Alley's 35th Birthday", category: 'personal' },
    { date: day(7), title: 'Breakfast with Leah', start: '08:00', end: '09:00', category: 'personal' },
    { date: day(9), title: 'Finish Idea Tree proposal', category: 'work' },
    { date: day(9), title: 'Health and Safety meeting', start: '12:30', end: '13:00', category: 'meeting' },
    { date: day(10), title: 'Lunch with Sabrina', start: '14:00', end: '15:00', category: 'personal' },
    { date: day(10), title: 'Karen Booking Mondeor', start: '16:00', end: '17:00', person: 'Rory J', category: 'booking' },
    { date: day(10), title: 'Client follow-up', start: '17:30', end: '18:00', category: 'meeting' },
    { date: day(12), title: 'Meeting with Harold Smith', start: '10:00', end: '11:00', category: 'meeting' },
    { date: day(13), title: "Gaby's baby shower", category: 'personal' },
    { date: day(13), title: 'Work on work.com project', category: 'work' },
  ].map((e) => ({ id: id(), ...e }));
}

function seedTasks() {
  const today = toKey(new Date());
  return [
    { title: 'Finish Idea Tree Proposal', description: 'Work on proposal for John', start: '12:00', end: '12:30', category: 'work' },
    { title: 'Work.com', description: 'Finish up contact page', end: '17:00', category: 'work' },
    { title: 'Firepit Website', description: 'Finish website for the Firepit', end: '17:00', category: 'work', done: true },
    { title: 'Meeting with Harold Smith', description: 'Meeting about website updates', start: '10:00', end: '11:00', category: 'meetings' },
    { title: 'Meeting with Cheryl K', start: '08:00', end: '09:00', category: 'meetings' },
    { title: 'Health and Safety Meeting', start: '12:30', end: '13:00', category: 'other' },
    { title: 'Walk the dog', start: '14:00', end: '15:00', category: 'other' },
  ].map((t) => ({ id: id(), date: today, description: '', done: false, ...t }));
}

function seedInvoices() {
  const today = new Date();
  const d = (n) => toKey(addDays(today, n));
  const invoice = (number, client, date, dueDate, amount, status, extra = {}) => ({
    id: id(),
    number,
    client,
    date,
    dueDate,
    orderNumber: '',
    reference: '',
    terms: 'net30',
    subject: '',
    items: [{ id: id(), description: 'Professional services', quantity: 1, rate: amount, taxRate: 0 }],
    discount: 0,
    status,
    type: 'invoice',
    archived: false,
    recurring: false,
    ...extra,
  });
  return [
    invoice('INV-01247', 'Work.com', d(-20), d(10), 5700, 'paid'),
    invoice('INV-01248', 'Telcom', d(-18), d(12), 5815, 'unpaid'),
    invoice('INV-01358', 'MTN', d(-10), d(20), 2500, 'pending'),
    invoice('INV-02256', 'CellC', d(-60), d(-30), 20567, 'paid'),
    invoice('INV-01674', 'Vodacom', d(-2), d(28), 5634, 'draft'),
    invoice('INV-05987', 'MTN', d(-45), d(-15), 4239, 'paid', { recurring: true }),
    invoice('INV-01587', 'CellC', d(-27), d(3), 3478, 'unpaid'),
    invoice('INV-01588', 'CellC', d(-25), d(5), 73009.75, 'unpaid'),
    invoice('INV-01102', 'Rain', d(-120), d(-90), 1200, 'paid', { archived: true }),
    invoice('EST-00031', 'Telkom', d(-3), d(27), 12500, 'draft', { type: 'estimate' }),
  ];
}

export function createSeedData() {
  return { events: seedEvents(), tasks: seedTasks(), invoices: seedInvoices() };
}
