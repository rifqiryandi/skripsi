let db = require('../config/db.config')

const getFeedbackCustomer = async (params) => {
    let areaSearch, layananSearch, condition
    if (params.area != undefined && params.area != '') {
        areaSearch = ' AND l.AREA = :area AND '
        condition = ' l.AREA = vk.NOPEND '
    } else if (params.kc != undefined && params.kc != '') {
        areaSearch = ' AND l.NOPEND = :kc AND '
        condition = ' l.NOPEND = vk.NOPEND '
    } else if (params.kcu != undefined && params.kcu != '') {
        areaSearch = ' AND l.KCU = :kcu AND '
        condition = ' l.NOPEND = vk.NOPEND '
    } else {
        areaSearch = ""
        condition = ' l.AREA = vk.NOPEND '
    }

    if (params.layanan != '') {
        layananSearch = "  p.LAYANAN = :layanan AND"
    } else {
        layananSearch = "  p.LAYANAN is not null AND"
    }

    let data = db.knex.raw("SELECT  vk.NAMAKTR, l.NOPEND  ,l.ID , l.NAMA_LOKET ,p.PARTY_ID , p.PARTY_NAME, p.PARTY_GENDER ,cp.type_answer, cp.desc_answer  from CHILD_PARTY cp " +
        ' right join PARTY p on p.PARTY_ID = cp.id_party ' +
        ' LEFT join LOKET l on l.ID = p.LOKET_ID ' +
        ' inner JOIN view_kantor vk on' +
        condition +
        ' where ' +
        ' (p.CREATE_AT BETWEEN :start AND :end) and ' +
        layananSearch +
        areaSearch +
        " cp.desc_answer <> '' " +
        ' ORDER  by p.CREATE_AT DESC ', params)
    return data
}

module.exports = {
    getFeedbackCustomer
}