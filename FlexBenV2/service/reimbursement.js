const { format, compareAsc, getYear, isSameYear, isFuture, formatISO, nextDay} = require('date-fns');
const { es } = require('date-fns/locale');
let connection = require('../connection')
const login = require("../middleware/loginAuthenticator")
const fs = require('fs');
const { json } = require('body-parser');

getEmployeeReimbursements= async function (req,res){
    let sql = `SELECT rl.reimbursement_list_id, ri.reimbursement_item_id, reimbursement_name, category_id, rl.status, rl.employee_id, ri.amount from reimbursement_item ri left join reimbursement_list rl on rl.reimbursement_list_id=ri.reimbursement_list_id where rl.employee_id=${req.user.userId}`
    connection.query(sql, (err,result)=>{
        if(err) throw err;
        res.status(200).json({
            "message": "retrieved",
            "result": result
        })
    })
    return true;
}

getAllReimbursements = async function(req,res){
    let sql = `SELECT rl.reimbursement_list_id, ri.* from reimbursement_item ri left join reimbursement_list rl`
    connection.query(sql, (err,result,fields)=>{
        if(err) throw err;
        res.status(200).json({
            "message": "retrieved",
            "result": result
        })
    })
    return true;
}

addReimbursement = async function (req,listId){
    try{
        const currentDate = new Date();
        const { date_of_receipt } = req.body;
        const date_of_receipt_parsed = new Date(date_of_receipt);
        if(!isSameYear(date_of_receipt_parsed,currentDate) || isFuture(date_of_receipt_parsed) ){
            console.log("invalid date of reciept")
            return false;
        }

        const {amount}=req.body;
        if(amount<process.env.min_amount){
            console.log(`>>> Reimbursement cannot be added because reciept amount is not ${process.env.min_amount}`)
            return false;
        }
        const employeeId = await login.getUserId(req.user.email)
        const reimbursementid = listId
        const bodyKeys = Object.keys(req.body);
        const bodyVals = Object.values(req.body).map((val, index) =>
            typeof val === "string" ? `"${val}"` :
            !val ? "null" : bodyKeys[index]==="date_of_receipt" || bodyKeys[index]==="date_filed" ? new Date(val) : val
        );
        const formattedISO = formatISO(currentDate, { representation: 'date' })
        const sql = `INSERT INTO reimbursement_item (${bodyKeys},date_filed,reimbursement_list_id)VALUES (${bodyVals}` + `, "${formattedISO}",${reimbursementid})`;
        const added = await new Promise((resolve, reject) =>{
            connection.query(sql, (err,result)=>{
                if(err)reject(err)
                resolve(result)
            })
        })
        return true;
    }
    catch(e){
        console.log(e)
        return false
    }
}

listChecker = async function(req){
    let sql = `SELECT reimbursement_list_id, status  from reimbursement_list rl where employee_id=${req.user.userId} and status=1`
    const list = await new Promise((resolve,reject)=>{
    
        connection.query(sql,(err,result)=>{
            if(err)reject(err)
            resolve(result)
        })
    })
    return list;
}

displayAllList  = async function(req){
    let sql = `SELECT reimbursement_list_id, status  from reimbursement_list rl where employee_id=${req.user.userId}`
    const list = await new Promise((resolve,reject)=>{
        connection.query(sql,(err,result)=>{
            if(err)reject(err)
            resolve(result)
        })
    })
    return list;
}

listCreator = async function(req){
    const dateNow = formatISO(new Date(), { representation: 'date' })
    let sql = `INSERT into reimbursement_list (employee_id, cutoff_id, status, date_updated) values (${req.user.userId},1,1,"${dateNow}")`
    const create = await new Promise((resolve,reject) =>{
        connection.query(sql, (err,result)=>{
            if (err) reject (err);
            resolve(result)
        });
    })
    const check = await listChecker(req);
    return check[0].reimbursement_list_id
}



listUpdator = async function(req, listId){
    try{
        console.log(">>> Updating list")
        const currentDate= new Date()
        const formattedISO = formatISO(currentDate, { representation: 'date' })
        const transtNum = await generateTransactionCode(req, listId)
        const totalAmount = await getTotalAmount(listId)
        let sql2 = `UPDATE reimbursement_list SET employee_id=${req.user.userId}, cutoff_id=1, total_reimbursement_amount=${totalAmount}, date_submitted="${formattedISO}", transaction_number=${transtNum} WHERE reimbursement_list_id=${listId};`
        const item = await new Promise((resolve,reject) => {
            connection.query(sql2, (err, result) =>{
                if (err) reject (err);
                resolve(result)
            })   
        })
        return true;
    }
    catch(e){
        console.log(e)
        return false;
    }
    
}

