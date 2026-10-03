function noteRepository(db) {
  const byId = db.prepare('SELECT * FROM notes WHERE id = ?');

  return {
    listByLead(leadId) {
      return db
        .prepare('SELECT * FROM notes WHERE leadId = ? ORDER BY createdAt DESC, id DESC')
        .all(leadId);
    },

    create(leadId, content) {
      const info = db.prepare('INSERT INTO notes (leadId, content) VALUES (?, ?)').run(leadId, content);
      return byId.get(info.lastInsertRowid);
    },
  };
}

module.exports = { noteRepository };
