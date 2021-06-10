const db = require('../util/database');

module.exports = class User {

    constructor(id, email, password, name, status, createdAt) {
        this.id = id,
        this.email = email,
        this.password = password,
        this.name = name,
        this.status = status,
        this.createdAt = createdAt
    }

    static findByEmail(email) {
        return db.execute('SELECT * FROM signup WHERE signup.email = ?', [email]);
    }

    static findById(userId) {
        return db.execute('SELECT * FROM signup WHERE signup.id = ?', [userId]);
    }

    static update(newStatus, userId) {
        return db.execute(
            "UPDATE signup SET status = ? WHERE signup.id = ?", 
            [newStatus, userId]
        );
    }

    save() {
        return db.execute(
            'INSERT INTO signup(email, password, name, status, createdAt) VALUES(?,?,?,?,?)',
            [this.email, this.password, this.name, this.status, this.createdAt]
        );
    }

    static chkEmailCount(email) {
        return db.execute("SELECT count(*) as emailCount FROM signup WHERE email = ?", [email]);
    }
}

