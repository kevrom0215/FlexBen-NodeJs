let express = require('express');
let app = express();
require('dotenv').config();
const router = express.Router();
const login = require('./routes/login')
const reimbursement = require('./routes/reimbursement')
const {authenticateToken} = require('./middleware/tokenAuthenticator')
const bodyParser = require('body-parser')

app.use(bodyParser.json({inflate:true, limit: '100kb', type: 'application/json'}));
app.use("/login", login);
app.use("/reimbursement", reimbursement);

router.get('/', authenticateToken, (req,res,next)=>{
    res.status(200).json({
        "logged in user": req.user
    })
})

router.get('*', function(req, res){
    res.status(404).send(`
    <html>
        <body align=center>        
            <img width=auto height=100% src='https://http.dog/404.jpg'/>
        </body>
    </html>`);
});

app.use("/",router);








var port = 6969;
var server = app.listen(port, function(){
    console.log(">>>>> Node server is running on http://localhost:" + port + "..")
})