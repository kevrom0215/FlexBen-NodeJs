const jwt = require('jsonwebtoken');

authenticateToken=(req,res,next)=>{
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.status(401).send("No token")
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user)=>{
        if(err) return res.status(401).send("Unauthorized");
        req.user = user
        console.log("Authenticated");
        next()
    })
}


module.exports = {authenticateToken}