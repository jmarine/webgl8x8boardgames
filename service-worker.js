
console.log("Service worker running");

self.addEventListener('push', function(event) {  
  console.log('Received a push message', event);

  var title = 'WebGL 8x8 board games';  
  var body = 'Your game matches have been updated.';  
  var icon = 'resources/images/logo.png';  
  var tag = 'webgl8x8boardgames-updated';
 
 try {
  event.waitUntil(  
    self.registration.showNotification(title, {  
      body: body,  
      icon: icon,  
      tag: tag  
    })  
  );  
  console.log("push done");
 } catch(e) {
  console.log('Error: ' + e);
 }

});

self.addEventListener('notificationclick', function(event) {  
  console.log('On notification click: ', event.notification.tag);  
  // Android doesn't close the notification when you click on it  
  // See: http://crbug.com/463146  
  event.notification.close();

  // This looks to see if the current is already open and  
  // focuses if it is  
  event.waitUntil(
    clients.matchAll({  
      type: "window"  
    })
    .then(function(clientList) {  
      for (var i = 0; i < clientList.length; i++) {  
        var client = clientList[i];  
        if (client.url.indexOf("/webgl8x8boardgames/") != -1 && 'focus' in client)  
          return client.focus();  
      }  
      if (clients.openWindow) {
        return clients.openWindow('/webgl8x8boardgames/app.html');  
      }
    })
  );
});

