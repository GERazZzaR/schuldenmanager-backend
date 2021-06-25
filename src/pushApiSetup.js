const vapidKeys = {
  publicKey: process.env.publicKey,
  privateKey: process.env.privateKey
}

const sub = {
    "endpoint":"https://fcm.googleapis.com/fcm/send/fX0kQepKIK0:APA91bFu7C6GMTEmA2b4Lh0ksYWNS9u-YDwEKweHo2sXVEepTulghKSp9om2GTOjoAUEqneITZ9HLMpLTLJhmvoDObV39pRa1qVdjPS9qaSNGuVawOi2eZh_BcH7hHE_19R1snEE60ii",
    "expirationTime":null,
    "keys": {
        "p256dh": process.env.p256dh,
        "auth": process.env.auth
    }
}

module.exports = {
    vapidKeys: vapidKeys,
    sub: sub
}