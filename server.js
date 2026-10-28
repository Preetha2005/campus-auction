import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import initSqlJs from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname=path.dirname(fileURLToPath(import.meta.url))
const app=express()
app.use(cors({origin:true,credentials:true}))
app.use(express.json({limit:'3mb'}))

const SQL=await initSqlJs({locateFile:file=>path.join(__dirname,'node_modules/sql.js/dist',file)})
const dbPath=path.join(__dirname,'campusbid.sqlite')
const db=new SQL.Database(fs.existsSync(dbPath)?fs.readFileSync(dbPath):undefined)
const save=()=>fs.writeFileSync(dbPath,Buffer.from(db.export()))

db.run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,email TEXT UNIQUE,password TEXT,phone TEXT,branch TEXT,year TEXT,bio TEXT,avatar TEXT);
CREATE TABLE IF NOT EXISTS listings(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,category TEXT,condition TEXT,description TEXT,price REAL,increment REAL,seller_id INTEGER,seller TEXT,location TEXT,ends INTEGER,image TEXT,status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS bids(id INTEGER PRIMARY KEY AUTOINCREMENT,listing_id INTEGER,bidder_id INTEGER,bidder TEXT,amount REAL,time INTEGER);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,title TEXT,body TEXT,time INTEGER,read INTEGER DEFAULT 0);`)

const count=(sql,p=[])=>db.exec(sql,p.length?p:[])[0]?.values?.[0]?.[0]||0
if(count('SELECT COUNT(*) FROM listings')===0){
  const seed=[
 ['Campus Commuter Bicycle','cycle','Good','Reliable commuter cycle with working brakes and front basket.',1450,100,'Arjun M.','North Block',2280000,'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=900&q=80'],
 ['Casio fx-991ES Calculator','calculator','Like New','Scientific calculator used for one semester only.',480,20,'Priya S.','Hostel C',5700000,'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=80'],
 ['Engineering Mathematics — Vol. 1','books','Fair','Complete edition with helpful notes in chapters 1–4.',220,20,'Dev N.','Library Cafe',18000000,'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80'],
 ['Sony Wireless Headphones','electronics','Good','Comfortable wireless headphones with charging case.',790,50,'Nisha P.','South Campus',82800000,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'],
 ['Scientific Graphing Calculator','calculator','Good','Graphing calculator, battery compartment cleaned.',620,30,'Siddharth J.','Academic Block',12600000,'https://images.unsplash.com/photo-1564473185935-581c6dbbb5d2?auto=format&fit=crop&w=900&q=80'],
 ['Data Structures Textbook','books','Like New','Introduction to Algorithms, hardcover, no markings.',650,50,'Ananya R.','Hostel A',30600000,'https://images.unsplash.com/photo-1550399105-c4db5fb85c18?auto=format&fit=crop&w=900&q=80'],
 ['City Folding Bicycle','cycle','Fair','Compact folding cycle, ideal for hostel and metro travel.',2200,100,'Karan V.','East Gate',9000000,'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80'],
 ['Mechanical Keyboard','electronics','Like New','Compact 75% wireless keyboard with blue switches.',1850,100,'Meera S.','Innovation Lab',21600000,'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80'],
 ['Study Desk Lamp','electronics','Good','Dimmable LED desk lamp with USB charging port.',350,25,'Aarav P.','Hostel B',7200000,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80'],
 ['GATE Preparation Books Set','books','Good','Complete set of four exam preparation books.',1100,100,'Ishita G.','Library Steps',43200000,'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80'],
 ['Portable Bluetooth Speaker','electronics','Fair','Water-resistant speaker with 10-hour battery.',900,50,'Rohan K.','North Block',15400000,'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80'],
 ['Campus Sketching Kit','electronics','Like New','Professional sketch pencils, markers and drawing pad.',550,25,'Neha D.','Design Studio',28800000,'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80']]
  for(const x of seed){const now=Date.now();db.run('INSERT INTO listings(title,category,condition,description,price,increment,seller,location,ends,image) VALUES(?,?,?,?,?,?,?,?,?,?)',[...x.slice(0,6),x[6],x[7],now+x[8],x[9]])}
  save()
}

function all(sql,args=[]){const stmt=db.prepare(sql);stmt.bind(args);const rows=[];while(stmt.step()){rows.push(stmt.getAsObject())}stmt.free();return rows}
function one(sql,args=[]){return all(sql,args)[0]||null}
const secret=process.env.JWT_SECRET||'campusbid-local-development-secret'
function auth(req,res,next){const token=req.headers.authorization?.replace('Bearer ','');if(!token)return res.status(401).json({error:'Please sign in'});try{req.user=jwt.verify(token,secret);next()}catch{res.status(401).json({error:'Session expired'})}}
const clients=new Set()
function broadcast(type='listings'){const payload=`data: ${JSON.stringify({type})}\n\n`;clients.forEach(c=>c.write(payload))}
function listingShape(row){const bids=all('SELECT bidder,amount,time FROM bids WHERE listing_id=? ORDER BY time DESC',[row.id]);return {...row,price:Number(row.price),increment:Number(row.increment),ends:Number(row.ends),bids}}

app.post('/api/auth/register',(req,res)=>{const {name,email,password,phone='',branch='',year='',bio='',avatar=''}=req.body;if(!name||!email||!password)return res.status(400).json({error:'Name, email and password are required'});const exists=one('SELECT id FROM users WHERE email=?',[email.toLowerCase()]);if(exists)return res.status(409).json({error:'An account with this email already exists'});const hash=bcrypt.hashSync(password,10);db.run('INSERT INTO users(name,email,password,phone,branch,year,bio,avatar) VALUES(?,?,?,?,?,?,?,?)',[name,email.toLowerCase(),hash,phone,branch,year,bio,avatar]);save();const user=one('SELECT id,name,email,phone,branch,year,bio,avatar FROM users WHERE email=?',[email.toLowerCase()]);const token=jwt.sign({id:user.id,name:user.name,email:user.email},secret,{expiresIn:'30d'});broadcast('users');res.status(201).json({token,user})})
app.post('/api/auth/login',(req,res)=>{const {email,password}=req.body;const user=one('SELECT * FROM users WHERE email=?',[email?.toLowerCase()]);if(!user||!bcrypt.compareSync(password||'',user.password))return res.status(401).json({error:'Invalid email or password'});const safe=one('SELECT id,name,email,phone,branch,year,bio,avatar FROM users WHERE id=?',[user.id]);const token=jwt.sign({id:user.id,name:user.name,email:user.email},secret,{expiresIn:'30d'});res.json({token,user:safe})})
app.get('/api/me',auth,(req,res)=>res.json(one('SELECT id,name,email,phone,branch,year,bio,avatar FROM users WHERE id=?',[req.user.id])))
app.put('/api/me',auth,(req,res)=>{const {name,phone,branch,year,bio,avatar}=req.body;db.run('UPDATE users SET name=?,phone=?,branch=?,year=?,bio=?,avatar=? WHERE id=?',[name,phone,branch,year,bio,avatar,req.user.id]);save();broadcast('users');res.json(one('SELECT id,name,email,phone,branch,year,bio,avatar FROM users WHERE id=?',[req.user.id]))})
app.get('/api/listings',(req,res)=>res.json(all('SELECT * FROM listings ORDER BY ends ASC').map(listingShape)))
app.post('/api/listings',auth,(req,res)=>{const {title,category,condition,description,price,increment,hours,image}=req.body;if(!title||!price||!hours)return res.status(400).json({error:'Item details are incomplete'});const user=one('SELECT name FROM users WHERE id=?',[req.user.id]);const ends=Date.now()+Number(hours)*3600000;db.run('INSERT INTO listings(title,category,condition,description,price,increment,seller_id,seller,location,ends,image) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[title,category,condition,description||'',Number(price),Number(increment)||50,req.user.id,user.name,'Campus',ends,image||'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80']);save();const listing=one('SELECT * FROM listings ORDER BY id DESC LIMIT 1');broadcast('listings');res.status(201).json(listingShape(listing))})
app.post('/api/listings/:id/bids',auth,(req,res)=>{const listing=one('SELECT * FROM listings WHERE id=?',[req.params.id]);if(!listing)return res.status(404).json({error:'Auction not found'});if(Date.now()>=listing.ends)return res.status(400).json({error:'Bidding has closed'});const bids=all('SELECT * FROM bids WHERE listing_id=? ORDER BY time DESC',[listing.id]);const min=bids.length?Number(listing.price)+Number(listing.increment):Number(listing.price);const amount=Number(req.body.amount);if(amount<min)return res.status(400).json({error:`Minimum bid is ₹${min}`});let ends=listing.ends;if(ends-Date.now()<30000)ends=Date.now()+60000;db.run('UPDATE listings SET price=?,ends=? WHERE id=?',[amount,ends,listing.id]);db.run('INSERT INTO bids(listing_id,bidder_id,bidder,amount,time) VALUES(?,?,?,?,?)',[listing.id,req.user.id,req.user.name,amount,Date.now()]);save();const result=one('SELECT * FROM listings WHERE id=?',[listing.id]);broadcast('bids');res.json(listingShape(result))})
app.get('/api/events',(req,res)=>{res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write('data: {"type":"connected"}\n\n');const client=res;clients.add(client);req.on('close',()=>clients.delete(client))})
app.get('/api/notifications',auth,(req,res)=>res.json(all('SELECT * FROM notifications WHERE user_id=? ORDER BY time DESC',[req.user.id])))

if(fs.existsSync(path.join(__dirname,'dist'))){app.use(express.static(path.join(__dirname,'dist')));app.use((req,res)=>{if(!req.path.startsWith('/api'))return res.sendFile(path.join(__dirname,'dist','index.html'));res.status(404).json({error:'API route not found'})})}
const port=process.env.PORT||3001;app.listen(port,()=>console.log(`CampusBid API + SQLite database running at http://localhost:${port}`))
