const db = require('../util/database');

module.exports = class Posts {

    constructor(id, title, content, creator, createdAt, imageUrl, userId) {
        this.id = id,
        this.title = title,
        this.content = content,
        this.creator = creator,
        this.createdAt = createdAt,
        this.imageUrl = imageUrl,
        this.userId = userId
    }

    static findById(postId) {
        return db.execute('SELECT * FROM new_post WHERE new_post.id = ?', [postId]);
    }

    static fetchPosts() {
        return db.execute("SELECT * FROM new_post ORDER BY id DESC");
    }
    
    static fetchAll(limit, skip) {
        return db.execute("SELECT * FROM new_post ORDER BY id DESC LIMIT ?, ?",[skip, limit]);
    }

    save() {
        return db.execute(
            'INSERT INTO new_post(title, content, creator, createdAt, imageUrl, user_Id) VALUES(?,?,?,?,?,?)',
            [this.title, this.content, this.creator, this.createdAt, this.imageUrl, this.userId]
        );
    }

    update() {
        return db.execute(
            "UPDATE new_post SET title = ?, content= ?, creator= ?, createdAt= ?, imageUrl= ? where id = ?", 
            [this.title, this.content, this.creator, this.createdAt, this.imageUrl, this.id]
        );
    }

    static delete(postId) {
        return db.execute("DELETE FROM new_post where id = ?", [postId]);
    }

    static postCount() {
        return db.execute("SELECT count(*) as numRows FROM new_post");
    }
}

