module.exports=(req,res,next)=>{
    if(req.user.credit<1){
        res.status(403).send({error:'no Credit'})
    }
    next();
}