const express=require('express');
const _ =require('lodash');
const Path=require('path-parser').default;
const {URL} =require('url')
const router=express.Router();
const mongoose=require('mongoose')
const keys=require('../config/keys');
const requireLogin=require('../middleware/requireLogin');
const requireCredits=require('../middleware/requireCredits')
const Mailer=require('../services/Mailer')
const surveyTemplates=require('../services/emailtemplates/surveyTemplate')
const Survey=mongoose.model('survey')

router.get('/api/surveys/thanks',(req, res)=>{
    res.send("Thanks for Voting")
})
router.post('/api/surveys/webhooks',(req, res)=>{
    const p= new Path('/api/surveys/:surveyId/:choice')
    const event=_.chain(req.body)
    .map(({url,email})=>{
        const match=p.test(new URL(url).pathname);
        if(match){
            return {email,id:match.surveyId,choice:match.choice}
        }
    })
    .compact()
    .uniqBy('email','id')
    .each(({email,id,choice})=>{
        Survey.updateOne({
            _id:id,
            recipients:{
                $elemMatch:{
                    email,
                    responded:false
                }
            }
        },{
            $inc:{[choice]:1},
            $set:{'recipients.$.responded':true}
        }).exec();
    })
    .value()
    console.log("djflk",event)
    res.send({})
})

router.get('/api/surveys',requireLogin,async(req,res)=>{
    const survey=await Survey.find({
        _user:req.user.id
    }).select({recipients:false});
    res.send(survey);
})

router.post('/api/surveys',requireLogin, requireCredits, async(req , res)=>{
    const {title,subject,body,recipients}=req.body;
    const survey=new Survey({
        title,
        subject,
        body,
        recipients:recipients.split(',').map(email=>({email})),
        _user:req.user.id,
        dateSent:Date.now()
    })
    const mailer=new Mailer(survey,surveyTemplates(survey));
    try{
        await mailer.send()
        await survey.save()
        req.user.credit -=1
        const user= await req.user.save();
        res.send(user)
        
    }catch(err){
        res.status(422).send(err)
    }
    

})






module.exports=router