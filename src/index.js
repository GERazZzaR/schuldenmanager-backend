// Import Express & Middlewares
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs')
const dotenv = require('dotenv').config();
const port = process.env.PORT || 8000;

// Import Models
const Debt = require("../models/debt");
const Setting = require("../models/setting");

// Setup Mongoose Connection
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://' + process.env.usernameMongo + ':' + process.env.password + process.env.cluster,  {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
  console.log("Connection to Mongoose Succeeded");
});

// Setup Web-Push Api
const push = require('web-push');
const schedule = require('node-schedule');
let subscriptions = [];
push.setGCMAPIKey(process.env.gcmKey);
push.setVapidDetails(process.env.pushUsername, process.env.publicVapidKey, process.env.privateVapidKey);

// Setup Multer
const storage = multer.diskStorage({
  // destination for files
  destination: function(request, file, callback) {
   callback(null, './src/uploads/images');
  },
  // add back the extension
  filename: function(request, file, callback) {
    callback(null, file.originalname)
  }
})

// parameters for multer
const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 1024*1024*3
  }
});

/*
 APIs 
*/

//Express + settings
const app = express();
app.use(morgan('combined'))
app.use(cors());
app.use(express.json({limit: '1mb'}));

//parsing multipart/form-data
app.use(express.static('public'));

// Post Images
app.post('/image', upload.single('image'), (req, res) => {
  res.send({
    success: true,
    message: 'Picture saved successfully!',
  })
})

// Get Image
app.get('/image/:name', (req, res) => {
  res.sendFile(__dirname + '/uploads/images/' + req.params.name)
})

// Fetch all Debts
app.get('/debts', (req, res) => {
  Debt.find({}, 'person amount description date archived isPositive position picture reminder', (error, debts) => {
    if (error) { console.error(error); }
    res.send({
      debts: debts
    })
  })
  .sort({person:1})
})

// Add new Debt
app.post('/debt', (req, res) => {
    let reqBody = req.body;
    let newDebt = new Debt({
      _id: reqBody._id,
      person: reqBody.person,
      amount: reqBody.amount,
      description: reqBody.description,
      date: reqBody.date,
      archived: reqBody.archived,
      isPositive: reqBody.isPositive,
      position: reqBody.position,
      picture: reqBody.picture
    }) 
  
    newDebt.save(error => {
      if (error) {
        console.log(error)
      }
      res.send({
        success: true,
        message: 'Debt saved successfully!'
      })
    })
})

// Archive a debt
app.put('/toggle-archive-debt/:id', (req, res) => {
  Debt.findById(req.params.id, 'person amount description date archived isPositive position picture reminder', (error, debt) => {
    if (error) { console.error(error); }
    debt.archived = !debt.archived;
    
    debt.save(function (err) {
      if (err) {
        res.send(err)
      }
      res.send({
        success: true
      })
    })
  })
})

// Update debt
app.put('/debt/:id', (req, res) => {
  Debt.findById(req.params.id, 'person amount description date archived isPositive position picture reminder', (error, debt) => {
    if (error) { console.error(error); }
    let reqBody = req.body;

    if(debt.picture !== reqBody.picture){
      deleteImage(debt.picture);
    }

    debt.amount = reqBody.amount;
    debt.person = reqBody.person;
    debt.description = reqBody.description;
    debt.date = reqBody.date;
    debt.isPositive = reqBody.isPositive;
    debt.position = reqBody.position;
    debt.picture = reqBody.picture;

    debt.save(function (err) {
      if (err) {
        res.send(err)
      }
      res.send({
        success: true
      })
    })
  })
})

// Delete debt
app.delete('/debt/:id', (req, res) => {
  Debt.findById(req.params.id, 'person amount description date archived isPositive position picture reminder', (error, debt) => {
    if (error) { console.error(error); }
    // if(debt.picture !== req.body.picture){
    //   deleteImage(debt.picture);
    // }
  })
  Debt.deleteOne({
    _id: req.params.id
  }, function(err){
    if (err) res.send(err);
    res.send({
      success: true
    })
  })
})

//Delete Image
const deleteImage = (name) => {
  fs.unlink('./src/uploads/images/' + name, (err) => {
    if(err) {
      return
    }
  })
}

// Add reminder to Debt
app.put('/reminder/:id', (req, res) => {
  Debt.findById(req.params.id, 'person amount isPositive reminder', (error, debt) => {
    if (error) { console.error(error); }
    debt.reminder = req.body.reminder;
    // If reminder is in request -> add to queue
    if(req.body.reminder) {
      startJob(debt.id, debt.person, debt.amount, debt.isPositive, debt.reminder);
      delteFromQueue(debt.id)
      jobsInQueue.push(debt.id);
    // If reminder is NOT in request -> delete from queue
    } else {
      if(jobsInQueue.includes(debt.id)) delteFromQueue(debt.id);
    }
    
    debt.save(function (err) {
      if (err) {
        res.send(err)
      }
      res.send({
        success: true
      })
    })
  })
})

// Subscribe Notifications
app.post('/subscribe', (req, res) => {
  let addSubscription = true;
  subscriptions.forEach(sub => {
    if (sub.endpoint == req.body.endpoint) addSubscription = false;
  })
  if (addSubscription === true) subscriptions.push(req.body)
  res.send({
    success: true
  })
})

// Fetch all Settings
app.get('/settings', (req, res) => {
  Setting.find({}, 'name checked prompt', (error, settings) => {
    if (error) { console.error(error); }
    res.send({
      settings: settings
    })
  })
})

// Set Settings
app.put('/setting/:id', (req, res) => {
  Setting.findById(req.params.id, 'name checked prompt', (error, setting) => {
    if (error) { console.error(error); }
    setting.checked = !setting.checked;
    setting.save(function (err) {
      if (err) {
        res.send(err)
      }
      res.send({
        success: true
      })
    })
  })
})

//Push Jobs-Queue Array
let jobsInQueue = new Array();

//start push notification job
let startJob = (id, person, amount, isPositive, reminder) => {
  //when reminder is in time -> start push notification
  schedule.scheduleJob(reminder, function(){
    if(jobsInQueue.includes(id)) {
      delteFromQueue(id)
      //Delete reminder date from database
      Debt.findById(id, 'reminder', (error, debt) => {
        debt.reminder = "",
        debt.save()
      })
      let text = isPositive ? person + " schuldet mir " + amount + " €" : person + " hat mir " + amount + " € geliehen";
      // Send to all subscribed devices
      subscriptions.forEach(sub => {
        push.sendNotification(sub, text).catch(error => console.log(error));
      })
    }
  });
}

// Delete Notification from queue
let delteFromQueue = (id) => {
  let indexToDelete = jobsInQueue.indexOf(id);
  jobsInQueue.splice(indexToDelete, 1);
}



app.listen(port, () => {
  console.log("App listening on port " + port)
});
