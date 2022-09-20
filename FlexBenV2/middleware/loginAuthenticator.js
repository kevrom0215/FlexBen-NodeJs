let connection = require("../connection");


getUserByEmail = async function(email){
    const users = await new Promise((resolve, reject) =>{
        connection.query("SELECT first_name, last_name, email, password from employee", (err,result,fields)=>{
            if(err) reject(err);
            else{
                resolve(result)
            }
        })
    })
    const filteredUserArray = users.filter(
        (user) => user.email === email
    )
    return filteredUserArray.length === 0 ? null: filteredUserArray[0];
}

getUserType = async function(email){
    const users = await new Promise((resolve, reject) =>{
        let sql = `SELECT  e.email , r.role from employee e left join role r on e.role_id=r.role_id` ;
        connection.query(sql, (err,result,fields)=>{
            if(err) reject(err);
            else{
                resolve(result)
            }
        })
    })
    const filteredUserArray = users.filter(
        (user) => user.email === email
    )
    return filteredUserArray.length === 0 ? null: filteredUserArray[0].role;
}

getUserId = async function(email){
    const users = await new Promise((resolve,reject) =>{
        let sql = `Select employee_id, email from employee where email= "${email}"`
        connection.query(sql, (err,result,fields)=>{
            if(err) reject(err);
            else{
                resolve(result)
            }
        })
    })
    const filteredUserArray = users.filter(
        (user) => user.email === email
    )
    return filteredUserArray.length === 0 ? null: filteredUserArray[0].employee_id;
}

getReimbursementId = async function(id){
    const items = await new Promise((resolve,reject) =>{
        let sql = `Select flex_reimbursement_id from flex_reimbursement where employee_id= "${id}"`
        connection.query(sql, (err,result,fields)=>{
            if(err) reject(err);
            else{
                resolve(result)
            }
        })
    })
    return items.length === 0 ? []: items;
}

authenticateUser = async function(email, password){
    const user = await getUserByEmail(email);
    if(user){
        return (password === user.password);
    }
    else{
        return false;
    }
}

module.exports = {
    authenticateUser,
    getUserByEmail,
    getUserType,
    getUserId,
    getReimbursementId
}