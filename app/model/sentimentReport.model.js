let db = require('../config/db.config')

const getFeedbackCustomer = async (params) => {
    let areaSearch, layananSearch, condition, typeSearch
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

    
    if (params.tipe != '' && params.tipe != undefined) {
        typeSearch = ' cp.type_answer = :tipe AND '
    }else{
        typeSearch = ''
    }

    let data = db.knex.raw("SELECT  p.CREATE_AT, vk.NAMAKTR, l.NOPEND  ,l.ID , l.NAMA_LOKET ,p.PARTY_ID , p.PARTY_NAME, p.PARTY_JOB, p.PARTY_PHONE , p.PARTY_GENDER, qc.CHOICE_POIN ,cp.type_answer, cp.desc_answer  from CHILD_PARTY cp " +
        ' right join PARTY p on p.PARTY_ID = cp.id_party ' +
        ' LEFT join LOKET l on l.ID = p.LOKET_ID ' +
        ' inner JOIN view_kantor vk on ' +
        condition +
        ' left JOIN QUEST_CHOICES qc on p.CHOICE_ID = qc.CHOICE_ID '+
        ' where ' +
        ' (p.CREATE_AT BETWEEN :start AND :end) and ' +
        layananSearch +
        areaSearch +
        typeSearch +
        " cp.desc_answer <> '' " +
        ' ORDER  by p.CREATE_AT DESC ', params)
    return data
}

module.exports = {
    getFeedbackCustomer
}