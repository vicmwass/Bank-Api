const  { Router } =require("express")
const {defLogger } =require('../logger.js' )
const {getAllAccounts,getAccountByAccountNumber,getAccountByHolderId,updateAccountBalance,createAccount,deleteAccount} =require("../database.js")
// const bodyParser= require("body-parser")
const {sendMessage}=require('../rabbitmqConn.js')
const router=Router()

const logger=defLogger
// create application/json parser

router.get('/',(req,res)=>{    
    getAllAccounts().then((result)=>{
        res.status(200).json(result) 
    }).catch((err)=>{
        logger.error(err.message);
        res.status(400).send('fail to get accounts') 
    })
})

router.route("/withdraw_amount").post((req,res)=>{
    let {amount,account_number}=req.body
    getAccountByAccountNumber(account_number).then((result)=>{
        if (result==undefined) {
            logger.error("account does not exist");
            res.status(400).json({
                message:"account does not exist"
            })
        }else if (amount >= result.account_balance) {
            logger.error(`Account with account number ${account_number} has insufficient amount to perform withdrawal of amount ${amount}`);
            res.status(400).json({
                message: `Account with account number ${account_number} has insufficient amount to perform withdrawal of amount ${amount}`
            })
        }else{            
            const new_balance=result.account_balance-amount
            updateAccountBalance(new_balance,account_number).then(()=>{
                let data={
                    account_number,previous_balance:result.account_balance,current_balance:new_balance
                }
                sendMessage(JSON.stringify({
                    account_holder_id:result.account_holder_id,
                    amount
                }),'message-customer.withdraw-amount')
                res.status(201).json({
                    message:"withdrawn amount successfully",
                    account_details:data
                })
            }).catch((err)=>{
                logger.error(err.message);
                res.status(500).json({
                    message:"server error"
                })
            })
        }        
    }).catch((err)=>{
        logger.error(err.message);
            res.status(500).json({
                message:"server error"
            })
    }) 

})


router.route("/add_amount").post((req,res)=>{
    let {amount,account_number}=req.body
    getAccountByAccountNumber(account_number).then((result)=>{
        if (result==undefined) {
            logger.error("account does not exist");
            res.status(400).json({
                message:"account does not exist"
            })
        }else{
            const new_balance=result.account_balance+amount
            updateAccountBalance(new_balance,account_number).then(()=>{
                let data={
                    account_number,previous_balance:result.account_balance,current_balance:new_balance
                }
                sendMessage(JSON.stringify({
                    account_holder_id:result.account_holder_id,
                    amount
                }),'message-customer.added-amount')
                res.status(201).json({
                    message:"added amount successfully",
                    account_details:data
                })
            }).catch((err)=>{
                logger.error(err.message);
                res.status(500).json({
                    message:"server error"
                })
            })
        }        
    }).catch((err)=>{
        logger.error(err.message);
            res.status(500).json({
                message:"server error"
            })
    }) 

})


router.route("/").get((req,res)=>{
    getAccountByAccountNumber(req.query.account_number).then((result)=>{
        if (result==undefined) {
            logger.error("account does not exist");
            res.status(400).json({
                message:"account does not exist"
            })
        }else{
            res.status(200).json(result) 
        }        
    }).catch((err)=>{
        logger.error(err.message);
            res.status(500).json({
                message:"server error"
            })
    })       
  
})




router.route("/money_transfer").post(async(req,res)=>{
    let {credit_account_number,debit_account_number,amount}=req.body
    let credit_account_amount,credit_account_holder
    let debit_account_amount,debit_account_holder
    try{
        //get credit account details
        let result = await getAccountByAccountNumber(credit_account_number)
        if (result == undefined) {
            logger.error(`Account with account number ${credit_account_number} does not exist`);
            res.status(400).json({
                message: `Account with account number ${credit_account_number} does not exist`
            })
            return
        }
        if (amount >= result.account_balance) {
            logger.error(`Credit account with account number ${credit_account_number} has insufficient amount to perform transfer`);
            res.status(400).json({
                message: `Credit account with account number ${credit_account_number} has insufficient amount to perform transfer`
            })
            return
        }
        credit_account_amount=result.account_balance     
        credit_account_holder=result.account_holder_id

        //get debit account details
        result = await getAccountByAccountNumber(debit_account_number)
        if (result == undefined) {
            logger.error(`Account with account number ${debit_account_number} does not exist`);
            res.status(400).json({
                message: `Account with account number ${debit_account_number} does not exist`
            })
            return
        }
        debit_account_amount=result.account_balance
        debit_account_holder=result.account_holder_id
    }catch(err){
        logger.error("Failed transfer accounts check due to database issue");
        res.status(500).json({
            message:"server error"
        })
        return
    }
    //try to update credit account amount
    try{
        await updateAccountBalance(credit_account_amount-amount,credit_account_number)
    }catch(err){
        logger.error("Faied transfer amount from credit account due to database issue");
        res.status(500).json({
            message:"server error"
        })
        return
    }
    //try to update debit account amount
    try{
        await updateAccountBalance(debit_account_amount+amount,debit_account_number)
    }catch(err){
        logger.error("Faied transfer amount to debit account due to database issue");
        try{
            await updateAccountBalance(credit_account_amount+amount,credit_account_number)
        }catch(err){
            logger.error("Faied transfer revert amount to credit account due to database issue");
        }
        res.status(500).json({
            message:"server error"
        })
        return
    }
    try{
        await addTransaction(debit_account_number,credit_account_number,amount)
    }catch(err){
        logger.error("Faied transfer revert amount to credit account due to database issue");
    }
    res.status(500).json({
        message:"server error"
    })
    sendMessage(JSON.stringify({
        account_holder_id:credit_account_holder,
        amount
    }),'message-customer.withdraw-amount')
    sendMessage(JSON.stringify({
        account_holder_id:debit_account_holder,
        amount
    }),'message-customer.added-amount')

    res.status(200).json({
        message:"transfer successfully",
    })

})



module.exports=router