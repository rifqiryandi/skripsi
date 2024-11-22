let db = require('../config/db.config')
let get_try = () => {
    // return db.knex('m_radir').select('deskripsi_arahan', 'file_radir')
    return db.knex.raw('SELECT * FROM CHILD_PARTY p',)
}

module.exports = {
    get_try
}