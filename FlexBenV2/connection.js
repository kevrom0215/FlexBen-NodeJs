let mysql = require('mysql')

let connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'flexbenapp'
})

connection.connect((err)=>{
    if(err){
        throw err;
    }
    console.log(">>>> Connected to Database")
})

module.exports = connection; 