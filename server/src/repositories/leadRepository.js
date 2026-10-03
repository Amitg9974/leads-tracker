const SELECT_LEAD = `
  SELECT l.*, (SELECT COUNT(*) FROM notes n WHERE n.leadId = l.id) AS notesCount
  FROM leads l
`;

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

function leadRepository(db) {
  const byId = db.prepare(`${SELECT_LEAD} WHERE l.id = ?`);

  return {
    list({ search, status, limit, offset }) {
      const where = [];
      const params = {};
      if (search) {
        where.push("(l.name LIKE @q ESCAPE '\\' OR l.email LIKE @q ESCAPE '\\')");
        params.q = `%${escapeLike(search)}%`;
      }
      if (status) {
        where.push('l.status = @status');
        params.status = status;
      }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const total = db.prepare(`SELECT COUNT(*) AS c FROM leads l ${clause}`).get(params).c;
      const rows = db
        .prepare(`${SELECT_LEAD} ${clause} ORDER BY l.createdAt DESC, l.id DESC LIMIT @limit OFFSET @offset`)
        .all({ ...params, limit, offset });
      return { rows, total };
    },

    findById(id) {
      return byId.get(id);
    },

    create({ name, email, phone, status }) {
      const info = db
        .prepare('INSERT INTO leads (name, email, phone, status) VALUES (@name, @email, @phone, @status)')
        .run({ name, email, phone, status });
      return byId.get(info.lastInsertRowid);
    },

    // `data` comes from validateLeadInput, so its keys are a fixed whitelist.
    update(id, data) {
      const sets = Object.keys(data).map((k) => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE leads SET ${sets} WHERE id = @id`).run({ ...data, id });
      return byId.get(id);
    },

    remove(id) {
      return db.prepare('DELETE FROM leads WHERE id = ?').run(id).changes > 0;
    },
  };
}

module.exports = { leadRepository };