generateTransactionCode = async function(req, listId){
    const dateNow = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const cutoffid = await getCutoffId();
    const reimbursementid = listId
    const transactionCode = await getCompanyCode(req.user.userId) +  cutoffid + dateNow + reimbursementid;
    return transactionCode;
}

getCutoffId = async function(){
    return 1;
}

getCompanyCode = async function(userid){
    let sql = `SELECT c.company_code from company c left join employee e on e.company_id=c.company_id where e.employee_id =${userid}`;
    const user = await new Promise((resolve,reject)=>{
        connection.query(sql, (err,result)=>{
            if(err) reject(err)
            else{
                resolve(result)
            }
        })
    })
    return user[0].company_code;
}

getTotalAmount = async function(listid){
    let sql = `select sum(amount) as total from reimbursement_item ri left join reimbursement_list rl on rl.reimbursement_list_id=ri.reimbursement_list_id where status=1 and rl.reimbursement_list_id=${listid}`
    const totalAmount = await new Promise((resolve,reject)=>{
        connection.query(sql, (err,result)=>{
            if(err) reject(err)
            resolve(result?.length>0 ? result[0].total:0)
        })
    })
    return totalAmount
}

checkItemOwner = async function(req, itemId){
    let sql = `SELECT reimbursement_item_id from reimbursement_item ri left join reimbursement_list rl on  rl.reimbursement_list_id=ri.reimbursement_list_id where rl.employee_id=${req.user.userId} and reimbursement_item_id=${req.params.query}`
    const isOwner = await new Promise((resolve,reject)=>{
        connection.query(sql, (err,result)=>{
            if(err) reject(err)
            resolve(result)
        })
    })
    return isOwner.length!==0
}


checkStatus = async function(req, listid, statusid){
    let sql = `select status, employee_id from reimbursement_list rl where status=${statusid} and reimbursement_list_id=${listid}`
    const status = new Promise((resolve, reject)=>{
        connection.query(sql, (err,result)=>{
            if(err) reject(err)
            resolve(result)
        })
    })
    return status
}

printReciept = async function(req){
    let sql = `Select * from employee where email="${req.user.email}"`
    const user = await new Promise((resolve,reject)=>{
        connection.query(sql, (err,result)=>{
            if(err) reject(err)
            else{
                resolve(result[0])
            }
        })
    } )
    let sql1 = `select * from reimbursement_list rl where employee_id =1 and status=${req.user.userId}`
    const list = await new Promise((resolve,reject)=>{
        connection.query(sql1, (err,result)=>{
            if(err) reject(err)
            else{
                resolve(result)
            }
        })
    })
    if(list.length!==0){
        let reciept ={
            "Employee Number: ": `${user.employee_id}`,
            "Employee Name: ": `${user.first_name}` + `${user.last_name}`,
            "Date Submitted: ": "today",
            "Reimbursement Items": "array",
            "Total Reimburseable Amount": "idk",
            "Transaction Number": "6069696"
        }
        let data = JSON.stringify(reciept);
        fs.writeFile("reciept.txt",data, (err) =>{
            if(err) throw (err);
            else{
                console.log("file written successfully")
            }
        })
        return data
    }
    else{
        console.log("no items")
        return null
    }
}

approveItem= async function(req){
    const statusid = 2
    const status = await checkStatus(req,req.params.listid,statusid)
    if(status[0]?.status===2){
        let sql = `UPDATE reimbursement_list SET status=4 where reimbursement_list_id=${req.params.listid}`
            const item = new Promise((resolve,reject)=>{
                connection.query(sql,(err, result)=>{
                    if(err) reject(err)
                    resolve(result)
                })
            })
            return true
    }
    else{
        return false
    }           
}

rejectItem = async function(req){
    const statusid = 2
    const status = await checkStatus(req,req.params.listid,statusid)
    if(status[0]?.status===3){
        let sql = `UPDATE reimbursement_list SET status=3 where reimbursement_list_id=${req.params.listid}`
            const item = new Promise((resolve,reject)=>{
                connection.query(sql,(err, result)=>{
                    if(err) reject(err)
                    resolve(result)
                })
            })
            return true
    }
    else{
        return false
    }  
}

submitItem = async function(req){
    const statusid = 1
    const status = await checkStatus(req,req.params.query,statusid)
    if(status[0]?.status===1){
        if(status[0].employee_id == req.user.userId){
            let sql = `UPDATE reimbursement_list SET status=2 where reimbursement_list_id=${req.params.query}`
            const item = new Promise((resolve,reject)=>{
                connection.query(sql,(err, result)=>{
                    if(err) reject(err)
                    resolve(result)
                })
            })
            return true
        }
    }
    else{
        return false
    }           
}



module.exports = {
    getEmployeeReimbursements,
    getAllReimbursements,
    listChecker,
    checkItemOwner,
    checkStatus,
    printReciept,
    approveItem,
    submitItem
}