let express = require('express')
const app = express();
let router = express.Router()
let connection = require('../connection')
const login = require("../middleware/loginAuthenticator")
const jwt = require('jsonwebtoken');

router.post('/', async (req,res,next)=>{
    if(!req || !req.headers.authorization){
        res.status(401).send(`<html>
        <body align=center>        
                    <img height=100% src='https://http.cat/401.jpg'/>
                    </body>
                </html>`)
    }
    else{
        let base64Encoding = req.headers.authorization.split(" ")[1];
        let credentials = Buffer.from(base64Encoding, "base64").toString().split(":");
        const email = credentials[0];
        const password = credentials[1];
        const isAuthenticated = await login.authenticateUser(email, password)
        if(isAuthenticated){
            const userId = await login.getUserId(email)
            const userType = await login.getUserType(email)
            const accessToken = jwt.sign({email, password, userType, userId}, process.env.ACCESS_TOKEN_SECRET);
            res.status(200).send({
                "user_id": userId,
                "email": email,
                "password": password,
                "role": userType,
                "token": accessToken,
                "message": "user authenticated"
            })
        }
        else{
            res.status(400).send({
                "message": "no match"
            })
        }
    }
})



module.exports = router;