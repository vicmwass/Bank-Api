const sqlite3 =require('sqlite3')
const {defLogger} =require('./logger.js')

// const logger=defLogger

const db = new sqlite3.Database('mydatabase.db',()=>{});

const dbName='mydatabase.db'

new sqlite3.Database(dbName,(err)=>{
    if(err){
        defLogger.error(err.message)
    }else{
        defLogger.info("database Ok")
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='ACCOUNT';",[],(err,row)=>{            
            if(row==undefined){
                db.run('CREATE TABLE ACCOUNT (account_id INTEGER PRIMARY KEY AUTOINCREMENT,account_holder_id INTEGER NOT NULL,account_holder_name TEXT NOT NULL,account_number TEXT UNIQUE NOT NULL,account_balance NUMERIC DEFAULT 0);',[],(err)=>{
                if(err){
                    defLogger.info(err.message)
                }else{
                    defLogger.info("ACCOUNT table created")
                }
            })}
        })
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='TRANSACTIONS';",[],(err,row)=>{            
            if(row==undefined){
                db.run('CREATE TABLE TRANSACTIONS (transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,credit_account_no TEXT UNIQUE NOT NULL,debit_account_no TEXT UNIQUE NOT NULL,amount NUMERIC NOT NULL );',[],(err)=>{
                if(err){
                    defLogger.info(err.message)
                }else{
                    defLogger.info("TRANSACTIONS table created")
                }
            })}
        })
    }})


const getAllAccounts=()=>{
    const sql='SELECT account_id,account_holder_name,account_holder_id,account_number,account_balance FROM ACCOUNT'
    return new Promise((resolve, reject) => {
        db.all(sql,[],(err,rows)=>{
            if(err){
                reject(err)
            }else{
                resolve(rows)
            }
        })
    })    
}


const getAccountByAccountNumber=(account_number)=>{
    const sql='SELECT account_holder_name,account_holder_id,account_number,account_balance FROM ACCOUNT WHERE  account_number= ?'
    return new Promise((resolve, reject) => {
        db.get(sql,[account_number],(err,row)=>{
            if(err){
                reject(err)
            }else{
                resolve(row)
            }
        })
    })
    
}
const getAccountByHolderId=(account_holder_id)=>{
    const sql='SELECT account_holder_name,account_holder_id,account_number,account_balance FROM ACCOUNT WHERE  account_holder_id= ?'
    return new Promise((resolve, reject) => {
        db.all(sql,[account_holder_id],(err,row)=>{
            if(err){
                reject(err)
            }else{
                resolve(row)
            }
        })
    })
    
}

const createAccount=(account_holder_id,account_holder_name,account_number)=>{
    const sql="INSERT INTO ACCOUNT (account_holder_id,account_holder_name,account_number) VALUES (?,?,?)"
    return new Promise((resolve, reject) => {
        db.run(sql,[account_holder_id,account_holder_name,account_number],(err)=>{
            if(err){
                reject(err)
            }else{
                resolve()
            }
        })
    })
    
}

const updateAccountBalance=(amount,account_number)=>{
    const sql="UPDATE ACCOUNT SET account_balance=? WHERE account_number= ?"
    return new Promise((resolve, reject) => {
        db.run(sql,[amount,account_number],(err,row)=>{
            if(err){
                reject(err)
            }else if(this.changes===0){
                reject(new Error("No rows updated. Account ID may not exist."))
            }else{
                resolve(row)
            }
        })
    })
    
}

const deleteAccount=(account_number)=>{    
    const sql="DELETE FROM ACCOUNT WHERE account_number= ?"
    return new Promise((resolve, reject) => {
        db.run(sql,[account_number],(err)=>{
            if(err){
                reject(err)
            }else{
                resolve()
            }
        })
    })
    
}

const getAllTransactions=()=>{
    const sql='SELECT debit_account_no,credit_account_no,amount FROM TRANSACTIONS'
    return new Promise((resolve, reject) => {
        db.all(sql,[],(err,rows)=>{
            if(err){
                reject(err)
            }else{
                resolve(rows)
            }
        })
    })    
}

const addTransaction=(debit_account_no,credit_account_no,amount)=>{
    const sql="INSERT INTO TRANSACTIONS (debit_account_no,credit_account_no,amount) VALUES (?,?,?)"
    return new Promise((resolve, reject) => {
        db.run(sql,[debit_account_no,credit_account_no,amount],(err)=>{
            if(err){
                reject(err)
            }else{
                resolve()
            }
        })
    })
    
}


module.exports={
    deleteAccount,
    createAccount,
    getAccountByHolderId,
    getAccountByAccountNumber,
    getAllAccounts,
    updateAccountBalance,
    getAllTransactions,
    addTransaction
}