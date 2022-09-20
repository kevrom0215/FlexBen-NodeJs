let express = require('express')
const app = express();
let router = express.Router()
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/tokenAuthenticator');
const e = require('express');
const { getDate } = require('date-fns');
const {getEmployeeReimbursements,getAllReimbursements, listChecker, checkItemOwner, checkStatus, approveItem} = require('../service/reimbursement');
const connection = require('../connection');
const { printReciept } = require('../service/reimbursement');

//configure for admin and employee
router.get('/', authenticateToken, async (req,res,next)=>{
    if(req.user.userType === "employee"){
        await getEmployeeReimbursements(req,res)
    }
    else if(req.user.userType === "admin"){
           await getAllReimbursements(req,res)
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
})



router.post('/add', authenticateToken, async (req,res,next)=>{
    if(req.user.userType==="employee"){
        const check = await listChecker(req)
        if(check.length !== 0){
            console.log("updated existing")
            const listId = check[0].reimbursement_list_id
            if(await addReimbursement(req, listId)){
                if(listUpdator(req, listId)){
                    res.status(200).send("success")
                }
            }
            else{
                res.status(400).send("there was an error in creating item")
            }
        }
        else{
            const listId = await listCreator(req);
            console.log(`created new list ${listId}`)
            if(Number.isInteger(listId)){
                if(addReimbursement(req, listId)){
                    if(await listUpdator(req, listId)){
                        res.status(200).send("success")
                    }
                }
                else{
                    res.status(400).send("error in creating list")
                }
            }
            else{
                res.status(400).send("there was an error")
            }
            
        }
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
})

router.delete('/delete/item/:query', authenticateToken, async (req,res,next)=>{
    if(req.user.userType==="employee"){
        if(await checkItemOwner(req, req.params.query)){
            let sql = `DELETE FROM reimbursement_item WHERE reimbursement_item_id=${req.params.query}`
            const temp= await listChecker(req)
            const listId = temp[0].reimbursement_list_id
            const updator = await new Promise((resolve,reject)=>{
                connection.query(sql, (err,result)=>{
                    if(err) reject(err)
                    resolve(result)
                })
            })
            const updated = await listUpdator(req, listId)
            res.status(200).send(`deleted reimbursement item ${req.params.query}`)
        }
        else{
            res.status(401).send("Item not found or it is not yours")
        }
    }
    else{
        res.status(401).send({
            "message" : "unauthorized"
        })
    }
})

router.put('/submit/:query', authenticateToken, async (req,res,next)=>{
    if(req.user.userType==="employee"){
        if(await submitItem(req)){
            res.status(201).send("updated")
        }
        else{
            res.status(401).send({
                "message" : "no items to submit"
            })
        }
        //check status if draft then change status
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
    
})


router.get('/print', authenticateToken,async (req,res,next)=>{
    if(req.user.userType==="employee"){
        const check = await printReciept(req);
        if(check){
            res.status(200).send({
                "message" : "Ok"
            })
        }
        else{
            res.status(400).send({
                "message" : "There was an error"
            })
        }
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
})

router.get('/flexpoints', authenticateToken, (req,res,next)=>{
    res.status(200).send("ok")
})

router.get('/search/:employeeid',authenticateToken, (req,res,next)=>{
    if(req.user.userType==="admin"){
        let sql = `select reimbursement_item_id, reimbursement_name from reimbursement_list rl left join reimbursement_item ri on rl.reimbursement_list_id=ri.reimbursement_list_id where employee_id=${req.params.employeeid}`
        connection.query(sql, (err,result)=>{
            res.status(200).json({
                "message": `employee ${req.params.employeeid} items retrieved`,
                "result": result
            })
        })
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
})


router.put('/approve/:listid', authenticateToken, async (req,res,next)=>{
    if(req.user.userType==="admin"){
       if(await approveItem(req)){
        res.status(201).send("Approved")
       }
       else{
        res.status(404).send("there was an error")
       }
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
})

router.put('/reject/:listid', authenticateToken, async (req,res,next)=>{
    if(req.user.userType==="admin"){
        if(await approveItem(req)){
            res.status(201).send("Rejected")
           }
           else{
            res.status(404).send("there was an error")
           }
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
})

//checkifitem exists
router.put('/payout/:listid', authenticateToken, (req,res,next)=>{
    if(req.user.userType==="hr"){
        
    }
    else{
        res.status(401).send({
            "message" : "Unauthorized"
        })
    }
})



module.exports = router;