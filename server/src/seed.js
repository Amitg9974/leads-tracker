// Usage: npm run seed             (adds sample data if the DB is empty)
//        npm run seed -- --reset  (wipes existing data first)
const { createDb } = require('./db');
const { leadRepository } = require('./repositories/leadRepository');
const { noteRepository } = require('./repositories/noteRepository');

const db = createDb();
const leads = leadRepository(db);
const notes = noteRepository(db);

if (process.argv.includes('--reset')) db.exec('DELETE FROM notes; DELETE FROM leads;');

if (db.prepare('SELECT COUNT(*) AS c FROM leads').get().c > 0) {
  console.log('Database already has leads. Use "npm run seed -- --reset" to start over.');
  process.exit(0);
}

const samples = [
  { name: 'Asha Patel', email: 'asha.patel@example.com', phone: '+91 98765 43210', status: 'new', notes: ['Came in through the website contact form.'] },
  { name: 'Daniel Brooks', email: 'daniel.brooks@example.com', phone: '+1 415 555 0134', status: 'contacted', notes: ['Left a voicemail.', 'Replied by email, wants a demo next week.'] },
  { name: 'Mei Tanaka', email: 'mei.tanaka@example.com', phone: null, status: 'qualified', notes: ['Budget approved for Q4.'] },
  { name: 'Lucas Fernandes', email: 'lucas.f@example.com', phone: '+55 11 91234 5678', status: 'lost', notes: [] },
  { name: 'Sara Ahmed', email: 'sara.ahmed@example.com', phone: '+44 20 7946 0958', status: 'new', notes: [] },
];

db.transaction(() => {
  for (const { notes: leadNotes, ...data } of samples) {
    const lead = leads.create(data);
    leadNotes.forEach((content) => notes.create(lead.id, content));
  }
})();

console.log(`Seeded ${samples.length} leads.`);
