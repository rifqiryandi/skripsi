let db = require('../config/db.config')

const npsDashboard = async (params) => {
    let areaSearch, layananSearch
    if (params.area != '') {
        areaSearch = ' AND l.AREA = :area '
    } else {
        areaSearch = ' '
    }
    if (params.layanan != '') {
        layananSearch = " AND p.LAYANAN = :layanan "
    }else{
        layananSearch = " AND p.LAYANAN is not null "
    }
    let data = db.knex.raw(
        " select l.REGIONAL, vk.NAMAKTR, e.EVENT_NAME , e.FLAG_TEMP, e.EVENT_ID ,p.PARTY_NAME , p.PARTY_PHONE, p.PARTY_GENDER, p.PARTY_JOB, FORMAT (p.CREATE_AT, 'MM-yyyy') as create_at, (qc.CHOICE_POIN*10) as POIN " +
        ' FROM ' +
        ' EVENTS e' +
        ' LEFT JOIN PARTY p on  ' +
        ' e.EVENT_ID = p.EVENT_ID ' +
        ' LEFT JOIN QUEST_CHOICES qc on ' +
        ' p.CHOICE_ID  = qc.CHOICE_ID ' +
        ' LEFT JOIN LOKET l on ' +
        ' p.LOKET_ID = l.ID ' +
        ' LEFT JOIN view_kantor vk on ' +
        ' l.AREA = vk.NOPEND ' +
        ' WHERE ' +
        ' e.FLAG_TEMP = 1 ' +
        ' AND (p.CREATE_AT BETWEEN :start AND :end) '+
        areaSearch +
        layananSearch +
        ' AND qc.CHOICE_POIN * 10 BETWEEN :poin_awal AND :poin_akhir ',
        params
    )

    return await data
}

module.exports = {
    npsDashboard
}